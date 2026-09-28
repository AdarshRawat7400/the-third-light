import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRescueAftermathState, restoreRescueAftermathState,
  rescueAftermathMilestones, getRescueAftermathPanel,
  applyRescueAftermathAction,
} from '../src/rescueAftermath.js';

const ids = ['pump_power', 'launch_guided', 'iris_rescued'];
const context = (foundIds = new Set(ids)) => ({ foundIds });
const apply = (state, type, answer, ctx = context()) =>
  applyRescueAftermathAction(state, { type, answer }, ctx);

const ROUTE = [
  ['aftercare.medical', 'medical_first', 'medical'],
  ['aftercare.case', 'keep_with_iris', 'case'],
  ['aftercare.account', 'firsthand_only', 'account'],
  ['aftercare.rest', 'defer_statement', 'rest'],
];

test('aftercare is unavailable until pump, safe launch, and Iris’s rescue are recorded', () => {
  const fresh = createRescueAftermathState();
  for (const absent of ids) {
    const ctx = context(ids.filter((id) => id !== absent));
    const panel = getRescueAftermathPanel(fresh, ctx);
    assert.equal(panel.complete, false);
    assert.deepEqual(panel.actions, []);
    assert.equal(apply(fresh, 'aftercare.medical', 'medical_first', ctx).status, 'blocked');
  }
  assert.equal(getRescueAftermathPanel(fresh, context(ids)).actions.length, 2,
    'array foundIds are accepted as well as a Set');
});

test('four ordered choices complete and preserve a plain serializable save', () => {
  const ctx = context();
  let state = createRescueAftermathState();
  for (let index = 0; index < ROUTE.length; index += 1) {
    const [type, answer, field] = ROUTE[index];
    const panel = getRescueAftermathPanel(state, ctx);
    assert.equal(panel.complete, false);
    assert.ok(panel.actions.some((entry) => entry.action.type === type && entry.action.answer === answer));
    const result = apply(state, type, answer, ctx);
    assert.equal(result.status, index === ROUTE.length - 1 ? 'complete' : 'changed');
    assert.equal(result.state[field], answer);
    assert.equal(rescueAftermathMilestones(result.state, ctx).completedBeats, index + 1);
    state = restoreRescueAftermathState(JSON.parse(JSON.stringify(result.state)), ctx);
    assert.equal(state[field], answer);
  }
  assert.equal(rescueAftermathMilestones(state, ctx).complete, true);
  assert.equal(getRescueAftermathPanel(state, ctx).complete, true);
  assert.equal(getRescueAftermathPanel(state, ctx).actions.length, 0);
  assert.equal(apply(state, 'aftercare.rest', 'defer_statement', ctx).status, 'unchanged');
});

test('wrong responses are specific and recoverable, including pressure for a statement', () => {
  const ctx = context();
  let state = createRescueAftermathState();
  const mistakes = [
    ['aftercare.medical', 'interview_now', /doctor first/i],
    ['aftercare.case', 'take_originals', /protected them/i],
    ['aftercare.account', 'invent_intent', /did not see him/i],
    ['aftercare.rest', 'demand_statement', /after the examination/i],
  ];
  for (let index = 0; index < ROUTE.length; index += 1) {
    const [type, bad, feedback] = mistakes[index];
    const rejected = apply(state, type, bad, ctx);
    assert.equal(rejected.status, 'mistake');
    assert.deepEqual(rejected.state, state);
    assert.match(rejected.message, feedback);
    const [correctType, answer] = ROUTE[index];
    state = apply(state, correctType, answer, ctx).state;
  }
  assert.equal(rescueAftermathMilestones(state, ctx).complete, true);
});

test('out-of-order, forged, and unsupported progress cannot survive restoration', () => {
  const ctx = context();
  const fresh = createRescueAftermathState();
  assert.equal(apply(fresh, 'aftercare.account', 'firsthand_only', ctx).status, 'blocked');
  assert.deepEqual(restoreRescueAftermathState({ version: 1, rest: 'defer_statement' }, ctx), fresh);
  assert.deepEqual(restoreRescueAftermathState({ ...fresh, version: 9 }, ctx), fresh);
  const one = apply(fresh, 'aftercare.medical', 'medical_first', ctx).state;
  const forged = { ...one, case: 'take_originals', account: 'firsthand_only', rest: 'defer_statement' };
  assert.deepEqual(restoreRescueAftermathState(forged, ctx), one);
  const lostRescue = context(['pump_power', 'launch_guided']);
  assert.deepEqual(restoreRescueAftermathState(one, lostRescue), fresh);
});

test('final action emits exactly the integration completion event', () => {
  let state = createRescueAftermathState();
  for (const [type, answer] of ROUTE.slice(0, -1)) state = apply(state, type, answer).state;
  const final = apply(state, 'aftercare.rest', 'defer_statement');
  assert.equal(final.event, 'rescue_aftercare_completed');
  assert.match(final.message, /right to decide its custody/i);
  assert.equal(final.state.version, 1);
});
