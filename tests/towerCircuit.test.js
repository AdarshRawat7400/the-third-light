import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  TOWER_CIRCUIT_STATIONS, TOWER_SITE, applyTowerCircuitAction,
  compareTowerSightlines, createTowerCircuitState, getTowerCircuitPanel,
  nearestTowerCircuitStation, restoreTowerCircuitState, sightlineXAtZ,
  towerCircuitMilestones,
} from '../src/towerCircuit.js';
import { createTowerCircuitProps } from '../src/towerCircuitProps.js';
import { BUILDING_SHAPES, isInsideBuilding } from '../src/collision.js';
import { CLUES, NAV_LIGHTS } from '../src/story.js';
import { selectFieldInteraction } from '../src/fieldInteraction.js';
import { createWorld } from '../src/world.js';

const evidence = new Set(['headland_view', 'east_ridge_view', 'tower_panel', 'archive_chart']);
const act = (state, type, extra = {}, found = evidence) =>
  applyTowerCircuitAction(state, { type, ...extra }, found);

test('tower stations are physically reachable inside the authored tower without a floor obstruction', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  const shape = BUILDING_SHAPES.tower;
  assert.equal(TOWER_CIRCUIT_STATIONS.length, 4);
  for (const station of TOWER_CIRCUIT_STATIONS) {
    // The player stands toward the centre from the wall plaque. The straight
    // room corridor from the +z doorway can approach each station.
    const approachX = TOWER_SITE.x + (station.x < 0 ? -2.12 : 2.12);
    const approachZ = TOWER_SITE.z + station.z;
    assert.ok(Math.abs(station.x) < shape.halfWidth);
    assert.ok(Math.abs(station.z) < shape.halfDepth);
    assert.ok(isInsideBuilding(TOWER_SITE, approachX, approachZ), station.id);
    assert.ok(world.isWalkable(approachX, approachZ), station.id);
    const nearest = nearestTowerCircuitStation(approachX, approachZ, 'tower', null, [], 1.35);
    assert.equal(nearest?.id, station.id);
    assert.ok(nearest.distance < 1, station.id);
    for (let i = 0; i <= 12; i++) {
      const x = TOWER_SITE.x + (approachX - TOWER_SITE.x) * i / 12;
      const z = TOWER_SITE.z + 2.6 + (approachZ - (TOWER_SITE.z + 2.6)) * i / 12;
      assert.ok(isInsideBuilding(TOWER_SITE, x, z), `${station.id} corridor step ${i}`);
      assert.ok(world.isWalkable(x, z), `${station.id} terrain step ${i}`);
    }
  }
  assert.equal(nearestTowerCircuitStation(TOWER_SITE.x, TOWER_SITE.z, null, null), null);
  assert.equal(nearestTowerCircuitStation(Infinity, TOWER_SITE.z, 'tower', null), null);
});

test('the reachable wiring plaque wins E over a recorded tower control panel', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  const panel = CLUES.find((clue) => clue.id === 'tower_panel');
  const wiring = TOWER_CIRCUIT_STATIONS.find((station) => station.id === 'wiring');
  assert.ok(panel && wiring);
  for (const zOffset of [-0.2, 0, 0.2]) {
    // Stand on the room side of the visible west-wall plaque. These are
    // ordinary walkable positions, not the station's wall-side anchor.
    const x = TOWER_SITE.x - 2.12;
    const z = TOWER_SITE.z + wiring.z + zOffset;
    assert.ok(isInsideBuilding(TOWER_SITE, x, z));
    assert.ok(world.isWalkable(x, z));
    const towerStation = nearestTowerCircuitStation(x, z, 'tower', null, evidence);
    const clueDistance = Math.hypot(x - (TOWER_SITE.x + panel.x),
      z - (TOWER_SITE.z + panel.z));
    const target = selectFieldInteraction({ clue: panel, clueDistance,
      requiredClue: false, towerStation });
    assert.equal(towerStation?.id, 'wiring');
    assert.ok(towerStation.distance < clueDistance);
    assert.equal(target?.kind, 'tower');
    assert.equal(target.target.id, 'wiring');
  }
});

test('the chart plaque remains distinct from the recorded alignment board', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  const alignment = CLUES.find((clue) => clue.id === 'alignment_solution');
  const chart = TOWER_CIRCUIT_STATIONS.find((station) => station.id === 'chart');
  assert.ok(alignment && chart);
  assert.ok(chart.z + .71 < BUILDING_SHAPES.tower.halfDepth,
    'the full chart backing must fit inside the north wall');
  const x = TOWER_SITE.x + 2.12;
  const z = TOWER_SITE.z + chart.z;
  assert.ok(isInsideBuilding(TOWER_SITE, x, z));
  assert.ok(world.isWalkable(x, z));
  const towerStation = nearestTowerCircuitStation(x, z, 'tower',
    createTowerCircuitState(), new Set([...evidence, alignment.id]));
  const clueDistance = Math.hypot(x - (TOWER_SITE.x + alignment.x),
    z - (TOWER_SITE.z + alignment.z));
  const target = selectFieldInteraction({ clue: alignment, clueDistance,
    requiredClue: false, towerStation });
  assert.equal(towerStation?.id, 'chart');
  assert.ok(towerStation.distance < clueDistance);
  assert.equal(target?.kind, 'tower');
  assert.equal(target.target.id, 'chart');
});

test('chart comparison computes the physical safe and false sea bearings', () => {
  const west = CLUES.find((clue) => clue.id === 'headland_view').world;
  const east = CLUES.find((clue) => clue.id === 'east_ridge_view').world;
  const lineOffset = (point, rear) => {
    const xOnLine = sightlineXAtZ(rear, point[1]);
    return Math.abs(point[0] - xOnLine);
  };
  assert.ok(lineOffset(west, 'main') < 1);
  assert.ok(lineOffset(east, 'standby') < 1);
  assert.ok(lineOffset(west, 'standby') > 25);
  assert.ok(lineOffset(east, 'main') > 25);
  const sea = compareTowerSightlines(-370);
  assert.equal(sea.safeRear, 'main');
  assert.equal(sea.reefRear, 'standby');
  assert.ok(sea.separation > 100, 'false line must diverge far west toward reef');
  assert.equal(sightlineXAtZ('main', NAV_LIGHTS.front.z), NAV_LIGHTS.front.x);
  assert.equal(sightlineXAtZ('invalid', -370), null);
  assert.equal(compareTowerSightlines(-200), null);
});

test('both survey photographs and the tower panel are required before any circuit inference', () => {
  const blank = createTowerCircuitState();
  for (const type of ['tower.wiring', 'tower.test', 'tower.overlay', 'tower.chart']) {
    const result = act(blank, type, { answer: 'standby_connected', stake: 'west', rear: 'main' }, []);
    assert.equal(result.status, 'blocked');
    assert.deepEqual(result.state, blank);
  }
  const panel = getTowerCircuitPanel(blank, 'wiring', ['headland_view', 'tower_panel']);
  assert.deepEqual(panel.missingEvidenceIds, ['east_ridge_view']);
  assert.equal(panel.actions.length, 0);
  assert.equal(getTowerCircuitPanel(blank, 'unknown', evidence).actions.length, 0);
});

test('current continuity is separated from the wreck-night relay record', () => {
  const blank = createTowerCircuitState();
  const badWiring = act(blank, 'tower.wiring', { answer: 'old_night_proven' });
  assert.equal(badWiring.status, 'mistake');
  assert.deepEqual(badWiring.state, blank);
  let state = act(blank, 'tower.wiring', { answer: 'standby_connected' }).state;
  assert.equal(state.wiringTraced, true);
  const wrongAge = act(state, 'tower.test', { answer: 'wreck_night_active' });
  assert.equal(wrongAge.status, 'mistake');
  assert.match(wrongAge.message, /original relay strip/);
  assert.equal(wrongAge.state.testQualified, false);
  const testResult = act(state, 'tower.test', { answer: 'present_only' });
  assert.equal(testResult.status, 'changed');
  assert.match(testResult.message, /without illuminating the seaward beacon/);
  state = testResult.state;
  const later = getTowerCircuitPanel(state, 'test', new Set([...evidence, 'lamp_strip']));
  assert.match(later.text, /independently records both rear circuits active at 21:14/);
  const beforeStrip = getTowerCircuitPanel(state, 'test', evidence);
  assert.doesNotMatch(beforeStrip.text, /both rear circuits active at 21:14/);
});

test('wrong plotted lines and unsafe channel choice are recoverable', () => {
  let state = createTowerCircuitState();
  state = act(state, 'tower.wiring', { answer: 'standby_connected' }).state;
  state = act(state, 'tower.test', { answer: 'present_only' }).state;
  assert.equal(act(state, 'tower.overlay', { stake: 'east', rear: 'standby' }).status, 'blocked');
  const wrongWest = act(state, 'tower.overlay', { stake: 'west', rear: 'standby' });
  assert.equal(wrongWest.status, 'mistake');
  assert.deepEqual(wrongWest.state, state);
  state = act(state, 'tower.overlay', { stake: 'west', rear: 'main' }).state;
  const wrongEast = act(state, 'tower.overlay', { stake: 'east', rear: 'main' });
  assert.equal(wrongEast.status, 'mistake');
  assert.equal(wrongEast.state.eastTraced, false);
  state = act(state, 'tower.overlay', { stake: 'east', rear: 'standby' }).state;
  const noChart = act(state, 'tower.chart', { answer: 'main_deep' },
    ['headland_view', 'east_ridge_view', 'tower_panel']);
  assert.equal(noChart.status, 'blocked');
  const reef = act(state, 'tower.chart', { answer: 'standby_deep' });
  assert.equal(reef.status, 'mistake');
  assert.equal(reef.state.channelCompared, false);
  const solved = act(reef.state, 'tower.chart', { answer: 'main_deep' });
  assert.equal(solved.status, 'complete');
  assert.equal(solved.event, 'tower_channel_compared');
  assert.equal(towerCircuitMilestones(solved.state, evidence).safeLineCompared, true);
  assert.match(getTowerCircuitPanel(solved.state, 'chart', evidence).text,
    /not which lamp operated seventeen years ago/);
});

test('save restoration rejects unsupported progress and preserves a valid JSON round trip', () => {
  const forged = restoreTowerCircuitState({ version: 1, channelCompared: true,
    testQualified: true, westTraced: true, eastTraced: true }, evidence);
  assert.equal(forged.channelCompared, false);
  assert.equal(forged.testQualified, false);
  const wrongVersion = restoreTowerCircuitState({ version: 999, wiringTraced: true }, evidence);
  assert.deepEqual(wrongVersion, createTowerCircuitState());

  let state = createTowerCircuitState();
  state = act(state, 'tower.wiring', { answer: 'standby_connected' }).state;
  state = act(state, 'tower.test', { answer: 'present_only' }).state;
  state = act(state, 'tower.overlay', { stake: 'west', rear: 'main' }).state;
  state = act(state, 'tower.overlay', { stake: 'east', rear: 'standby' }).state;
  state = act(state, 'tower.chart', { answer: 'main_deep' }).state;
  const saved = JSON.parse(JSON.stringify(state));
  assert.deepEqual(restoreTowerCircuitState(saved, evidence), state);
  assert.equal(restoreTowerCircuitState(saved, ['headland_view', 'tower_panel']).channelCompared, false);
  assert.equal(restoreTowerCircuitState(saved, [...evidence].filter((id) => id !== 'archive_chart')).channelCompared, false);
});

test('legitimate old alignment saves migrate without inventing a present-day test reading', () => {
  const previousFound = new Set([...evidence, 'alignment_solution']);
  const migrated = restoreTowerCircuitState(null, previousFound);
  assert.equal(towerCircuitMilestones(migrated, previousFound).completedStations, 4);
  assert.equal(migrated.legacyAlignment, true);
  const testPanel = getTowerCircuitPanel(migrated, 'test', previousFound);
  assert.equal(testPanel.complete, true);
  assert.match(testPanel.text, /earlier finding did not depend on a new continuity test/);
  assert.doesNotMatch(testPanel.text, /repeater answered/);
  assert.deepEqual(restoreTowerCircuitState(JSON.parse(JSON.stringify(migrated)), previousFound), migrated);
  const incompleteSources = new Set([...previousFound].filter((id) => id !== 'archive_chart'));
  assert.deepEqual(restoreTowerCircuitState(null, incompleteSources), createTowerCircuitState());
  assert.deepEqual(restoreTowerCircuitState({ version: 99 }, previousFound), createTowerCircuitState());
});

test('visual tower fixtures remain low cost, wall mounted, and respond to state', () => {
  const scene = new THREE.Scene();
  const props = createTowerCircuitProps(scene, () => 48, TOWER_SITE);
  assert.equal(scene.children.includes(props.group), true);
  assert.equal(props.group.children.length, 4);
  let meshCount = 0;
  props.group.traverse((object) => { if (object.isMesh) meshCount++; });
  assert.ok(meshCount <= 12, `only four backings, four diagrams, four status lights: ${meshCount}`);
  for (const board of props.group.children) {
    assert.ok(Math.abs(board.position.x) < BUILDING_SHAPES.tower.halfWidth);
    assert.ok(Math.abs(board.position.z) < BUILDING_SHAPES.tower.halfDepth);
  }
  const wiringBoard = props.group.getObjectByName('Tower wiring plaque');
  const chartBoard = props.group.getObjectByName('Tower chart plaque');
  assert.ok(wiringBoard.position.y - .56 > 1.375,
    'new conductor diagram must clear the existing waist-high control cabinet');
  assert.ok(wiringBoard.position.x + .043 > -3.26,
    'wiring face must stand in front of the authored west cabinet');
  assert.ok(chartBoard.position.z - .71 > 1.845,
    'chart plaque must clear the existing alignment board at local z=1.8');
  assert.ok(chartBoard.position.x - .043 < 3.207,
    'chart face must stand in front of the authored east paper chart');
  const state = act(createTowerCircuitState(), 'tower.wiring', { answer: 'standby_connected' }).state;
  props.update(state, evidence);
  const led = props.group.getObjectByName('Standby conductor diagram status lamp');
  assert.equal(led.material.color.getHex(), 0x93b0a1);
  assert.equal(props.blocksMove(TOWER_SITE.x, TOWER_SITE.z), false);
  props.dispose();
  assert.equal(scene.children.includes(props.group), false);
});
