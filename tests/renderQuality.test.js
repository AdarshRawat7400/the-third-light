import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGrass } from '../src/grass/WindSweptGrass.js';
import { createWorld } from '../src/world.js';
import {
  DESKTOP_RENDER_PROFILE, detectRenderEnvironment, selectRenderProfile,
} from '../src/renderQuality.js';

test('desktop quality remains identical and touch hardware gets bounded profiles', () => {
  assert.equal(selectRenderProfile().tier, 'desktop');
  assert.equal(DESKTOP_RENDER_PROFILE.pixelRatioCap, 1.6);
  assert.equal(DESKTOP_RENDER_PROFILE.grassQuality, 76_000);
  assert.equal(DESKTOP_RENDER_PROFILE.grassDensityMultiplier, 10);
  assert.equal(DESKTOP_RENDER_PROFILE.shadowMapSize, 2048);
  assert.equal(DESKTOP_RENDER_PROFILE.cloudStepCap, 8);

  const iPhone = detectRenderEnvironment({
    innerWidth: 844, innerHeight: 390, devicePixelRatio: 3,
    navigator: { userAgent: 'iPhone', maxTouchPoints: 5,
      hardwareConcurrency: 6 },
    matchMedia: () => ({ matches: true }),
  });
  assert.equal(iPhone.mobile, true);
  assert.equal(selectRenderProfile(iPhone).tier, 'mobile-standard');
  assert.equal(selectRenderProfile({ mobile: true, deviceMemory: 8,
    hardwareConcurrency: 8 }).tier, 'mobile-high');
  assert.equal(selectRenderProfile({ mobile: true, deviceMemory: 2,
    hardwareConcurrency: 8 }).tier, 'mobile-constrained');
  assert.equal(selectRenderProfile({ mobile: true, deviceMemory: 8,
    hardwareConcurrency: 4 }).tier, 'mobile-constrained');
  assert.equal(detectRenderEnvironment({ innerWidth: 1440, innerHeight: 900,
    navigator: { userAgent: 'Desktop Chrome', maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false }) }).mobile, false);
});

test('mobile world profile changes shadow and cloud work without moving island facts', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { innerWidth: 900, devicePixelRatio: 1 };
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const profile = selectRenderProfile({ mobile: true, deviceMemory: 2 });
    const world = createWorld(scene, camera, { renderProfile: profile });
    const sun = scene.children.find((child) => child.isDirectionalLight);
    const sky = scene.getObjectByName('Procedural volumetric storm clouds');
    assert.equal(sun.shadow.mapSize.x, 512);
    assert.equal(sun.shadow.mapSize.y, 512);
    world.update(0.016, 1, 'mist');
    assert.equal(sky.material.uniforms.uSteps.value, 4);
    assert.equal(world.isWalkable(0, 270), true);
    assert.ok(world.terrainHeight(-90, 185) > world.terrainHeight(0, 270));
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('constrained mobile meadow authors fewer clusters with the same coverage rules', () => {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({
    clearRect() {}, fillRect() {},
    createRadialGradient: () => ({ addColorStop() {} }),
  }) }) };
  const terrain = {
    size: 704, heightAt: () => 24,
    normalAt: (_x, _z, target) => target.set(0, 1, 0),
    isPath: () => false,
    path: { width: 7.5, shoulderWidth: 12.5,
      nearest: () => ({ distance: 100 }) },
  };
  let desktop;
  let mobile;
  try {
    desktop = createGrass({ terrain, quality: 76_000, densityMultiplier: 10 });
    mobile = createGrass({ terrain, quality: 18_000, densityMultiplier: 4 });
    assert.ok(mobile.meadowTuftCount < desktop.meadowTuftCount);
    assert.ok(mobile.detailBladeCount < desktop.detailBladeCount);
    assert.equal(desktop.densityMultiplier, 10);
    assert.equal(mobile.densityMultiplier, 4);
  } finally {
    desktop?.dispose();
    mobile?.dispose();
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
