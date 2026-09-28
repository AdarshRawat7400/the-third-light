import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRainEffects } from '../src/rainEffects.js';

test('storm splash uploads cover every visible vertex and no reserved inactive impacts', () => {
  const originalRandom = Math.random;
  let seed = 0x12345678;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1000);
    camera.position.set(0, 31, 0);
    const rain = createRainEffects(scene, camera, () => 30, () => 0.055);
    for (let frame = 0; frame < 600; frame++) rain.update(1 / 60, frame / 60, 'storm');
    const ripple = scene.children.find((object) => object.name === 'Rain ground ripples');
    const fleck = scene.children.find((object) => object.name === 'Rain impact flecks');
    const rippleIndices = ripple.geometry.drawRange.count;
    const fleckPoints = fleck.geometry.drawRange.count;
    assert.ok(ripple.visible && fleck.visible);
    assert.ok(fleckPoints > 60 && fleckPoints < 510);
    assert.equal(rippleIndices, fleckPoints * 28);
    const checkRange = (mesh, name, expected) => {
      const attribute = mesh.geometry.getAttribute(name);
      assert.equal(attribute.updateRanges.length, 1);
      assert.equal(attribute.updateRanges[0].start, 0);
      assert.equal(attribute.updateRanges[0].count, expected);
      assert.ok(expected < attribute.array.length, `${name} still uploads its entire reserve`);
      for (let i = 0; i < expected; i++) {
        assert.ok(Number.isFinite(attribute.array[i]), `${name}[${i}] is non-finite`);
      }
    };
    checkRange(ripple, 'position', rippleIndices);
    checkRange(ripple, 'aAlpha', rippleIndices / 3);
    checkRange(fleck, 'position', fleckPoints * 3);
    checkRange(fleck, 'aAlpha', fleckPoints);
    checkRange(fleck, 'aSize', fleckPoints);
    rain.dispose();
  } finally {
    Math.random = originalRandom;
  }
});
