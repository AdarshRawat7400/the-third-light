import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import {
  createJettyReturnState, serializeJettyReturnState, restoreJettyReturnState,
  jettyReturnReady, jettyReturnMilestones, jettyReturnSummary,
  nearestJettyReturnStation, getJettyReturnPanel, applyJettyReturnAction,
  JETTY_RETURN_STATIONS,
} from '../src/jettyReturn.js';
import { createJettyReturnProps } from '../src/jettyReturnProps.js';

const FOUND = [
  'launch_guided', 'iris_rescued', 'iris_handoff', 'daybreak_report',
  'lamp_strip', 'official_log', 'headland_view', 'east_ridge_view',
  'captain_statement', 'archive_draft_memo',
];

function context(overrides = {}) {
  return {
    chapter: 5,
    foundIds: new Set(FOUND),
    reportSubmitted: true,
    choiceRoutes: {
      version: 1, initialPacket: 'complete', supplementSent: false,
      eliasRoute: 'ask_account', eliasRecordsShown: false,
      oralDisclosure: null, irisAsked: true,
      irisCustody: 'independent_hold_shared_copies',
    },
    ...overrides,
  };
}

function act(previous, type, answer, ctx = context()) {
  return applyJettyReturnAction(previous, { type, answer }, ctx);
}

function throughCase(ctx = context()) {
  let state = createJettyReturnState();
  state = act(state, 'jetty.berth', 'safe_berth_documented', ctx).state;
  state = act(state, 'jetty.case', 'family_copy_inventory', ctx).state;
  return state;
}

test('jetty return waits for rescue, signed report, and Iris’s actual custody decision', () => {
  const noRescue = context({ foundIds: new Set(FOUND.filter((id) => id !== 'iris_rescued')) });
  const noReport = context({ reportSubmitted: false });
  const noCustody = context({ choiceRoutes: { version: 1, irisAsked: false, irisCustody: null } });
  for (const ctx of [noRescue, noReport, noCustody, context({ chapter: 4 })]) {
    assert.equal(jettyReturnReady(ctx), false);
    assert.equal(nearestJettyReturnStation(-77, -307, null, null, ctx), null);
    assert.equal(act(null, 'jetty.berth', 'safe_berth_documented', ctx).status, 'blocked');
  }
  assert.equal(jettyReturnReady(context()), true);
});

test('the family receives an authenticated copy only after four separate walkable stations', () => {
  const ctx = context();
  let state = createJettyReturnState();
  const route = [
    ['jetty.berth', 'safe_berth_documented', 'berth'],
    ['jetty.case', 'family_copy_inventory', 'case'],
    ['jetty.opening', 'name_draft_first', 'family'],
    ['jetty.proof', 'mechanism_and_limits', 'family'],
    ['jetty.cost', 'no_closure_owed', 'family'],
    ['jetty.handoff', 'iris_direct_family_copy', 'receipt'],
  ];
  for (const [type, answer, stationId] of route) {
    const before = jettyReturnMilestones(state, ctx).completedBeats;
    const panel = getJettyReturnPanel(state, stationId, ctx);
    assert.ok(panel.actions.some((candidate) => candidate.action.type === type && candidate.action.answer === answer));
    const result = act(state, type, answer, ctx);
    assert.ok(['changed', 'complete'].includes(result.status));
    state = result.state;
    assert.equal(jettyReturnMilestones(state, ctx).completedBeats, before + 1);
  }
  assert.equal(jettyReturnMilestones(state, ctx).complete, true);
  assert.equal(act(state, 'jetty.handoff', 'iris_direct_family_copy', ctx).status, 'unchanged');
  assert.match(jettyReturnSummary(state, ctx), /not agreement, forgiveness, or a final inquiry ruling/);
  assert.equal(serializeJettyReturnState(state).handoff, 'iris_direct_family_copy');
});

test('unsupported inferences and demands for forgiveness do not advance the scene', () => {
  const ctx = context();
  let state = createJettyReturnState();
  assert.equal(act(state, 'jetty.case', 'family_copy_inventory', ctx).status, 'blocked');
  let result = act(state, 'jetty.berth', 'proves_captain_view', ctx);
  assert.equal(result.status, 'mistake');
  assert.equal(result.state.berth, null);
  state = act(state, 'jetty.berth', 'safe_berth_documented', ctx).state;
  for (const answer of ['mara_owns_originals', 'omit_draft']) {
    result = act(state, 'jetty.case', answer, ctx);
    assert.equal(result.status, 'mistake');
    assert.equal(result.state.case, null);
  }
  state = act(state, 'jetty.case', 'family_copy_inventory', ctx).state;
  state = act(state, 'jetty.opening', 'invite_questions', ctx).state;
  for (const answer of ['photos_prove_deck', 'strip_proves_intent']) {
    result = act(state, 'jetty.proof', answer, ctx);
    assert.equal(result.status, 'mistake');
    assert.equal(result.state.proof, null);
  }
  state = act(state, 'jetty.proof', 'mechanism_and_limits', ctx).state;
  result = act(state, 'jetty.cost', 'ask_closure', ctx);
  assert.equal(result.status, 'mistake');
  assert.equal(result.state.cost, null);
  state = act(state, 'jetty.cost', 'public_record_requested', ctx).state;
  for (const answer of ['mara_transfers_originals', 'family_signs_closure']) {
    result = act(state, 'jetty.handoff', answer, ctx);
    assert.equal(result.status, 'mistake');
    assert.equal(result.state.handoff, null);
  }
});

test('custody branch alters only the handoff wording, never who can authorize originals', () => {
  const held = context();
  const released = context({
    choiceRoutes: { ...context().choiceRoutes, irisCustody: 'inquiry_originals_family_copies' },
  });
  const state = throughCase(held);
  assert.match(getJettyReturnPanel(state, 'case', held).text, /keeps the sealed originals independently/);
  assert.match(getJettyReturnPanel(state, 'case', released).text, /released the sealed originals herself/);
  assert.equal(getJettyReturnPanel(state, 'family', released).title, 'The captain’s daughter');
});

test('restore removes forged later beats and invalidates progress when source prerequisites disappear', () => {
  const ctx = context();
  const forged = { version: 1, handoff: 'iris_direct_family_copy', cost: 'no_closure_owed' };
  assert.deepEqual(restoreJettyReturnState(forged, ctx), createJettyReturnState());
  const state = throughCase(ctx);
  const restored = restoreJettyReturnState(JSON.parse(JSON.stringify(state)), ctx);
  assert.equal(restored.case, 'family_copy_inventory');
  const missingStrip = context({ foundIds: new Set(FOUND.filter((id) => id !== 'lamp_strip')) });
  assert.deepEqual(restoreJettyReturnState(state, missingStrip), createJettyReturnState());
  assert.deepEqual(restoreJettyReturnState({ ...state, version: 999 }, ctx), createJettyReturnState());
});

test('station targets are separated on the actual walkable shelf and stay outdoors', () => {
  const ctx = context();
  const world = createWorld(new THREE.Scene(), new THREE.PerspectiveCamera());
  assert.equal(JETTY_RETURN_STATIONS.length, 4);
  for (const station of JETTY_RETURN_STATIONS) {
    assert.equal(nearestJettyReturnStation(station.x, station.z, null, null, ctx)?.id, station.id);
    assert.equal(nearestJettyReturnStation(station.x, station.z, 'radio', null, ctx), null);
    assert.ok(station.z > -342, 'stations stay landward of the rescue launch berth');
    assert.equal(world.isWalkable(station.x, station.z), true, `${station.id} is reachable`);
    assert.ok(world.terrainHeight(station.x, station.z) >= 0.3, `${station.id} is above the water`);
    assert.equal(world.natureObstacles.some((obstacle) =>
      Math.hypot(station.x - obstacle.x, station.z - obstacle.z) < obstacle.radius + 0.45), false,
    `${station.id} has player-sized clearance from nature obstacles`);
  }
  assert.equal(nearestJettyReturnStation(NaN, -307, null, null, ctx), null);
});

test('small scene props reveal only when the signed return is available', () => {
  const scene = new THREE.Scene();
  const props = createJettyReturnProps(scene, () => 1.5);
  assert.equal(props.group.visible, false);
  props.update(createJettyReturnState(), context({ reportSubmitted: false }));
  assert.equal(props.group.visible, false);
  props.update(createJettyReturnState(), context());
  assert.equal(props.group.visible, true);
  assert.equal(props.group.children.length, JETTY_RETURN_STATIONS.length);
  props.dispose();
  assert.equal(scene.children.includes(props.group), false);
});
