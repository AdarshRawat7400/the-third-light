import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLUES, SITES } from '../src/story.js';
import { PLAYER_RADIUS, buildingWallBlocks, circlesBlock, isInsideBuilding } from '../src/collision.js';
import { createWorld } from '../src/world.js';
import { createSetDressing } from '../src/setDressing.js';
import { ancillaryBlocksMove, ancillaryFootprints } from '../src/buildingDetails.js';
import {
  IRIS_TRAIL_STATIONS, applyIrisTrailAction, createIrisTrailState,
  getIrisTrailPanel, irisTrailMilestones, irisTrailSummary,
  nearestIrisTrailStation, restoreIrisTrailState, serializeIrisTrailState,
} from '../src/irisTrail.js';

const context = { chapter: 3, foundIds: new Set() };
const action = (stationId, answer) => {
  const station = IRIS_TRAIL_STATIONS.find((entry) => entry.id === stationId);
  return { type: station.actionType, answer };
};

test('stations form a physical radio-to-pump-to-hatch route without inaccessible indoor prompts', () => {
  const sites = new Map(SITES.map((site) => [site.id, site]));
  assert.deepEqual(IRIS_TRAIL_STATIONS.map((station) => station.id), ['radio', 'road', 'pump', 'hatch']);
  for (const station of IRIS_TRAIL_STATIONS) {
    assert.ok(Number.isFinite(station.x) && Number.isFinite(station.z));
    const site = sites.get(station.site);
    if (station.inside) {
      assert.equal(station.site, station.inside);
      assert.ok(isInsideBuilding(site, station.x, station.z), `${station.id} is outside its room`);
      assert.equal(nearestIrisTrailStation(station.x, station.z, null, null, context), null,
        `${station.id} can be used through an exterior wall`);
    } else {
      assert.equal(nearestIrisTrailStation(station.x, station.z, 'radio', null, context), null);
    }
    const near = nearestIrisTrailStation(station.x, station.z, station.inside, null, context);
    assert.equal(near.id, station.id);
    assert.equal(near.complete, false);
  }
  assert.equal(nearestIrisTrailStation(NaN, 1, null, null, context), null);
  assert.equal(nearestIrisTrailStation(151, -58, 'radio', null, { ...context, chapter: 2 }), null);
});

test('all four route props and E anchors occupy traversable ground', () => {
  const scene = new THREE.Scene();
  const world = createWorld(scene, new THREE.Camera());
  const dressing = createSetDressing(scene, world.terrainHeight);
  const footprints = ancillaryFootprints(SITES);
  for (const station of IRIS_TRAIL_STATIONS) {
    const { x, z } = station;
    assert.ok(world.isWalkable(x, z), `${station.id} is outside walkable land`);
    assert.ok(!circlesBlock(x, z, PLAYER_RADIUS, world.natureObstacles),
      `${station.id} is blocked by a tree or boulder`);
    assert.ok(!dressing.collides(x, z, PLAYER_RADIUS), `${station.id} is blocked by set dressing`);
    assert.ok(!ancillaryBlocksMove(footprints, x, z, PLAYER_RADIUS),
      `${station.id} is blocked by an outbuilding`);
    assert.ok(!SITES.some((site) => buildingWallBlocks(site, x, z, PLAYER_RADIUS)),
      `${station.id} is within a building wall`);
  }
});

test('three observations can be gathered out of order, but final inference needs all three', () => {
  let state = createIrisTrailState();
  const original = structuredClone(state);
  const blocked = applyIrisTrailAction(state, action('hatch', 'documented_route_with_limits'), context);
  assert.equal(blocked.status, 'blocked');
  assert.deepEqual(getIrisTrailPanel(state, 'hatch', context).missingStationIds, ['radio', 'road', 'pump']);
  for (const id of ['pump', 'road', 'radio']) {
    const station = IRIS_TRAIL_STATIONS.find((entry) => entry.id === id);
    const wrong = station.choices.find((choice) => choice.answer !== station.answer);
    const mistake = applyIrisTrailAction(state, action(id, wrong.answer), context);
    assert.equal(mistake.status, 'mistake');
    assert.equal(mistake.event, null);
    assert.deepEqual(mistake.state, state);
    const recorded = applyIrisTrailAction(state, action(id, station.answer), context);
    assert.equal(recorded.status, 'changed');
    assert.equal(recorded.event, 'iris_route_observation');
    state = recorded.state;
  }
  assert.deepEqual(original, createIrisTrailState(), 'actions must not mutate the old state');
  assert.equal(irisTrailMilestones(state, context).readyToReconstruct, true);
  assert.equal(irisTrailMilestones(state, context).reconstructed, false);
  assert.equal(getIrisTrailPanel(state, 'hatch', context).actions.length, 3);
  assert.equal(applyIrisTrailAction(state, action('hatch', 'exact_chase'), context).status, 'mistake');
  const completed = applyIrisTrailAction(state, action('hatch', 'documented_route_with_limits'), context);
  assert.equal(completed.status, 'complete');
  assert.equal(completed.event, 'iris_route_reconstructed');
  assert.equal(irisTrailMilestones(completed.state, context).reconstructed, true);
  assert.equal(applyIrisTrailAction(completed.state, action('hatch', 'documented_route_with_limits'), context).event, null,
    'completion event fires once');
});

test('optional clues deepen the summary but are not prerequisites to reconstruction or rescue', () => {
  let state = createIrisTrailState();
  for (const station of IRIS_TRAIL_STATIONS) {
    state = applyIrisTrailAction(state, action(station.id, station.answer), context).state;
  }
  const minimal = irisTrailSummary(state, context);
  assert.match(minimal, /who carried the spool/);
  assert.match(minimal, /when Iris reached the hatch/);
  assert.doesNotMatch(minimal, /chase|sabotage|voluntar(y|ily)|murder/i);
  const optional = ['radio_iris_recording', 'pump_iris_route', 'tunnel_chalk', 'tunnel_signal'];
  for (const id of optional) assert.ok(CLUES.some((clue) => clue.id === id && clue.minChapter <= 3));
  const rich = irisTrailSummary(state, { chapter: 3, foundIds: optional });
  assert.ok(rich.length > minimal.length);
  assert.match(rich, /recorded checklist/);
  assert.match(rich, /Iris later answers/);
  assert.match(getIrisTrailPanel(createIrisTrailState(), 'radio', { chapter: 3, foundIds: optional }).text,
    /recorded checklist independently/);
  assert.match(getIrisTrailPanel(createIrisTrailState(), 'pump', {
    chapter: 3, foundIds: [...optional, 'pump_service_order'],
  }).text, /seventeen years earlier/);
  assert.equal(getIrisTrailPanel(createIrisTrailState(), 'radio', context).actions.length, 3);
  assert.equal(irisTrailMilestones(state, { chapter: 3, foundIds: [] }).reconstructed, true,
    'optional evidence must never gate this side investigation');
});

test('serialized trail rejects malformed, premature, and forged final states', () => {
  const blank = createIrisTrailState();
  assert.deepEqual(restoreIrisTrailState(null, context), blank);
  assert.deepEqual(restoreIrisTrailState({ version: 99, radio: 'planned_pump_route' }, context), blank);
  assert.deepEqual(restoreIrisTrailState({ ...blank, radio: 'planned_pump_route' }, { chapter: 2 }), blank);
  assert.deepEqual(restoreIrisTrailState({ ...blank, hatch: 'documented_route_with_limits' }, context), blank);
  const partial = { ...blank, pump: 'planned_shared_feed_check', radio: 'planned_pump_route' };
  assert.deepEqual(restoreIrisTrailState(partial, context), partial);
  assert.deepEqual(serializeIrisTrailState({ ...partial, road: 'wrong', hatch: 'documented_route_with_limits' }), partial);
  const completed = IRIS_TRAIL_STATIONS.reduce((state, station) =>
    applyIrisTrailAction(state, action(station.id, station.answer), context).state, blank);
  const saved = JSON.parse(JSON.stringify(serializeIrisTrailState(completed)));
  assert.deepEqual(restoreIrisTrailState(saved, context), completed);
  assert.equal(nearestIrisTrailStation(160, 139, null, saved, context).complete, true);
  assert.equal(getIrisTrailPanel(saved, 'hatch', context).actions.length, 0);
});
