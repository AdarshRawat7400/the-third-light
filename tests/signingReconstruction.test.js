import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIGNING_STATIONS,
  createSigningReconstructionState, restoreSigningReconstructionState,
  signingReconstructionMilestones, nearestSigningStation,
  getSigningReconstructionPanel, applySigningReconstructionAction,
} from '../src/signingReconstruction.js';
import { BUILDING_SHAPES, isInsideBuilding, buildingWallBlocks, circlesBlock,
  archiveFurnitureBlocks, PLAYER_RADIUS } from '../src/collision.js';
import { CHAPTERS, CLUES, SITES } from '../src/story.js';
import { createChapterStart } from '../src/chapterSelect.js';
import { createSigningRoomScene } from '../src/signingRoomScene.js';
import { createWorld } from '../src/world.js';
import * as THREE from 'three';

const found = new Set([
  'lodge_working_carbon', 'official_log', 'captain_statement', 'archive_draft_memo',
]);
const actions = {
  intake: { type: 'signing.intake', answer: 'conflicting_accounts' },
  sleeve: { type: 'signing.sleeve', answer: 'original_absent' },
  docket: { type: 'signing.docket', answer: 'deadline_with_qualification' },
  desk: { type: 'signing.desk', answer: 'qualification_removed' },
};
const archive = SITES.find((site) => site.id === 'archive');
const act = (state, action, evidence = found) => applySigningReconstructionAction(state, action, evidence);

test('signing stations are physically distinct inside the Chapter 2 archive', () => {
  assert.ok(archive);
  const shape = BUILDING_SHAPES.archive;
  for (const station of SIGNING_STATIONS) {
    assert.ok(Math.abs(station.x) < shape.halfWidth - .32, station.id);
    assert.ok(Math.abs(station.z) < shape.halfDepth - .32, station.id);
    const x = archive.x + station.x, z = archive.z + station.z;
    assert.ok(isInsideBuilding(archive, x, z));
    assert.equal(nearestSigningStation(x, z, 'archive', createSigningReconstructionState(), found)?.id,
      station.id);
    assert.equal(nearestSigningStation(x, z, null, createSigningReconstructionState(), found), null,
      'an archive interaction cannot be used through the wall');
  }
  for (let i = 0; i < SIGNING_STATIONS.length; i++) {
    for (let j = i + 1; j < SIGNING_STATIONS.length; j++) {
      const a = SIGNING_STATIONS[i], b = SIGNING_STATIONS[j];
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 3.5, `${a.id}/${b.id} anchors overlap`);
    }
  }
  for (const station of SIGNING_STATIONS) {
    for (const id of station.evidenceIds) {
      const clue = CLUES.find((item) => item.id === id);
      assert.ok(clue, `missing clue ${id}`);
      assert.ok(clue.minChapter <= 1, `${id} is only introduced after the signing chapter`);
    }
  }
});

test('source, missing original, and deadline may be inspected in any order, but final judgment is earned', () => {
  const initial = createSigningReconstructionState();
  assert.equal(getSigningReconstructionPanel(initial, 'desk', found).actions.length, 0);
  assert.equal(act(initial, actions.desk).status, 'blocked');
  let state = initial;
  for (const id of ['docket', 'sleeve', 'intake']) {
    const result = act(state, actions[id]);
    assert.equal(result.status, 'changed', id);
    assert.ok(result.event);
    state = result.state;
  }
  assert.equal(signingReconstructionMilestones(state, found).completedStations, 3);
  const panel = getSigningReconstructionPanel(state, 'desk', found);
  assert.equal(panel.actions.length, 4);
  assert.match(panel.text, /what Mara knew, what she chose/);
  const overclaim = act(state, { type: 'signing.desk', answer: 'knew_lamp_lit' });
  assert.equal(overclaim.status, 'mistake');
  assert.equal(overclaim.event, null);
  assert.deepEqual(overclaim.state, state);
  const result = act(state, actions.desk);
  assert.equal(result.status, 'complete');
  assert.equal(result.event, 'signing_reconstructed');
  assert.equal(signingReconstructionMilestones(result.state, found).decisionReconstructed, true);
  assert.match(result.message, /could not know the relay state/);
  assert.equal(act(result.state, actions.desk).event, null, 'completion event must fire once');
  assert.deepEqual(initial, createSigningReconstructionState(), 'transitions must not mutate prior state');
});

test('missing primary records give recoverable directions and block fabricated conclusions', () => {
  const initial = createSigningReconstructionState();
  const onlyLog = new Set(['official_log']);
  const intake = getSigningReconstructionPanel(initial, 'intake', onlyLog);
  assert.deepEqual(intake.missingEvidenceIds, ['captain_statement']);
  assert.match(intake.text, /captain’s original testimony/);
  assert.equal(intake.actions.length, 0);
  assert.equal(act(initial, actions.intake, onlyLog).status, 'blocked');
  const sleeve = getSigningReconstructionPanel(initial, 'sleeve', onlyLog);
  assert.deepEqual(sleeve.missingEvidenceIds, ['archive_draft_memo']);
  assert.equal(act(initial, actions.sleeve, onlyLog).status, 'blocked');
  assert.equal(act(initial, { ...actions.desk, answer: 'unlisted' }).status, 'blocked');
  assert.equal(act(initial, { type: 'signing.unknown', answer: 'whatever' }).status, 'blocked');
});

test('wrong interpretations distinguish pressure from coercion and missing source from proof', () => {
  const state = createSigningReconstructionState();
  for (const [id, answer] of [
    ['intake', 'deckhand_present'], ['sleeve', 'elias_destroyed'],
    ['docket', 'supervisor_ordered'],
  ]) {
    const result = act(state, { type: actions[id].type, answer });
    assert.equal(result.status, 'mistake', id);
    assert.equal(result.event, null);
    assert.deepEqual(result.state, state);
    assert.ok(result.message.length > 20);
  }
  const docket = getSigningReconstructionPanel(state, 'docket', found);
  assert.match(docket.text, /allows unresolved source questions/);
  assert.match(docket.text, /No|What did the deadline require/);
});

test('optional later sources add timing context without changing what Mara knew at signing', () => {
  const state = createSigningReconstructionState();
  const early = getSigningReconstructionPanel(state, 'intake', found);
  assert.doesNotMatch(early.text, /deckhand’s addendum corroborates/);
  const extra = new Set([...found, 'archive_witness_addendum', 'prison_intake_ledger', 'archive_revision_stamp']);
  const after = getSigningReconstructionPanel(state, 'intake', extra);
  assert.match(after.text, /arrived a month after this finding/);
  assert.match(after.text, /before press coverage/);
  const sleeve = getSigningReconstructionPanel(state, 'sleeve', extra);
  assert.match(sleeve.text, /not the absent machine original/);
  assert.deepEqual(after.actions, early.actions, 'later optional records cannot alter the original answer');
});

test('partial saves resume while skipped stations or missing evidence strip claimed completion', () => {
  let state = createSigningReconstructionState();
  state = act(state, actions.intake).state;
  state = act(state, actions.docket).state;
  assert.deepEqual(restoreSigningReconstructionState(JSON.parse(JSON.stringify(state)), found), state);
  assert.equal(restoreSigningReconstructionState({ ...state, decisionReconstructed: true }, found)
    .decisionReconstructed, false, 'cannot skip the original sleeve');
  state = act(state, actions.sleeve).state;
  const forged = { ...state, decisionReconstructed: true };
  assert.equal(restoreSigningReconstructionState(forged, ['official_log', 'captain_statement', 'archive_draft_memo'])
    .decisionReconstructed, false, 'missing lodge carbon prevents a claimed conclusion');
  assert.equal(restoreSigningReconstructionState(forged, found).decisionReconstructed, true);
  assert.deepEqual(restoreSigningReconstructionState({ ...forged, version: 99 }, found),
    createSigningReconstructionState());
  assert.equal(restoreSigningReconstructionState({ ...forged, docketRead: 'true' }, found)
    .decisionReconstructed, false, 'flags require exact booleans');
});

test('Chapter 2 requires a documented signing finding and later chapter starts retain it', () => {
  const finding = CLUES.find((clue) => clue.id === 'archive_signing_finding');
  assert.equal(finding?.special, 'signing');
  assert.equal(finding?.room, 'archive');
  assert.equal(finding?.minChapter, 1);
  assert.ok(CHAPTERS[1].required.includes(finding.id));
  assert.ok(CHAPTERS[1].required.includes('archive_reconstruction'));
  const second = createChapterStart(1);
  assert.equal(second.found.includes(finding.id), false);
  assert.equal(second.found.includes('lodge_working_carbon'), true);
  const third = createChapterStart(2);
  assert.equal(third.found.includes(finding.id), true);
  const restored = restoreSigningReconstructionState({
    version: 1, intakeSorted: true, originalChecked: true,
    docketRead: true, decisionReconstructed: true,
  }, new Set(third.found));
  assert.equal(restored.decisionReconstructed, true);
});

test('original archive fixtures change with valid observations and release resources', () => {
  const scene = new THREE.Scene();
  const fixtures = createSigningRoomScene(scene, () => 37, archive);
  assert.equal(fixtures.group.parent, scene);
  assert.equal(fixtures.group.getObjectByName('Mara working carbon on signing table').visible, false);
  assert.equal(fixtures.group.getObjectByName('struck unresolved status').visible, false);
  const desk = fixtures.deskCollider;
  assert.equal(desk.z, archive.z + 1, 'the desk must match Blender -Y to glTF +Z');
  assert.equal(fixtures.blocksMove(desk.x, desk.z), true);
  assert.equal(fixtures.blocksMoveFrom(desk.x, desk.z + 2, desk.x, desk.z + .5), true,
    'the player cannot step into a solid table');
  assert.equal(fixtures.blocksMoveFrom(desk.x, desk.z, desk.x, desk.z + .1), false,
    'an old save inside the new table collider can move out');
  for (const name of ['intake shelf', 'original-record slot',
    'Mara working carbon on signing table']) {
    const prop = fixtures.group.getObjectByName(name);
    assert.ok(prop, `${name} is present`);
    const x = archive.x + prop.position.x;
    const z = archive.z + prop.position.z;
    if (name !== 'Mara working carbon on signing table') {
      assert.equal(archiveFurnitureBlocks(archive, x, z), false,
        `${name} must be outside the shelf banks`);
    } else assert.equal(archiveFurnitureBlocks(archive, x, z), true,
      'the carbon deliberately lies on the solid desk');
  }
  let state = createSigningReconstructionState();
  for (const id of ['sleeve', 'intake', 'docket']) state = act(state, actions[id]).state;
  fixtures.update(state, found);
  assert.equal(fixtures.group.getObjectByName('Mara working carbon on signing table').visible, true);
  assert.equal(fixtures.group.getObjectByName('struck unresolved status').visible, false);
  state = act(state, actions.desk).state;
  fixtures.update(state, found);
  assert.equal(fixtures.group.getObjectByName('struck unresolved status').visible, true);
  fixtures.dispose();
  assert.equal(scene.children.length, 0);
});

test('all four station anchors are reachable from the actual archive doorway on level ground', () => {
  const scene = new THREE.Scene();
  const world = createWorld(scene, new THREE.Camera());
  const fixtures = createSigningRoomScene(scene, world.terrainHeight, archive);
  const passable = (x, z) => world.isWalkable(x, z)
    && !SITES.some((site) => buildingWallBlocks(site, x, z, PLAYER_RADIUS))
    && !circlesBlock(x, z, PLAYER_RADIUS, world.natureObstacles)
    && !archiveFurnitureBlocks(archive, x, z, PLAYER_RADIUS)
    && !fixtures.blocksMove(x, z, PLAYER_RADIUS);
  const step = .4;
  const queue = [[0, 0]];
  const visited = new Set(['0,0']);
  const reached = new Set();
  for (let i = 0; i < queue.length; i++) {
    const [gx, gz] = queue[i];
    const x = archive.x + gx * step, z = archive.z + 6 + gz * step;
    const near = nearestSigningStation(x, z, 'archive', createSigningReconstructionState(), [], .75);
    if (near) reached.add(near.id);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (Math.abs(nx) > 20 || nz < -28 || nz > 3) continue;
      const key = `${nx},${nz}`;
      if (visited.has(key)) continue;
      const px = archive.x + nx * step, pz = archive.z + 6 + nz * step;
      if (!passable(px, pz)) continue;
      visited.add(key);
      queue.push([nx, nz]);
    }
  }
  assert.deepEqual([...reached].sort(), SIGNING_STATIONS.map((station) => station.id).sort());
  const floor = world.terrainHeight(archive.x, archive.z);
  for (const station of SIGNING_STATIONS) {
    assert.ok(Math.abs(world.terrainHeight(archive.x + station.x, archive.z + station.z) - floor) < .1,
      `${station.id} is vertically separated from the archive floor`);
  }
  fixtures.dispose();
});
