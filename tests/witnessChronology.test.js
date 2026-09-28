import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLUES } from '../src/story.js';
import { createWorld } from '../src/world.js';
import { createSetDressing } from '../src/setDressing.js';
import { createWitnessChronologyScene } from '../src/witnessChronologyScene.js';
import {
  WITNESS_CHRONOLOGY_EVIDENCE, WITNESS_CHRONOLOGY_STATION,
  applyWitnessChronologyAction, createWitnessChronologyState,
  getWitnessChronologyPanel, nearestWitnessChronologyStation,
  restoreWitnessChronologyState, witnessChronologyMilestones,
} from '../src/witnessChronology.js';

const found = new Set(WITNESS_CHRONOLOGY_EVIDENCE);

test('the optional comparison uses existing records in Chapter 2 and does not gate the campaign', () => {
  const clues = new Map(CLUES.map((clue) => [clue.id, clue]));
  for (const id of found) {
    assert.ok(clues.has(id), `${id} must be a physical source`);
    assert.ok(clues.get(id).minChapter <= 1);
  }
  assert.equal(getWitnessChronologyPanel(null, found, 0).actions.length, 0);
  assert.equal(nearestWitnessChronologyStation(-69, 100.2, 0), null);
  assert.equal(nearestWitnessChronologyStation(-69, 100.2, 1)?.id, 'chronology');
});

test('the witness comparison preserves source dates and leaves lamp state unproved', () => {
  let state = createWitnessChronologyState();
  const gate = getWitnessChronologyPanel(state, found, 1);
  assert.equal(gate.actions.length, 3);
  assert.match(gate.text, /dated page against the hearing transcript/i);

  assert.equal(applyWitnessChronologyAction(state,
    { type: 'chronology.intake', answer: 'after_hearing' }, found, 1).status, 'mistake');
  assert.equal(applyWitnessChronologyAction(state,
    { type: 'chronology.captain', answer: 'same_core' }, found, 1).status, 'blocked');

  const path = [
    ['chronology.intake', 'before_press'],
    ['chronology.captain', 'same_core'],
    ['chronology.deckhand', 'later_support'],
    ['chronology.margin', 'bounded_revision'],
  ];
  const messages = [];
  for (const [type, answer] of path) {
    const result = applyWitnessChronologyAction(state, { type, answer }, found, 1);
    assert.ok(['changed', 'complete'].includes(result.status));
    state = result.state;
    messages.push(result.message);
  }
  assert.equal(witnessChronologyMilestones(state, found).completedBeats, 4);
  assert.equal(witnessChronologyMilestones(state, found).complete, true);
  assert.match(messages.join(' '), /after possible press influence/i);
  assert.match(messages.join(' '), /only the original relay can settle/i);
  assert.equal(applyWitnessChronologyAction(state,
    { type: 'chronology.margin', answer: 'bounded_revision' }, found, 1).status, 'unchanged');
  assert.equal(getWitnessChronologyPanel(state, found, 1).actions.length, 0);
});

test('missing evidence and forged saved progress cannot create a false chronology', () => {
  const raw = { version: 1, intakeDated: true, captainCompared: true,
    deckhandQualified: true, marginRevised: true };
  assert.deepEqual(restoreWitnessChronologyState(null, found), createWitnessChronologyState());
  assert.deepEqual(restoreWitnessChronologyState({ ...raw, version: 99 }, found),
    createWitnessChronologyState());
  assert.deepEqual(restoreWitnessChronologyState({ ...raw, captainCompared: false }, found),
    { ...createWitnessChronologyState(), intakeDated: true });
  assert.deepEqual(restoreWitnessChronologyState(raw, new Set(['prison_intake_ledger'])),
    { ...createWitnessChronologyState(), intakeDated: true });
  const noAddendum = new Set([...found].filter((id) => id !== 'archive_witness_addendum'));
  assert.equal(getWitnessChronologyPanel(raw, noAddendum, 1).complete, false);
  assert.deepEqual(getWitnessChronologyPanel(null, noAddendum, 1).missingEvidenceIds,
    ['archive_witness_addendum']);
  assert.equal(applyWitnessChronologyAction(null,
    { type: 'chronology.intake', answer: 'before_press' }, noAddendum, 1).status, 'blocked');
  assert.equal(applyWitnessChronologyAction(null,
    { type: 'chronology.intake', answer: 'before_press' }, found, 0).status, 'blocked');
});

test('the scene sits on the existing gatehouse plinth and is reachable from clear ground', () => {
  const scene = new THREE.Scene();
  const world = createWorld(scene, new THREE.Camera());
  const dressing = createSetDressing(scene, world.terrainHeight);
  const visual = createWitnessChronologyScene(scene, world.terrainHeight);
  try {
    const approach = { x: -68.8, z: 100.2 };
    assert.equal(world.isWalkable(approach.x, approach.z), true);
    assert.equal(dressing.collides(approach.x, approach.z, 0.34), false);
    assert.ok(nearestWitnessChronologyStation(approach.x, approach.z, 1));
    assert.ok(visual.group.children.some((mesh) => mesh.name === 'Dated witness source cards'));
    assert.ok(Math.hypot(WITNESS_CHRONOLOGY_STATION.x + 72,
      WITNESS_CHRONOLOGY_STATION.z - 100.2) < 2);
    visual.update(new THREE.Vector3(-300, 0, 0));
    assert.equal(visual.group.visible, false);
    visual.update(new THREE.Vector3(approach.x, 0, approach.z));
    assert.equal(visual.group.visible, true);
  } finally {
    visual.dispose();
  }
});
