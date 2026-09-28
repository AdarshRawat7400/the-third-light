import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES } from '../src/story.js';
import {
  RADIO_ROUTING_EVIDENCE,
  createRadioRoutingState,
  restoreRadioRoutingState,
  radioRoutingMilestones,
  getRadioRoutingPanel,
  applyRadioRoutingAction,
} from '../src/radioRouting.js';

const radioEvidence = new Set(RADIO_ROUTING_EVIDENCE);

function act(state, type, detail = {}, found = radioEvidence, options = {}) {
  return applyRadioRoutingAction(state, { type, ...detail }, found, options);
}

function traceVoice(found = radioEvidence) {
  let state = createRadioRoutingState();
  state = act(state, 'routing.traceLoop', { feed: 'island_loop' }, found).state;
  state = act(state, 'routing.checkMainland', { continuity: 'open' }, found).state;
  return act(state, 'routing.locateVoice', { source: 'local_microphone' }, found).state;
}

function connectMainland() {
  let state = traceVoice();
  state = act(state, 'routing.isolateLoop').state;
  state = act(state, 'routing.patch', { socket: 'mainland_control' }).state;
  return act(state, 'routing.verify', { reply: 'independent_dispatcher' }).state;
}

test('every source record and the routing control is available in Chapter 4', () => {
  const clues = new Map(CLUES.map((clue) => [clue.id, clue]));
  for (const id of RADIO_ROUTING_EVIDENCE) {
    const clue = clues.get(id);
    assert.ok(clue, `${id} must be a discoverable scene clue`);
    assert.equal(clue.room, 'radio');
    assert.ok(clue.minChapter <= 3, `${id} arrives too late for the early call`);
  }
  assert.equal(clues.get('radio_route_verified')?.special, 'routing');
  assert.equal(clues.get('radio_route_verified')?.minChapter, 3);
});

test('route proof needs both ledgers and the physically open shore lead', () => {
  const initial = createRadioRoutingState();
  assert.deepEqual(RADIO_ROUTING_EVIDENCE,
    ['radio_switchboard', 'radio_patch', 'island_loop_ledger']);
  assert.equal(getRadioRoutingPanel(initial, []).stage, 'trace-loop');
  assert.deepEqual(getRadioRoutingPanel(initial, []).missingEvidenceIds,
    ['radio_switchboard', 'island_loop_ledger']);
  assert.deepEqual(getRadioRoutingPanel(initial, []).actions, []);
  assert.equal(act(initial, 'routing.traceLoop', { feed: 'island_loop' }, []).status, 'blocked');
  assert.equal(act(initial, 'routing.locateVoice', { source: 'local_microphone' }).status, 'blocked');

  const noLoopLedger = new Set(['radio_switchboard', 'radio_patch']);
  assert.equal(act(initial, 'routing.traceLoop', { feed: 'island_loop' }, noLoopLedger).status, 'blocked');
  const wrongFeed = act(initial, 'routing.traceLoop', { feed: 'mainland_trunk' });
  assert.equal(wrongFeed.status, 'mistake');
  assert.deepEqual(wrongFeed.state, initial);
  assert.equal(act(initial, 'routing.traceLoop', { feed: 'invented' }).status, 'blocked');

  const first = act(initial, 'routing.traceLoop', { feed: 'island_loop' });
  assert.equal(first.event, 'radio_loop_traced');
  assert.equal(first.state.loopFeed, 'island_loop');
  assert.equal(getRadioRoutingPanel(first.state, new Set(['radio_switchboard', 'island_loop_ledger'])).stage, 'check-patch');
  assert.deepEqual(getRadioRoutingPanel(first.state, new Set(['radio_switchboard', 'island_loop_ledger'])).missingEvidenceIds,
    ['radio_patch']);
  assert.equal(act(first.state, 'routing.checkMainland', { continuity: 'closed' }).status, 'mistake');
  const second = act(first.state, 'routing.checkMainland', { continuity: 'open' });
  assert.equal(second.event, 'mainland_lead_found_open');
  assert.equal(act(second.state, 'routing.locateVoice', { source: 'mainland_microphone' }).status, 'mistake');
  const verified = act(second.state, 'routing.locateVoice', { source: 'local_microphone' });
  assert.equal(verified.event, 'route_verified');
  assert.equal(radioRoutingMilestones(verified.state).voiceTraced, true);
  assert.equal(radioRoutingMilestones(verified.state).mainlandConnected, false);
  assert.match(verified.message, /route proves its location/);
  assert.match(verified.message, /needed to judge what the speaker concealed/);
  assert.deepEqual(initial, createRadioRoutingState(), 'actions must not mutate prior state');
});

test('reconnection is possible before rescue and verifies an independent reply', () => {
  let state = traceVoice();
  assert.equal(getRadioRoutingPanel(state, radioEvidence).stage, 'isolate-loop');
  assert.deepEqual(getRadioRoutingPanel(state, radioEvidence).missingEvidenceIds, []);
  assert.equal(act(state, 'routing.patch', { socket: 'mainland_control' }).status, 'blocked');
  const isolated = act(state, 'routing.isolateLoop');
  assert.equal(isolated.event, 'radio_loop_isolated');
  assert.match(isolated.message, /separate pump-house launch set remains available/);
  state = isolated.state;

  const wrongSocket = act(state, 'routing.patch', { socket: 'island_loop' });
  assert.equal(wrongSocket.status, 'mistake');
  assert.deepEqual(wrongSocket.state, state, 'wrong socket must not be connected');
  state = act(state, 'routing.patch', { socket: 'mainland_control' }).state;
  assert.equal(getRadioRoutingPanel(state, radioEvidence).stage, 'verify-return');
  const echo = act(state, 'routing.verify', { reply: 'island_echo' });
  assert.equal(echo.status, 'mistake');
  assert.equal(echo.state.mainlandVerified, false);
  const verified = act(state, 'routing.verify', { reply: 'independent_dispatcher' });
  assert.equal(verified.event, 'mainland_patch_verified');
  assert.equal(verified.status, 'complete');
  assert.equal(radioRoutingMilestones(verified.state).mainlandConnected, true);
  assert.equal(getRadioRoutingPanel(verified.state, radioEvidence).stage, 'complete');
  assert.equal(act(verified.state, 'routing.verify', { reply: 'independent_dispatcher' }).event, null);
});

test('restore rejects disconnected or skipped saved milestones', () => {
  const traced = traceVoice();
  assert.deepEqual(restoreRadioRoutingState(JSON.parse(JSON.stringify(traced)), radioEvidence), traced);
  assert.deepEqual(restoreRadioRoutingState(traced, ['radio_switchboard']), createRadioRoutingState());
  assert.deepEqual(restoreRadioRoutingState({ ...traced, loopFeed: null }, radioEvidence), createRadioRoutingState());
  assert.deepEqual(restoreRadioRoutingState({ ...traced, version: 70 }, radioEvidence), createRadioRoutingState());

  const connected = connectMainland();
  assert.equal(restoreRadioRoutingState(connected, radioEvidence).mainlandVerified, true,
    'a player may connect the shore line before rescue');
  assert.equal(restoreRadioRoutingState(connected, ['radio_switchboard', 'island_loop_ledger']).mainlandVerified, false,
    'a save may not claim reconnection without the unplugged-patch observation');
});

test('old one-click Daybreak connection migrates without demanding new clues', () => {
  const oldEvidence = ['radio_patch', 'iris_rescued'];
  const restored = restoreRadioRoutingState(null, oldEvidence, { legacyDaybreakConnected: true });
  assert.equal(restored.migratedFromLegacy, true);
  assert.equal(radioRoutingMilestones(restored).mainlandConnected, true);
  assert.equal(getRadioRoutingPanel(restored, oldEvidence).stage, 'complete',
    'the migrated state should survive the next save without passing the old flag again');
  assert.equal(restoreRadioRoutingState(null, ['radio_patch'], { legacyDaybreakConnected: true }).mainlandVerified, false);
  assert.equal(restoreRadioRoutingState({ ...restored, version: 99 }, oldEvidence).mainlandVerified, false);
});
