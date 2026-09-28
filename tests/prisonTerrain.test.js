import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';

test('the prison approach and yard rise continuously without an earth wall at the gate', () => {
  const world = createWorld(new THREE.Scene(), new THREE.PerspectiveCamera());
  const path = [[-127, 127], [-97, 119], [-78, 113], [-58, 112], [-58, 105],
    [-58, 98], [-58, 90], [-58, 85], [-40, 70]];
  const heights = path.map(([x, z]) => world.terrainHeight(x, z));
  assert.ok(path.every(([x, z]) => world.isWalkable(x, z)));
  assert.ok(heights.every(Number.isFinite));
  for (let i = 1; i < heights.length; i += 1) {
    assert.ok(Math.abs(heights[i] - heights[i - 1]) < 5,
      `terrain step ${i - 1}→${i} is ${heights[i] - heights[i - 1]} m`);
  }
  assert.ok(Math.abs(heights.at(-1) - heights.at(-2)) < 2);
});
