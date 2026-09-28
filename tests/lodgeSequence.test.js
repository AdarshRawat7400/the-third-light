import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LODGE_STATIONS,
  createLodgeSequenceState, restoreLodgeSequenceState, lodgeSequenceMilestones,
  nearestLodgeStation, getLodgeSequencePanel, applyLodgeSequenceAction,
} from '../src/lodgeSequence.js';
import { BUILDING_SHAPES, isInsideBuilding } from '../src/collision.js';
import { CLUES, SITES } from '../src/story.js';
import { createLodgeScene } from '../src/lodgeScene.js';
import * as THREE from 'three';

const found = new Set(['iris_note', 'window_reflection']);
const lodge = SITES.find((site) => site.id === 'lodge');
const acts = {
  shutter: { type: 'lodge.shutter', answer: 'latch_open' },
  lamp: { type: 'lodge.lamp', answer: 'shade_away' },
  folder: { type: 'lodge.folder', answer: 'take_carbon' },
  desk: { type: 'lodge.desk', answer: 'qualification_removed' },
};

function apply(state, action, evidence = found) {
  return applyLodgeSequenceAction(state, action, evidence);
}

test('every lodge station is separately reachable on clear interior floor', () => {
  assert.ok(lodge);
  for (const clueId of found) {
    const clue = CLUES.find((entry) => entry.id === clueId);
    assert.equal(clue?.room, 'lodge', `${clueId} must be collectable here`);
    assert.equal(clue.minChapter, 0);
  }
  const shape = BUILDING_SHAPES.lodge;
  for (const station of LODGE_STATIONS) {
    assert.ok(Math.abs(station.x) < shape.halfWidth - .32, station.id);
    assert.ok(Math.abs(station.z) < shape.halfDepth - .32, station.id);
    const x = lodge.x + station.x;
    const z = lodge.z + station.z;
    assert.ok(isInsideBuilding(lodge, x, z), `${station.id} cannot be reached`);
    assert.equal(nearestLodgeStation(x, z, 'lodge', createLodgeSequenceState(), found)?.id, station.id);
    assert.equal(nearestLodgeStation(x, z, null, createLodgeSequenceState(), found), null,
      'a station must not be activated through a wall');
  }
  for (let i = 0; i < LODGE_STATIONS.length; i++) {
    for (let j = i + 1; j < LODGE_STATIONS.length; j++) {
      const a = LODGE_STATIONS[i];
      const b = LODGE_STATIONS[j];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 3.5, `${a.id}/${b.id} prompts overlap`);
    }
  }
});

test('three observations can happen in any order, but desk comparison must be earned', () => {
  const initial = createLodgeSequenceState();
  assert.equal(getLodgeSequencePanel(initial, 'desk', found).actions.length, 0);
  assert.equal(apply(initial, acts.desk).status, 'blocked');
  let state = initial;
  for (const id of ['folder', 'shutter', 'lamp']) {
    const result = apply(state, acts[id]);
    assert.equal(result.status, 'changed');
    assert.ok(result.event);
    state = result.state;
  }
  assert.equal(lodgeSequenceMilestones(state, found).completedStations, 3);
  assert.equal(getLodgeSequencePanel(state, 'desk', found).actions.length, 3);
  const bad = apply(state, { type: 'lodge.desk', answer: 'lamp_proven_active' });
  assert.equal(bad.status, 'mistake');
  assert.equal(bad.event, null);
  assert.deepEqual(bad.state, state);
  const completed = apply(state, acts.desk);
  assert.equal(completed.status, 'complete');
  assert.equal(completed.event, 'lodge_case_compared');
  assert.equal(lodgeSequenceMilestones(completed.state, found).qualificationCompared, true);
  assert.equal(getLodgeSequencePanel(completed.state, 'desk', found).actions.length, 0);
  assert.equal(apply(completed.state, acts.desk).event, null, 'completion event fires only once');
  assert.deepEqual(initial, createLodgeSequenceState(), 'transitions must not mutate earlier saves');
});

test('missing existing clues give exact recoverable directions and cannot forge a finish', () => {
  let state = createLodgeSequenceState();
  for (const id of ['shutter', 'lamp', 'folder']) state = apply(state, acts[id], []).state;
  let panel = getLodgeSequencePanel(state, 'desk', ['iris_note']);
  assert.deepEqual(panel.missingStationIds, []);
  assert.deepEqual(panel.missingEvidenceIds, ['window_reflection']);
  assert.match(panel.text, /rain-covered east window/);
  assert.equal(panel.actions.length, 0);
  assert.equal(apply(state, acts.desk, ['iris_note']).status, 'blocked');
  panel = getLodgeSequencePanel(state, 'desk', found);
  assert.equal(panel.actions.length, 3);
  assert.equal(apply(state, { type: 'lodge.desk', answer: 'unknown' }).status, 'blocked');
  assert.equal(apply(state, { type: 'lodge.lamp', answer: 'cover_harbor' }).status, 'unchanged',
    'completed local observations cannot be overwritten');
});

test('partial save resumes; invalid, old, or fabricated completion is discarded', () => {
  let state = createLodgeSequenceState();
  state = apply(state, acts.lamp, []).state;
  state = apply(state, acts.folder, []).state;
  assert.deepEqual(restoreLodgeSequenceState(JSON.parse(JSON.stringify(state)), []), state);
  assert.deepEqual(restoreLodgeSequenceState({ ...state, qualificationCompared: true }, found), state,
    'a forged desk flag cannot skip the shutter');
  state = apply(state, acts.shutter, []).state;
  const forged = { ...state, qualificationCompared: true };
  assert.equal(restoreLodgeSequenceState(forged, []).qualificationCompared, false,
    'missing Iris and window evidence prevent a claimed conclusion');
  assert.equal(restoreLodgeSequenceState(forged, found).qualificationCompared, true,
    'a genuinely complete save remains loadable');
  assert.deepEqual(restoreLodgeSequenceState({ ...forged, version: 999 }, found), createLodgeSequenceState());
  assert.deepEqual(restoreLodgeSequenceState({ ...forged, lampRedirected: 1 }, found),
    { ...state, lampRedirected: false, qualificationCompared: false }, 'flags require exact booleans');
});

test('wrong lamp choice provides a physical explanation without altering state', () => {
  const state = createLodgeSequenceState();
  const result = apply(state, { type: 'lodge.lamp', answer: 'cover_harbor' }, []);
  assert.equal(result.status, 'mistake');
  assert.match(result.message, /Move the nearby lamp/);
  assert.deepEqual(result.state, state);
});

test('lodge fixtures expose collisions away from every interaction anchor', () => {
  const scene = new THREE.Scene();
  const fixtures = createLodgeScene(scene, () => 42, lodge);
  assert.equal(fixtures.group.parent, scene);
  assert.equal(fixtures.blocksMove(lodge.x - 5.35, lodge.z - 4.16), true);
  assert.equal(fixtures.blocksMove(lodge.x + 1.35, lodge.z - 3.35), true);
  for (const station of LODGE_STATIONS) {
    assert.equal(fixtures.blocksMove(lodge.x + station.x, lodge.z + station.z), false,
      `${station.id} interaction anchor is obstructed`);
  }
  fixtures.dispose();
  assert.equal(scene.children.length, 0);
});
