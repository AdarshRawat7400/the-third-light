import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES } from '../src/story.js';
import { applyChoiceRouteAction, createChoiceRouteState } from '../src/choiceRoutes.js';
import { createRadioRoutingState } from '../src/radioRouting.js';
import {
  WITNESS_CONFRONTATION_EVIDENCE, WITNESS_RADIO_SITE, WITNESS_STATION,
  applyWitnessConfrontationAction, createWitnessConfrontationState,
  getWitnessConfrontationPanel, nearestWitnessConfrontationStation,
  restoreWitnessConfrontationState, serializeWitnessConfrontationState,
  witnessConfrontationMilestones,
} from '../src/witnessConfrontation.js';

const allFound = new Set(CLUES.map((clue) => clue.id));
const routeState = (route = 'ask_account', extras = {}) => ({
  ...createChoiceRouteState(), eliasRoute: route,
  eliasRecordsShown: route === 'show_records', ...extras,
});
const tracedRadio = {
  ...createRadioRoutingState(), loopFeed: 'island_loop',
  mainlandContinuity: 'open', voiceSource: 'local_microphone',
};
const sceneContext = (extras = {}) => ({
  chapter: 3, atRadioHouse: true, foundIds: allFound,
  radioRouting: tracedRadio, choiceRoutes: routeState(), ...extras,
});
const act = (state, type, context = sceneContext(), more = {}) =>
  applyWitnessConfrontationAction(state, { type, ...more }, context);

function playCore(context = sceneContext()) {
  let state = createWitnessConfrontationState();
  for (const type of [
    'witness.compareVoice', 'witness.compareOrder', 'witness.compareRelay',
    'witness.hearAccount', 'witness.testAccount',
  ]) {
    const result = act(state, type, context);
    assert.equal(result.status, 'changed', type);
    state = result.state;
  }
  return state;
}

test('the worktable uses reachable physical sources and a radio-house position', () => {
  const clues = new Map(CLUES.map((clue) => [clue.id, clue]));
  for (const id of WITNESS_CONFRONTATION_EVIDENCE) {
    assert.ok(clues.has(id), `missing physical source ${id}`);
    assert.ok(clues.get(id).minChapter <= 3, `unreachable in Chapter 4: ${id}`);
  }
  assert.equal(WITNESS_RADIO_SITE.id, 'radio');
  const context = sceneContext();
  const station = nearestWitnessConfrontationStation(
    WITNESS_RADIO_SITE.x + WITNESS_STATION.x,
    WITNESS_RADIO_SITE.z + WITNESS_STATION.z, 'radio', null, context);
  assert.equal(station.id, 'witness_table');
  assert.equal(station.complete, false);
  assert.equal(nearestWitnessConfrontationStation(station.x, station.z, 'pump', null, context), null);
  assert.equal(nearestWitnessConfrontationStation(station.x + 2, station.z, 'radio', null, context), null);
});

test('Mara physically compares voice, order, and relay before testing testimony', () => {
  const context = sceneContext();
  const blank = createWitnessConfrontationState();
  assert.equal(act(blank, 'witness.hearAccount', context).status, 'blocked');
  assert.equal(act(blank, 'witness.testAccount', context).status, 'blocked');
  const voice = act(blank, 'witness.compareVoice', context);
  assert.equal(voice.event, 'witness_voice_compared');
  assert.match(voice.message, /local microphone/);
  assert.equal(act(voice.state, 'witness.hearAccount', context).status, 'changed');
  assert.equal(act(voice.state, 'witness.testAccount', context).status, 'blocked');
  const order = act(voice.state, 'witness.compareOrder', context);
  assert.match(order.message, /21:10/);
  assert.match(order.message, /cannot rule out every possible call/);
  const relay = act(order.state, 'witness.compareRelay', context);
  assert.match(relay.message, /21:14/);
  assert.match(relay.message, /not who made/);
  assert.deepEqual(blank, createWitnessConfrontationState(), 'actions must not mutate their input');
});

test('the early packet and every existing Elias route preserve rescue and signature consequences', () => {
  for (const route of ['ask_account', 'show_records', 'public_radio']) {
    const choices = routeState(route, { initialPacket: 'early' });
    const context = sceneContext({ choiceRoutes: choices });
    const first = getWitnessConfrontationPanel(null, context);
    assert.match(first.text, /early mainland alert/);
    const state = playCore(context);
    const account = act(state, 'witness.testAccount', context);
    assert.equal(account.status, 'unchanged');
    const panel = getWitnessConfrontationPanel(state, context);
    assert.ok(panel.actions.some((entry) => entry.action.claim === 'bounded'));
    const finish = act(state, 'witness.recordFinding', context, { claim: 'bounded' });
    assert.equal(finish.event, 'witness_account_compared');
    assert.equal(witnessConfrontationMilestones(finish.state, context).sceneComplete, true);
    assert.match(finish.message, /Iris still needs the pump and a safe launch bearing/);
    assert.equal(context.choiceRoutes.initialPacket, 'early', 'the scene cannot rewrite packet timing');
    assert.equal(context.choiceRoutes.eliasRoute, route, 'the first Elias approach remains history');
    if (route === 'public_radio') assert.match(act(createWitnessConfrontationState(),
      'witness.compareVoice', context).message, /local microphone/);
  }
});

test('the scene asks choiceRoutes to record a follow-up without replacing its route', () => {
  for (const route of ['ask_account', 'public_radio', 'show_records']) {
    const context = sceneContext({ choiceRoutes: routeState(route) });
    let state = createWitnessConfrontationState();
    for (const type of ['witness.compareVoice', 'witness.compareOrder',
      'witness.compareRelay', 'witness.hearAccount']) state = act(state, type, context).state;
    const tested = act(state, 'witness.testAccount', context);
    assert.equal(tested.choiceAction?.type ?? null,
      route === 'show_records' ? null : 'choice.elias.followup_records');
    if (tested.choiceAction) {
      const followup = applyChoiceRouteAction(context.choiceRoutes, tested.choiceAction, {
        foundIds: allFound, mainlandConnected: true,
      });
      assert.equal(followup.status, 'changed');
      assert.equal(followup.state.eliasRoute, route);
      assert.equal(followup.state.eliasRecordsShown, true);
      if (route === 'public_radio') {
        assert.equal(followup.consequences.eliasStatement, 'refuses_to_sign');
        assert.match(tested.message, /refuses a signed statement/);
      } else assert.equal(followup.consequences.eliasStatement, 'willing_to_sign_limited_facts');
    }
  }
});

test('overclaims are recoverable and never create a finding', () => {
  const context = sceneContext();
  const state = playCore(context);
  const intent = act(state, 'witness.recordFinding', context, { claim: 'intent_proven' });
  const blame = act(state, 'witness.recordFinding', context, { claim: 'captain_fault' });
  assert.equal(intent.status, 'mistake');
  assert.equal(blame.status, 'mistake');
  assert.equal(intent.state.findingRecorded, false);
  assert.equal(blame.state.findingRecorded, false);
  assert.match(intent.message, /Neither proves/);
  assert.equal(act(state, 'witness.recordFinding', context, { claim: 'bounded' }).status, 'complete');
});

test('missing evidence pauses this scene, then later discoveries resume it', () => {
  const found = new Set(['radio_switchboard', 'island_loop_ledger', 'radio_patch', 'official_log']);
  const context = sceneContext({ foundIds: found });
  let panel = getWitnessConfrontationPanel(null, context);
  assert.ok(panel.actions.some((entry) => entry.action.type === 'witness.compareVoice'));
  assert.ok(!panel.actions.some((entry) => entry.action.type === 'witness.compareRelay'));
  assert.deepEqual(new Set(panel.missingEvidenceIds), new Set(['pump_service_order', 'lamp_strip']));
  const voice = act(null, 'witness.compareVoice', context);
  assert.equal(voice.status, 'changed');
  assert.equal(act(voice.state, 'witness.compareRelay', context).status, 'blocked');
  found.add('pump_service_order');
  found.add('lamp_strip');
  panel = getWitnessConfrontationPanel(voice.state, context);
  assert.ok(panel.actions.some((entry) => entry.action.type === 'witness.compareRelay'));
  assert.equal(panel.missingEvidenceIds.length, 0);
  const resumed = restoreWitnessConfrontationState(
    JSON.parse(JSON.stringify(serializeWitnessConfrontationState(voice.state))), context);
  assert.equal(resumed.voiceCompared, true);
});

test('save hydration rejects invented or unsupported progress and keeps optional beats separate', () => {
  const context = sceneContext();
  const complete = act(playCore(context), 'witness.recordFinding', context, { claim: 'bounded' }).state;
  assert.deepEqual(restoreWitnessConfrontationState({ version: 99, findingRecorded: true }, context),
    createWitnessConfrontationState());
  assert.deepEqual(restoreWitnessConfrontationState({ ...complete, version: 1 },
    sceneContext({ radioRouting: createRadioRoutingState() })), createWitnessConfrontationState());
  assert.equal(restoreWitnessConfrontationState(complete,
    sceneContext({ foundIds: new Set(WITNESS_CONFRONTATION_EVIDENCE.slice(0, 3)) })).findingRecorded, false);
  const optional = act(complete, 'witness.playIrisChecklist', context);
  assert.equal(optional.status, 'changed');
  assert.equal(act(optional.state, 'witness.reviewUnsentCall', context).status, 'changed');
  assert.equal(restoreWitnessConfrontationState(optional.state,
    sceneContext({ foundIds: new Set(WITNESS_CONFRONTATION_EVIDENCE) })).irisChecklistPlayed, false);
  assert.equal(restoreWitnessConfrontationState(optional.state,
    sceneContext({ foundIds: new Set(WITNESS_CONFRONTATION_EVIDENCE) })).findingRecorded, true);
});

test('the station requires the radio house and an established choice', () => {
  const blank = createWitnessConfrontationState();
  assert.equal(act(blank, 'witness.compareVoice', sceneContext({ atRadioHouse: false })).status, 'blocked');
  assert.equal(act(blank, 'witness.compareVoice', sceneContext({ radioRouting: createRadioRoutingState() })).status, 'blocked');
  assert.equal(act(blank, 'witness.compareVoice', sceneContext({ choiceRoutes: createChoiceRouteState() })).status, 'blocked');
  assert.equal(getWitnessConfrontationPanel(blank, sceneContext({ choiceRoutes: createChoiceRouteState() })).actions.length, 0);
});
