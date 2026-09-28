import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { chapterThreeMist } from '../src/chapterThreeAtmosphere.js';
import { createWorld } from '../src/world.js';

test('Chapter 3 mist moves across survey stakes and north inlet without a timed capture gate', () => {
  for (const [x, z] of [[-186, -120], [232, -120], [-65, -315]]) {
    const samples = Array.from({ length: 80 }, (_, index) => chapterThreeMist({
      chapter: 2, elapsed: index * 0.5, x, z,
    }));
    assert.ok(Math.max(...samples.map((item) => item.multiplier)) > 1.28);
    assert.ok(Math.min(...samples.map((item) => item.multiplier)) < 0.87);
    assert.ok(samples.every((item) => item.cue.includes('MIST')));
    assert.ok(samples.every((item) => item.multiplier >= 0.68 && item.multiplier <= 1.42));
  }
  assert.deepEqual(chapterThreeMist({ chapter: 1, elapsed: 3, x: -186, z: -120 }),
    { multiplier: 1, strength: 0, cue: '' });
  assert.deepEqual(chapterThreeMist({ chapter: 2, elapsed: 3, x: -186, z: -120, indoors: true }),
    { multiplier: 1, strength: 0, cue: '' });
  assert.deepEqual(chapterThreeMist({ chapter: 2, elapsed: 3, x: 0, z: 270 }),
    { multiplier: 1, strength: 0, cue: '' });
  const nearEdge = chapterThreeMist({ chapter: 2, elapsed: 6, x: -186 + 154.9, z: -120 });
  assert.ok(Math.abs(nearEdge.multiplier - 1) < 0.00001,
    'mist fades smoothly into the base weather at its boundary');
});

test('offshore mist changes scene, sea and surf fog together without altering weather state', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(-186, 45, -120);
  const world = createWorld(scene, camera);
  for (let i = 0; i < 60; i++) world.update(0.1, i * 0.1, 'rain');
  const base = scene.fog.density;
  const sea = scene.getObjectByName('Distant open sea');
  const surf = scene.getObjectByName('Broken shoreline surf');
  const offshore = chapterThreeMist({ chapter: 2, elapsed: 0, x: -186, z: -120 });
  world.update(0.016, 7, 'rain', offshore);
  assert.ok(Math.abs(scene.fog.density - base * offshore.multiplier) < 1e-9);
  assert.equal(sea.material.uniforms.uFogDensity.value, scene.fog.density);
  assert.equal(surf.material.uniforms.uFogDensity.value, scene.fog.density);
  world.update(0.016, 7.016, 'rain');
  assert.equal(scene.fog.density, base);
});
