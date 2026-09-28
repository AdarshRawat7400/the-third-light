import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { createSetDressing, PRISON_LAYOUT } from '../src/setDressing.js';
import { createPrisonPopulation, PRISON_OCCUPANTS } from '../src/prisonPopulation.js';

function fixture() {
  const scene = new THREE.Scene();
  const world = createWorld(scene, new THREE.Camera());
  const dressing = createSetDressing(scene, world.terrainHeight);
  const population = createPrisonPopulation(scene, world.terrainHeight);
  return { scene, world, dressing, population };
}

function populationViews(x, z, lookX, lookZ) {
  const camera = new THREE.PerspectiveCamera(72, 16 / 9, 0.08, 1900);
  camera.position.set(x, 55, z);
  camera.lookAt(lookX, 50, lookZ);
  const shadowLight = new THREE.DirectionalLight();
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -145;
  shadowLight.shadow.camera.right = 145;
  shadowLight.shadow.camera.top = 145;
  shadowLight.shadow.camera.bottom = -145;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 650;
  shadowLight.position.set(x - 170, 280, z - 210);
  shadowLight.target.position.set(x, 0, z);
  return { camera, shadowLight };
}

function personMeshes(population) {
  return population.group.children.filter((mesh) => mesh.name.startsWith('Prison people '));
}

test('staff and detainees occupy actual navigable prison space without closing the investigation route', () => {
  const { world, dressing, population } = fixture();
  assert.equal(PRISON_OCCUPANTS.filter((person) => person.kind === 'guard').length, 4);
  assert.equal(PRISON_OCCUPANTS.filter((person) => person.kind === 'detainee').length, 8);
  for (const person of PRISON_OCCUPANTS) {
    assert.ok(world.isWalkable(person.x, person.z), `${person.id} is outside terrain`);
    assert.equal(dressing.collides(person.x, person.z, 0.4), false,
      `${person.id} overlaps prison architecture`);
    if (person.kind === 'detainee') {
      const cell = PRISON_LAYOUT.cellBlock;
      assert.ok(person.x > cell.x - cell.width / 2 && person.x < cell.x + cell.width / 2);
      assert.ok(person.z > cell.z - cell.depth / 2 && person.z < cell.z + cell.depth / 2);
      assert.ok(person.z < cell.z - 2.1 || person.z > cell.z + 2.1,
        `${person.id} escaped into the corridor`);
    }
  }
  for (const [x, z] of [[-58, 109], [-58, 105], [-58, 101], [-58, 98],
    [-40, 38], [-40, 32], [-40, 26], [-60, 26], [-60, 28.1], [-60, 31]]) {
    assert.equal(population.collides(x, z, 0.35), false,
      `population obstructs gate, ledger, corridor, or open cell at ${x}, ${z}`);
  }
  population.dispose();
});

test('guards are solid at their feet while a player already overlapping can step away', () => {
  const { population } = fixture();
  const guard = PRISON_OCCUPANTS[0];
  assert.equal(population.collides(guard.x, guard.z), true);
  assert.equal(population.blocksMove(guard.x + 1.1, guard.z, guard.x + 0.5, guard.z), true);
  assert.equal(population.blocksMove(guard.x, guard.z, guard.x + 0.6, guard.z), false);
  assert.equal(population.collides(-68, 21.4), false, 'cell bars, rather than prisoner bodies, bound cells');
  population.dispose();
});

test('the accessible cell bunk is solid without closing its doorway or corridor', () => {
  const { population } = fixture();
  assert.equal(population.collides(-60, 26), false, 'central corridor stays open');
  assert.equal(population.collides(-60, 29.5), false, 'open cell doorway stays open');
  assert.equal(population.collides(-40, 33.8), false, 'duty desk leaves entry lane clear');
  assert.equal(population.collides(-46, 33.8), true, 'duty desk is solid');
  assert.equal(population.collides(-60.55, 34.9), true, 'bunk frame blocks walking through it');
  assert.equal(population.blocksMove(-60.55, 33.4, -60.55, 34.4), true);
  assert.equal(population.blocksMove(-60.55, 34.9, -60.55, 33.4), false,
    'a player overlapping the bunk can step away');
  population.dispose();
});

test('detainees remain near their own barred cells and can be addressed from the corridor', () => {
  const { population } = fixture();
  const north = PRISON_OCCUPANTS.find((person) => person.id === 'detainee_n1');
  const south = PRISON_OCCUPANTS.find((person) => person.id === 'detainee_s1');
  for (const elapsed of [0, 7, 31, 126]) {
    population.update(elapsed, { weather: 'storm' });
    const a = population.occupants.find((person) => person.id === north.id);
    const b = population.occupants.find((person) => person.id === south.id);
    assert.ok(Math.abs(a.xNow - north.x) <= 0.49);
    assert.ok(Math.abs(b.xNow - south.x) <= 0.49);
    assert.equal(a.zNow, north.z);
    assert.equal(b.zNow, south.z);
    assert.equal(population.nearestPerson(-68, 25.1)?.id, north.id);
    assert.equal(population.nearestPerson(-68, 27.4)?.id, south.id);
    assert.match(population.nearestPerson(-68, 25.1)?.line ?? '', /.+/);
  }
  assert.equal(population.nearestPerson(0, 0), null);
  population.dispose();
});

test('population animation uses bounded instancing and finite world transforms', () => {
  const { scene, dressing, population } = fixture();
  population.update(49);
  const meshes = population.group.children;
  const people = meshes.filter((mesh) => mesh.name.startsWith('Prison people '));
  const fixtures = meshes.filter((mesh) => mesh.name.startsWith('Prison cell '));
  assert.ok(people.length <= 24, 'workwear detail stays within the population draw-call budget');
  assert.equal(people.find((mesh) => mesh.name === 'Prison people torso')?.geometry.type,
    'LatheGeometry', 'coats use a shaped silhouette');
  const cap = people.find((mesh) => mesh.name === 'Prison people cap');
  const guardCap = new THREE.Matrix4();
  const detaineeCap = new THREE.Matrix4();
  cap.getMatrixAt(0, guardCap);
  cap.getMatrixAt(4, detaineeCap);
  assert.ok(guardCap.determinant() > 0, 'guards wear a distinct cap');
  assert.equal(detaineeCap.determinant(), 0, 'detainees are not drawn wearing guard caps');
  assert.equal(fixtures.length, 4, 'all bunk and wash details use four draw calls');
  assert.deepEqual(fixtures.map((mesh) => mesh.count), [42, 96, 21, 29]);
  for (const mesh of meshes) {
    assert.equal(mesh.isInstancedMesh, true);
    assert.ok(mesh.instanceColor);
    for (let i = 0; i < mesh.count; i++) {
      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(i, matrix);
      assert.ok(matrix.elements.every(Number.isFinite), `${mesh.name} has a broken transform`);
      if (fixtures.includes(mesh)) {
        const position = new THREE.Vector3();
        matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
        const cell = PRISON_LAYOUT.cellBlock;
        assert.ok(position.x > cell.x - cell.width / 2 && position.x < cell.x + cell.width / 2,
          `${mesh.name} leaves the cell block`);
        assert.ok(position.z < cell.z - 2.1 || position.z > cell.z + 2.1,
          `${mesh.name} obstructs the prison corridor`);
        assert.ok(position.y < dressing.prison.roofY - 1,
          `${mesh.name} intersects the roof`);
      }
    }
  }
  population.dispose();
  assert.equal(population.group.parent, null);
  assert.ok(scene.children.every((item) => item !== population.group));
});

test('off-screen poses skip uploads and catch up exactly on the first visible frame', () => {
  const scene = new THREE.Scene();
  const population = createPrisonPopulation(scene, () => 45);
  const reference = createPrisonPopulation(new THREE.Scene(), () => 45);
  const meshes = personMeshes(population);
  const versions = meshes.map((mesh) => mesh.instanceMatrix.version);
  const far = populationViews(350, 350, 350, 450);
  population.update(37, { weather: 'storm', ...far });
  assert.deepEqual(meshes.map((mesh) => mesh.instanceMatrix.version), versions,
    'invisible population does not resend identical or unseen poses');

  const near = populationViews(-30, 140, -30, 57);
  population.update(37, { weather: 'storm', ...near });
  reference.update(37, { weather: 'storm' });
  for (const [index, mesh] of meshes.entries()) {
    assert.equal(mesh.instanceMatrix.version, versions[index] + 1,
      `${mesh.name} uploads on re-entry`);
    assert.deepEqual(mesh.instanceMatrix.array,
      personMeshes(reference)[index].instanceMatrix.array,
      `${mesh.name} matches an unculled pose at the same elapsed time`);
  }
  population.dispose();
  reference.dispose();
  assert.equal(population.group.parent, null);
});

test('shadow-frustum entry updates poses even while the prison stays behind the camera', () => {
  const population = createPrisonPopulation(new THREE.Scene(), () => 45);
  const mesh = personMeshes(population)[0];
  const outside = populationViews(-30, 440, -30, 540);
  const before = mesh.instanceMatrix.version;
  population.update(16, outside);
  assert.equal(outside.shadowLight.shadow.getFrustum().intersectsSphere(mesh.boundingSphere),
    false, 'the sun shadow frustum begins clear of the prison');
  assert.equal(mesh.instanceMatrix.version, before);

  const { camera, shadowLight } = populationViews(-30, 420, -30, 520);
  camera.updateWorldMatrix(true, false);
  const view = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    camera.coordinateSystem, camera.reversedDepth);
  assert.equal(view.intersectsSphere(mesh.boundingSphere), false,
    'the prison is behind the camera in this test');
  population.update(17, { camera, shadowLight });
  assert.equal(shadowLight.shadow.getFrustum().intersectsSphere(mesh.boundingSphere), true,
    'the conservative bound has entered the sun shadow frustum');
  assert.equal(mesh.instanceMatrix.version, before + 1,
    'shadow casters must animate even while outside the camera view');
  population.dispose();
});

test('culling never freezes person locations used by prompts and collision', () => {
  const population = createPrisonPopulation(new THREE.Scene(), () => 45);
  const detainee = population.occupants.find((person) => person.id === 'detainee_n1');
  const previousX = detainee.xNow;
  population.update(31, { weather: 'rain',
    ...populationViews(350, 350, 350, 450) });
  assert.notEqual(detainee.xNow, previousX);
  assert.equal(population.nearestPerson(detainee.xNow, detainee.zNow)?.id, detainee.id);
  const guard = population.occupants.find((person) => person.kind === 'guard');
  assert.equal(population.collides(guard.xNow, guard.zNow), true);
  assert.equal(population.blocksMove(guard.xNow + 1.1, guard.zNow,
    guard.xNow + 0.5, guard.zNow), true);
  population.dispose();
});
