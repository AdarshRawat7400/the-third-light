import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLUES } from '../src/story.js';
import { WITNESS_RADIO_SITE, WITNESS_STATION } from '../src/witnessConfrontation.js';
import { createWitnessTableProps } from '../src/witnessTableProps.js';

test('original worktable occupies a clear part of the radio-house floor', () => {
  const scene = new THREE.Scene();
  const stage = createWitnessTableProps(scene, () => 7.25);
  assert.equal(stage.group.parent, scene);
  assert.equal(stage.group.position.x, WITNESS_RADIO_SITE.x + WITNESS_STATION.x);
  assert.equal(stage.group.position.z, WITNESS_RADIO_SITE.z + WITNESS_STATION.z);
  assert.equal(stage.group.position.y, 7.275);
  const nearby = CLUES.filter((clue) => clue.room === 'radio' && clue.minChapter <= 3);
  for (const clue of nearby) {
    const distance = Math.hypot(clue.x - WITNESS_STATION.x, clue.z - WITNESS_STATION.z);
    assert.ok(distance > 1.45, `worktable crowds ${clue.id}`);
  }
  let meshes = 0;
  stage.group.traverse((object) => { if (object.isMesh) meshes++; });
  assert.ok(meshes > 10 && meshes < 70, `expected compact modeled set, got ${meshes}`);
  stage.dispose();
  assert.equal(stage.group.parent, null);
});

test('papers and lamp respond to saved scene beats without affecting state', () => {
  const stage = createWitnessTableProps(new THREE.Scene(), () => 0);
  const voice = stage.cards.get('voiceCompared');
  const relay = stage.cards.get('relayCompared');
  stage.update({ chapter: 2, inside: 'radio' });
  assert.equal(stage.group.visible, false);
  stage.update({ chapter: 3, inside: 'radio', witness: { voiceCompared: true }, elapsed: 2 });
  assert.equal(stage.group.visible, true);
  assert.ok(voice.position.y > relay.position.y);
  stage.update({ chapter: 3, inside: 'pump', witness: { relayCompared: true }, elapsed: 12 });
  assert.equal(stage.group.visible, false);
  assert.ok(relay.position.y > voice.position.y);
  stage.dispose();
});
