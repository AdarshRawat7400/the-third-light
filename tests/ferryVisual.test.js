import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoats } from '../src/boats.js';
import { createFerryVisual, createRescueLaunchVisual } from '../src/ferryVisual.js';

test('passenger ferry fits the south berth with a clear forward arrival view', () => {
  const ferry = createFerryVisual();
  const bounds = new THREE.Box3().setFromObject(ferry);
  assert.ok(bounds.max.x - bounds.min.x < 5.1, 'fenders fit beside the east pier');
  assert.ok(bounds.max.z - bounds.min.z < 12, 'ferry remains a small island service vessel');
  assert.ok(bounds.max.y > 4, 'raised wheelhouse and mast create a ferry silhouette');
  assert.ok(ferry.getObjectByName('Continuous navy sheer stripe'));
  assert.ok(ferry.getObjectByName('Weathered red boot stripe'));

  const forward = new THREE.Raycaster(
    new THREE.Vector3(0.16, 1.82, 2.45), new THREE.Vector3(0, 0, 1), 0, 3.5,
  );
  assert.equal(forward.intersectObject(ferry, true).length, 0,
    'island remains visible ahead of the playable deck camera');

  let meshes = 0, triangles = 0;
  ferry.traverse((child) => {
    if (!child.isMesh) return;
    meshes++;
    triangles += child.geometry.index
      ? child.geometry.index.count / 3 : child.geometry.attributes.position.count / 3;
  });
  assert.ok(meshes <= 60 && triangles <= 3500,
    'rail batching keeps the ferry suitable for browser rendering');

  const boats = createBoats(new THREE.Scene(), { load() {} });
  assert.equal(boats.arrival.position.x, 6);
  assert.equal(boats.arrival.position.z, 352);
  assert.ok(boats.arrival.children.some((child) => child.name === ferry.name));
});

test('the north berth uses a detailed rescue craft with the same weathered finish', () => {
  const launch = createRescueLaunchVisual();
  const bounds = new THREE.Box3().setFromObject(launch);
  assert.ok(bounds.max.x - bounds.min.x < 3, 'launch fits beside the narrow jetty');
  assert.ok(bounds.max.z - bounds.min.z < 8, 'the rescue boat remains smaller than the ferry');
  assert.ok(bounds.max.y > 4, 'mast and working cabin remain visible at the berth');
  for (const name of [
    'Weathered rescue-launch steel hull', 'Rescue launch painted sheer stripe',
    'Rescue launch rusted boot stripe', 'CC0 timber rescue working deck',
    'Rescue launch low wheelhouse', 'Rescue launch hull nameplate',
    'Forward rescue equipment locker',
  ]) assert.ok(launch.getObjectByName(name), `${name} is visible`);
  const hull = launch.getObjectByName('Weathered rescue-launch steel hull');
  const deck = launch.getObjectByName('CC0 timber rescue working deck');
  assert.ok(hull.material.map, 'the launch has authored weathered paint');
  // The CC0 image maps are browser-loaded; Node uses the authored procedural
  // maps without a DOM image loader.
  if (typeof document !== 'undefined') {
    assert.ok(hull.material.normalMap && hull.material.roughnessMap,
      'CC0 pitting and roughness are applied to the launch hull');
  }
  assert.ok(deck.material.map, 'the launch shares the credited CC0 timber material');
  let meshes = 0, triangles = 0;
  launch.traverse((child) => {
    if (!child.isMesh) return;
    meshes++;
    triangles += (child.geometry.index?.count
      ?? child.geometry.attributes.position.count) / 3;
  });
  assert.ok(meshes <= 50 && triangles <= 2500,
    'fittings stay within the working browser draw budget');
  const boats = createBoats(new THREE.Scene(), { load() {
    assert.fail('the rescue vessel must not request the legacy GLB');
  } });
  assert.equal(boats.rescue.getObjectByName(launch.name)?.name, launch.name);
});
