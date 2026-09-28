import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNING_MEMORY_TRIGGER, SIGNING_MEMORY_CUES,
  createSigningMemoryState, restoreSigningMemoryState,
  signingMemoryMilestones, getSigningMemoryPanel, applySigningMemoryAction,
} from '../src/signingMemory.js';
import { CLUES, CHAPTERS } from '../src/story.js';

const evidence = new Set([SIGNING_MEMORY_TRIGGER]);
const act = (state, action, found = evidence) => applySigningMemoryAction(state, action, found);
const inspect = (state, cueId, found = evidence) => act(state, { type: 'memory.inspect', cueId }, found);

function inspectAll(initial = createSigningMemoryState()) {
  let state = initial;
  for (const cueId of ['sleeve', 'carbon', 'closure']) state = inspect(state, cueId).state;
  return state;
}

test('the recollection starts from an existing Chapter 1 lodge record', () => {
  const trigger = CLUES.find((clue) => clue.id === SIGNING_MEMORY_TRIGGER);
  assert.equal(trigger?.minChapter, 0);
  assert.equal(trigger?.room, 'lodge');
  assert.ok(CHAPTERS[0].required.includes(trigger.id));
  assert.deepEqual(SIGNING_MEMORY_CUES.map((cue) => cue.id), ['carbon', 'closure', 'sleeve']);
  assert.match(SIGNING_MEMORY_CUES.find((cue) => cue.id === 'carbon').text, /lamp status unresolved/);
  assert.match(SIGNING_MEMORY_CUES.find((cue) => cue.id === 'closure').text, /ferry cutoff/);
  assert.match(SIGNING_MEMORY_CUES.find((cue) => cue.id === 'sleeve').text, /empty/);
});

test('three concrete cues can be inspected in any order before acknowledging a fixed past', () => {
  const initial = createSigningMemoryState();
  assert.equal(getSigningMemoryPanel(initial, evidence).stage, 'cues');
  assert.equal(getSigningMemoryPanel(initial, evidence).actions.length, 3);
  assert.equal(act(initial, { type: 'memory.decision', answer: 'removed_warning_and_signed' }).status, 'blocked');
  let state = initial;
  for (const cueId of ['sleeve', 'carbon', 'closure']) {
    const result = inspect(state, cueId);
    assert.equal(result.status, 'changed');
    assert.equal(result.event, 'signing_memory_cue');
    assert.ok(result.message.length > 70, cueId);
    state = result.state;
  }
  assert.equal(signingMemoryMilestones(state, evidence).inspectedCount, 3);
  assert.equal(getSigningMemoryPanel(state, evidence).stage, 'decision');
  assert.equal(inspect(state, 'carbon').status, 'unchanged');

  for (const answer of ['kept_warning', 'supervisor_erased', 'verified_original']) {
    const result = act(state, { type: 'memory.decision', answer });
    assert.equal(result.status, 'mistake');
    assert.equal(result.event, null);
    assert.deepEqual(result.state, state, 'a different past cannot be chosen');
  }
  const decision = act(state, { type: 'memory.decision', answer: 'removed_warning_and_signed' });
  assert.equal(decision.status, 'changed');
  assert.equal(decision.event, 'signing_memory_decision');
  assert.match(decision.message, /pen and the edit were yours/);
  assert.equal(getSigningMemoryPanel(decision.state, evidence).stage, 'limit');
  assert.deepEqual(initial, createSigningMemoryState(), 'transition must not mutate the input');
});

test('the final inference accepts personal responsibility but leaves lamp operation unresolved', () => {
  let state = inspectAll();
  state = act(state, { type: 'memory.decision', answer: 'removed_warning_and_signed' }).state;
  for (const answer of ['standby_disabled', 'standby_lit']) {
    const wrong = act(state, { type: 'memory.limit', answer });
    assert.equal(wrong.status, 'mistake');
    assert.deepEqual(wrong.state, state);
    assert.match(wrong.message, /not whether the standby lamp operated/);
  }
  const completed = act(state, { type: 'memory.limit', answer: 'circuit_unproved' });
  assert.equal(completed.status, 'complete');
  assert.equal(completed.event, 'signing_memory_complete');
  assert.equal(signingMemoryMilestones(completed.state, evidence).complete, true);
  const panel = getSigningMemoryPanel(completed.state, evidence);
  assert.equal(panel.stage, 'complete');
  assert.equal(panel.actions.length, 0);
  assert.match(panel.text, /independent evidence/);
  assert.equal(act(completed.state, { type: 'memory.limit', answer: 'circuit_unproved' }).event, null,
    'completion event fires only once');
});

test('missing carbon, skipped cues, malformed values, and invalid actions cannot forge progress', () => {
  const initial = createSigningMemoryState();
  assert.equal(getSigningMemoryPanel(initial).stage, 'locked');
  assert.equal(act(initial, { type: 'memory.inspect', cueId: 'carbon' }, []).status, 'blocked');
  assert.equal(act(initial, { type: 'memory.inspect', cueId: 'other' }).status, 'blocked');
  assert.equal(act(initial, { type: 'memory.unlisted' }).status, 'blocked');
  assert.equal(act(initial, { type: 'memory.limit', answer: 'circuit_unproved' }).status, 'blocked');

  const partial = inspect(initial, 'carbon').state;
  assert.deepEqual(restoreSigningMemoryState(JSON.parse(JSON.stringify(partial)), evidence), partial);
  const forged = { version: 1, inspectedIds: ['carbon', 'unknown', 'carbon'],
    decisionAcknowledged: true, limitAcknowledged: true };
  assert.deepEqual(restoreSigningMemoryState(forged, evidence),
    { version: 1, inspectedIds: ['carbon'], decisionAcknowledged: false, limitAcknowledged: false });
  assert.deepEqual(restoreSigningMemoryState({ ...forged, version: 99 }, evidence), initial);
  assert.deepEqual(restoreSigningMemoryState({ ...forged, inspectedIds: ['carbon', 'closure', 'sleeve'] }, []), initial,
    'a copied completion without the working carbon is not a playable recollection');
  assert.equal(restoreSigningMemoryState({ ...forged, inspectedIds: ['carbon', 'closure', 'sleeve'],
    decisionAcknowledged: 'true' }, evidence).limitAcknowledged, false);
});
