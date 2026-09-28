import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMechanismState,
  restoreMechanismState,
  applyMechanismAction,
  tickMechanisms,
  mechanismMilestones,
  getMechanismPanel,
  TUNNEL_DRAIN_SECONDS,
} from '../src/mechanisms.js';

const evidence = new Set([
  'headland_view', 'east_ridge_view', 'tower_panel',
  'lamp_strip', 'tunnel_signal',
]);

function step(state, type, extra = {}, found = evidence) {
  return applyMechanismAction(state, { type, ...extra }, found);
}

function solveAlignment(initial = createMechanismState()) {
  let state = initial;
  state = step(state, 'alignment.trace', { stake: 'west', rear: 'main' }).state;
  state = step(state, 'alignment.trace', { stake: 'east', rear: 'standby' }).state;
  return step(state, 'alignment.confirm', { rear: 'main' }).state;
}

function startPump(initial = solveAlignment()) {
  let state = initial;
  for (const type of [
    'power.inspect', 'power.isolateMains', 'power.warnLaunch',
    'power.openDischarge', 'power.startBackup', 'power.startPump',
  ]) state = step(state, type).state;
  return state;
}

test('state is JSON serializable, restored defensively, and old completed saves migrate', () => {
  const fresh = createMechanismState();
  assert.deepEqual(restoreMechanismState(JSON.parse(JSON.stringify(fresh))), fresh);
  assert.deepEqual(restoreMechanismState(), fresh);
  const malformed = restoreMechanismState({
    alignment: { westRear: 'standby', eastRear: 'main', safeRear: 'main' },
    power: { diagramRead: false, mainsIsolated: true, backupOn: true, pumpOn: true, drainSeconds: 100000 },
    radio: { routeRear: 'main', confirmed: true },
  });
  assert.deepEqual(mechanismMilestones(malformed), {
    alignmentSolved: false, powerRestored: false, standbyEnergized: false,
    launchGuided: false, tunnelDrained: false,
  });
  const oldSave = restoreMechanismState(null, ['alignment_solution', 'pump_power', 'launch_guided', 'iris_rescued']);
  assert.deepEqual(mechanismMilestones(oldSave), {
    alignmentSolved: true, powerRestored: true, standbyEnergized: true,
    launchGuided: true, tunnelDrained: true,
  });
});

test('tower puzzle requires the actual survey observations and permits recovery from wrong traces', () => {
  const initial = createMechanismState();
  const noPhoto = step(initial, 'alignment.trace', { stake: 'west', rear: 'main' }, []);
  assert.equal(noPhoto.status, 'blocked');
  assert.deepEqual(initial, createMechanismState(), 'input must not mutate');

  const wrongWest = step(initial, 'alignment.trace', { stake: 'west', rear: 'standby' }, ['headland_view']);
  assert.equal(wrongWest.status, 'mistake');
  assert.equal(wrongWest.state.alignment.westRear, null);

  const west = step(initial, 'alignment.trace', { stake: 'west', rear: 'main' }, ['headland_view']);
  assert.equal(west.event, 'sightline_traced');
  assert.equal(step(west.state, 'alignment.confirm', { rear: 'main' }, ['tower_panel']).status, 'blocked');

  const east = step(west.state, 'alignment.trace', { stake: 'east', rear: 'standby' }, ['east_ridge_view']);
  const noPanel = step(east.state, 'alignment.confirm', { rear: 'main' }, ['headland_view', 'east_ridge_view']);
  assert.equal(noPanel.status, 'blocked');
  const reef = step(east.state, 'alignment.confirm', { rear: 'standby' }, ['tower_panel']);
  assert.equal(reef.status, 'mistake');
  assert.equal(reef.state.alignment.safeRear, null);
  const solved = step(reef.state, 'alignment.confirm', { rear: 'main' }, ['tower_panel']);
  assert.equal(solved.status, 'complete');
  assert.equal(solved.event, 'alignment_solved');
  assert.equal(solved.state.alignment.safeRear, 'main');
});

test('backup setup cannot skip isolation, warning or outfall; standby relights on old bus', () => {
  let state = solveAlignment();
  assert.equal(step(state, 'power.startBackup').status, 'blocked');
  assert.equal(step(state, 'power.inspect', {}, ['lamp_strip']).status, 'blocked');
  state = step(state, 'power.inspect').state;
  state = step(state, 'power.isolateMains').state;
  assert.equal(step(state, 'power.startBackup').status, 'blocked');
  state = step(state, 'power.openDischarge').state;
  assert.equal(step(state, 'power.startBackup').status, 'blocked');
  const warned = step(state, 'power.warnLaunch');
  assert.equal(warned.event, 'launch_warned');
  const backup = step(warned.state, 'power.startBackup');
  assert.equal(backup.event, 'backup_online');
  assert.equal(mechanismMilestones(backup.state).standbyEnergized, true);
  assert.equal(mechanismMilestones(backup.state).powerRestored, false);
  const pump = step(backup.state, 'power.startPump');
  assert.equal(pump.event, 'power_restored');
  assert.equal(pump.status, 'complete');
  assert.equal(mechanismMilestones(pump.state).powerRestored, true);
  assert.equal(mechanismMilestones(pump.state).standbyEnergized, true);
});

test('running pump drains the tunnel over time exactly once without an irreversible failure timer', () => {
  const running = startPump();
  const before = tickMechanisms(running, -1);
  assert.equal(before.status, 'unchanged');
  assert.equal(before.state.power.drainSeconds, 0);
  const halfway = tickMechanisms(running, TUNNEL_DRAIN_SECONDS / 2);
  assert.equal(halfway.state.power.drainSeconds, TUNNEL_DRAIN_SECONDS / 2);
  assert.equal(mechanismMilestones(halfway.state).tunnelDrained, false);
  const drained = tickMechanisms(halfway.state, TUNNEL_DRAIN_SECONDS);
  assert.equal(drained.event, 'tunnel_drained');
  assert.equal(drained.state.power.drainSeconds, TUNNEL_DRAIN_SECONDS);
  assert.equal(mechanismMilestones(drained.state).tunnelDrained, true);
  assert.equal(tickMechanisms(drained.state, 1).event, null);
  assert.equal(running.power.drainSeconds, 0, 'earlier states remain unchanged');
});

test('harbor transmission needs chart, offshore hold and the true pair; bad route cannot send launch onto reef', () => {
  let state = startPump();
  assert.equal(step(state, 'radio.transmit').status, 'blocked');
  assert.equal(step(state, 'radio.select', { rear: 'main' }).status, 'blocked');
  state = step(state, 'radio.inspectChart').state;
  state = step(state, 'radio.hold').state;
  const badDraft = step(state, 'radio.select', { rear: 'standby' });
  assert.equal(badDraft.status, 'mistake');
  const refused = step(badDraft.state, 'radio.transmit');
  assert.equal(refused.status, 'mistake');
  assert.equal(refused.event, 'reef_warning');
  assert.equal(refused.state.radio.confirmed, false);
  const safeDraft = step(refused.state, 'radio.select', { rear: 'main' });
  const guided = step(safeDraft.state, 'radio.transmit');
  assert.equal(guided.status, 'complete');
  assert.equal(guided.event, 'launch_guided');
  assert.equal(mechanismMilestones(guided.state).launchGuided, true);
});

test('panel view offers concrete actions in sequence and is itself serializable', () => {
  const initial = createMechanismState();
  assert.equal(getMechanismPanel(initial, 'alignment').actions[0].action.type, 'alignment.trace');
  assert.equal(getMechanismPanel(initial, 'power').actions[0].action.type, 'power.inspect');
  assert.equal(getMechanismPanel(startPump(), 'radio').actions[0].action.type, 'radio.inspectChart');
  assert.doesNotThrow(() => JSON.stringify(getMechanismPanel(initial, 'alignment')));
});
