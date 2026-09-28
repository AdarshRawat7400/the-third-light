import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHatchState,
  restoreHatchState,
  applyHatchAction,
  getHatchPanel,
  hatchMilestones,
} from '../src/hatchSequence.js';

const foundIds = new Set(['tunnel_signal', 'pump_iris_route']);
const safe = { powerRestored: true, tunnelDrained: true, launchGuided: true };
const context = (milestones = safe, ids = foundIds) => ({ foundIds: ids, milestones });
const step = (state, type, ctx = context()) => applyHatchAction(state, { type }, ctx);

function stageThroughBolt(ctx = context()) {
  let state = createHatchState();
  for (const type of [
    'hatch.confirmResponse', 'hatch.checkSill', 'hatch.equalize',
    'hatch.clearIris', 'hatch.clearJam', 'hatch.releaseBolt',
  ]) state = step(state, type, ctx).state;
  return state;
}

test('hatch state is serializable, ordered on restore, and migrates a rescued old save', () => {
  const fresh = createHatchState();
  assert.deepEqual(restoreHatchState(JSON.parse(JSON.stringify(fresh))), fresh);
  assert.deepEqual(restoreHatchState({ gateOpened: true, boltReleased: true }), fresh,
    'a malformed save cannot skip the gate sequence');
  assert.deepEqual(restoreHatchState({ ...fresh, responseConfirmed: true, version: 2 }), fresh,
    'a future hatch format cannot assert physical progress');
  assert.deepEqual(restoreHatchState(null, ['iris_rescued']), {
    version: 1,
    responseConfirmed: true,
    waterBelowSill: true,
    pressureEqualized: true,
    irisClear: true,
    jamCleared: true,
    boltReleased: true,
    gateOpened: true,
  });
  assert.equal(hatchMilestones(null, ['iris_rescued']).irisRescued, true);
});

test('Iris signal and drained tunnel are required; forcing never advances the state', () => {
  const initial = createHatchState();
  const noSignal = step(initial, 'hatch.confirmResponse', context(safe, []));
  assert.equal(noSignal.status, 'blocked');
  assert.deepEqual(noSignal.state, initial);
  assert.equal(getHatchPanel(initial, context(safe, [])).actions.length, 0);

  const response = step(initial, 'hatch.confirmResponse');
  assert.equal(response.event, 'iris_response_confirmed');
  const wet = context({ ...safe, tunnelDrained: false });
  assert.equal(step(response.state, 'hatch.checkSill', wet).status, 'blocked');
  const forced = step(response.state, 'hatch.forceGate', wet);
  assert.equal(forced.status, 'mistake');
  assert.deepEqual(forced.state, response.state);
  assert.equal(step(response.state, 'hatch.equalize').status, 'blocked');
  assert.deepEqual(initial, createHatchState(), 'original state remains immutable');
});

test('physical steps must be ordered; release completes only with live drain and safe launch', () => {
  let state = createHatchState();
  assert.equal(step(state, 'hatch.openGate').status, 'blocked');
  assert.equal(step(state, 'hatch.clearJam').status, 'blocked');
  state = step(state, 'hatch.confirmResponse').state;
  state = step(state, 'hatch.checkSill').state;
  assert.equal(step(state, 'hatch.clearIris').status, 'blocked');
  state = step(state, 'hatch.equalize').state;
  assert.equal(step(state, 'hatch.releaseBolt').status, 'blocked');
  state = step(state, 'hatch.clearIris').state;
  state = step(state, 'hatch.clearJam').state;
  state = step(state, 'hatch.releaseBolt').state;

  const noBoat = context({ ...safe, launchGuided: false });
  const waiting = step(state, 'hatch.openGate', noBoat);
  assert.equal(waiting.status, 'blocked');
  assert.match(waiting.message, /launch/i);
  assert.equal(waiting.state.gateOpened, false);
  const pumpStopped = context({ ...safe, powerRestored: false });
  assert.equal(step(state, 'hatch.openGate', pumpStopped).status, 'blocked');

  const rescued = step(state, 'hatch.openGate');
  assert.equal(rescued.status, 'complete');
  assert.equal(rescued.event, 'iris_rescued');
  assert.equal(rescued.state.gateOpened, true);
  assert.equal(hatchMilestones(rescued.state).irisRescued, false,
    'the rescue is not committed until the clue is recorded');
  assert.equal(step(rescued.state, 'hatch.openGate').event, 'iris_rescued',
    'a save interrupted before recording the clue may retry the final action');
  assert.equal(hatchMilestones(rescued.state, new Set([...foundIds, 'iris_rescued'])).irisRescued, true);
  assert.equal(step(rescued.state, 'hatch.openGate', context(safe,
    new Set([...foundIds, 'iris_rescued']))).status, 'unchanged');
  assert.equal(getHatchPanel(rescued.state, context(safe,
    new Set([...foundIds, 'iris_rescued']))).actions.length, 0);
});

test('panel leads through meaningful controls and uses optional route evidence as a hint', () => {
  const initial = createHatchState();
  assert.match(getHatchPanel(initial, context()).text, /Iris’s sketch/);
  assert.doesNotMatch(getHatchPanel(initial, context(safe, ['tunnel_signal'])).text, /Iris’s sketch/);
  let state = initial;
  const types = [
    'hatch.confirmResponse', 'hatch.checkSill', 'hatch.equalize',
    'hatch.clearIris', 'hatch.clearJam', 'hatch.releaseBolt', 'hatch.openGate',
  ];
  for (const type of types) {
    const panel = getHatchPanel(state, context());
    assert.ok(panel.actions.some((entry) => entry.action.type === type), `${type} should be offered`);
    assert.doesNotThrow(() => JSON.stringify(panel));
    state = step(state, type).state;
  }
  assert.equal(getHatchPanel(state, context(safe,
    new Set([...foundIds, 'iris_rescued']))).title, 'Service gate open');
});

test('restored midway progress resumes at the next physical control', () => {
  const state = stageThroughBolt();
  const restored = restoreHatchState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.boltReleased, true);
  assert.equal(restored.gateOpened, false);
  assert.equal(getHatchPanel(restored, context()).actions[0].action.type, 'hatch.openGate');
});

test('an interrupted rescue save can replay the gate action without repeating earlier steps', () => {
  const opened = step(stageThroughBolt(), 'hatch.openGate');
  const interruptedSave = JSON.parse(JSON.stringify(opened.state));
  const resumed = restoreHatchState(interruptedSave, foundIds);
  assert.equal(resumed.boltReleased, true);
  assert.equal(resumed.gateOpened, false);
  assert.equal(getHatchPanel(resumed, context()).actions[0].action.type, 'hatch.openGate');
  assert.equal(step(resumed, 'hatch.openGate').event, 'iris_rescued');
  assert.equal(restoreHatchState(interruptedSave,
    [...foundIds, 'iris_rescued']).gateOpened, true,
  'once the clue is committed the same save is treated as a completed rescue');
});
