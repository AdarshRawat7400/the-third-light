import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES } from '../src/story.js';
import { createChoiceRouteState } from '../src/choiceRoutes.js';
import {
  INQUIRY_STEPS, applyInquiryAction, createInquiryState, getInquiryPanel,
  getInquirySummaryText, inquiryMilestones, restoreInquiryState,
  serializeInquiryState,
} from '../src/inquirySequence.js';

const allFound = new Set(CLUES.map((clue) => clue.id));
const baseRoutes = {
  ...createChoiceRouteState(), initialPacket: 'complete',
  eliasRoute: 'show_records', eliasRecordsShown: true,
  oralDisclosure: 'volunteer', irisAsked: true,
  irisCustody: 'inquiry_originals_family_copies',
};
const context = {
  foundIds: allFound, reportSubmitted: true, irisRescued: true,
  choiceRoutes: baseRoutes,
};

function answerAll(ctx = context, ending = 'family_copy_first') {
  let state = createInquiryState();
  for (const step of INQUIRY_STEPS) {
    const answer = step.id === 'closing' ? ending : step.answers[0];
    const result = applyInquiryAction(state, { type: step.actionType, answer }, ctx);
    assert.ok(['changed', 'complete'].includes(result.status), `${step.id}: ${result.message}`);
    state = result.state;
  }
  return state;
}

test('inquiry requires existing discoverable sources and does not reopen before rescue and report', () => {
  const clues = new Map(CLUES.map((clue) => [clue.id, clue]));
  for (const step of INQUIRY_STEPS) {
    for (const id of step.evidenceIds) {
      assert.ok(clues.has(id), `Missing inquiry source ${id}`);
      assert.ok(clues.get(id).minChapter <= 4, `${id} arrives too late for the hearing`);
    }
  }
  const blank = createInquiryState();
  assert.equal(getInquiryPanel(blank, { ...context, reportSubmitted: false }).actions.length, 0);
  assert.equal(applyInquiryAction(blank, { type: 'inquiry.provenance', answer: 'relay_versus_export' },
    { ...context, irisRescued: false }).status, 'blocked');
});

test('player answers six source questions; unsupported statements are recoverable', () => {
  let state = createInquiryState();
  const original = structuredClone(state);
  for (const [index, step] of INQUIRY_STEPS.entries()) {
    const panel = getInquiryPanel(state, context);
    assert.equal(panel.step, index);
    assert.equal(panel.actions.length, step.choices.length);
    const wrong = step.choices.find((choice) => !step.answers.includes(choice.answer));
    const mistake = applyInquiryAction(state, { type: step.actionType, answer: wrong.answer }, context);
    assert.equal(mistake.status, 'mistake');
    assert.equal(mistake.event, null);
    assert.deepEqual(mistake.state, state);
    const right = applyInquiryAction(state, { type: step.actionType, answer: step.answers[0] }, context);
    assert.equal(right.status, index === INQUIRY_STEPS.length - 1 ? 'complete' : 'changed');
    state = right.state;
  }
  assert.deepEqual(original, createInquiryState(), 'prior state must remain immutable');
  assert.equal(inquiryMilestones(state).complete, true);
  assert.equal(getInquiryPanel(state, context).actions.length, 0);
  assert.equal(applyInquiryAction(state, { type: 'inquiry.closing', answer: 'read_into_record' }, context).status,
    'unchanged');
});

test('family and Iris handoffs use the existing route decisions and cannot be silently inferred', () => {
  let state = createInquiryState();
  for (const step of INQUIRY_STEPS.slice(0, 2)) {
    state = applyInquiryAction(state, { type: step.actionType, answer: step.answers[0] }, context).state;
  }
  const noOral = { ...context, choiceRoutes: { ...baseRoutes, oralDisclosure: null } };
  assert.deepEqual(getInquiryPanel(state, noOral).actions.map(({ action }) => action.type),
    ['inquiry.request_disclosure']);
  const disclosure = applyInquiryAction(state, { type: 'inquiry.request_disclosure' }, noOral);
  assert.equal(disclosure.event, 'inquiry_disclosure_requested');
  assert.deepEqual(disclosure.state, state);
  assert.equal(applyInquiryAction(state, { type: 'inquiry.family', answer: 'removed_qualification' }, noOral).status,
    'blocked');
  state = applyInquiryAction(state, { type: 'inquiry.family', answer: 'removed_qualification' }, context).state;
  state = applyInquiryAction(state, { type: 'inquiry.elias', answer: 'actions_not_intent' }, context).state;
  const noIris = { ...context, choiceRoutes: { ...baseRoutes, irisAsked: false, irisCustody: null } };
  assert.deepEqual(getInquiryPanel(state, noIris).actions.map(({ action }) => action.type),
    ['inquiry.ask_iris']);
  const ask = applyInquiryAction(state, { type: 'inquiry.ask_iris' }, noIris);
  assert.equal(ask.event, 'inquiry_iris_handoff_requested');
  assert.equal(applyInquiryAction(state, { type: 'inquiry.iris', answer: 'iris_directs_custody' }, noIris).status,
    'blocked');
  assert.equal(applyInquiryAction(state, { type: 'inquiry.iris', answer: 'iris_directs_custody' }, context).status,
    'changed');
});

test('route and final-page choices alter tone, not source findings or Iris agency', () => {
  const direct = answerAll(context, 'family_copy_first');
  const publicRoutes = {
    ...baseRoutes, initialPacket: 'early', supplementSent: true,
    eliasRoute: 'public_radio', eliasRecordsShown: true,
    oralDisclosure: 'answer_when_asked',
    irisCustody: 'independent_hold_shared_copies',
  };
  const publicContext = { ...context, choiceRoutes: publicRoutes };
  const publicState = answerAll(publicContext, 'read_into_record');
  const directText = getInquirySummaryText(direct, context);
  const publicText = getInquirySummaryText(publicState, publicContext);
  assert.match(directText, /original relay strip recorded both rear-lamp circuits active/);
  assert.match(publicText, /original relay strip recorded both rear-lamp circuits active/);
  assert.match(directText, /Mara named her removed qualification before the family asked/);
  assert.match(publicText, /They noticed that delay/);
  assert.match(directText, /Elias signed a limited account/);
  assert.match(publicText, /refused a signed account/);
  assert.match(directText, /Iris released sealed originals/);
  assert.match(publicText, /Iris kept the sealed originals/);
  assert.match(directText, /entered the family’s jetty receipt before reading the amended finding/);
  assert.match(publicText, /chair read the correction into the public record, then attached the earlier jetty delivery receipt/);
  assert.match(directText, /given authenticated copies directly to the family at the jetty/);
  assert.match(publicText, /given the family its own packet at the jetty/);
  for (const text of [directText, publicText]) {
    assert.match(text, /do not prove exactly what the captain perceived/);
    assert.match(text, /Neither his explanation nor those records establish an intent/);
    assert.doesNotMatch(text, /forgave|was absolved|supernatural|hallucinat/i);
  }
});

test('restoration rejects forged skips, missing sources, missing handoffs, and unknown versions', () => {
  const full = answerAll();
  const saved = JSON.parse(JSON.stringify(serializeInquiryState(full)));
  assert.deepEqual(restoreInquiryState(saved, context), full);
  assert.equal(inquiryMilestones(restoreInquiryState(saved, context)).complete, true);
  assert.deepEqual(restoreInquiryState({ ...saved, version: 10 }, context), createInquiryState());
  assert.deepEqual(restoreInquiryState(saved, { ...context, reportSubmitted: false }), createInquiryState());
  const missingStrip = { ...context, foundIds: new Set([...allFound].filter((id) => id !== 'lamp_strip')) };
  assert.deepEqual(restoreInquiryState(saved, missingStrip), createInquiryState());
  const skipped = { ...saved, bearings: null };
  assert.deepEqual(restoreInquiryState(skipped, context),
    { ...createInquiryState(), provenance: 'relay_versus_export' });
  const noIris = { ...context, choiceRoutes: { ...baseRoutes, irisAsked: false, irisCustody: null } };
  assert.equal(inquiryMilestones(restoreInquiryState(saved, noIris)).completedQuestions, 4);
  assert.equal(serializeInquiryState({ ...saved, closing: 'forgive_and_close' }).closing, null);
  assert.equal(applyInquiryAction(createInquiryState(), { type: 'inquiry.closing', answer: 'family_copy_first' }, context).status,
    'blocked');
});
