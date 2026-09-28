import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { SITES } from '../src/story.js';
import { createSetDressing, PRISON_LAYOUT } from '../src/setDressing.js';
import { createDriving } from '../src/driving.js';
import { buildingWallBlocks, circlesBlock } from '../src/collision.js';

const scene = new THREE.Scene();
const world = createWorld(scene, new THREE.Camera());
const dressing = createSetDressing(scene, world.terrainHeight);

test('prison is a substantial destination on the island with a walkable approach', () => {
  const { bounds, approach, cellBlock } = PRISON_LAYOUT;
  assert.ok((bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ) > 10_000);
  assert.ok(cellBlock.width > 55 && cellBlock.depth > 20);
  for (let i = 1; i < approach.length; i++) {
    const [ax, az] = approach[i - 1], [bx, bz] = approach[i];
    for (let k = 0; k <= 10; k++) {
      const x = ax + (bx - ax) * k / 10;
      const z = az + (bz - az) * k / 10;
      assert.ok(world.isWalkable(x, z), `access spur off-island at ${x}, ${z}`);
      assert.equal(dressing.collides(x, z), false, `access spur blocked at ${x}, ${z}`);
    }
  }
  for (const site of SITES) {
    assert.equal(dressing.collides(site.x, site.z), false, `${site.name} is trapped by new dressing`);
  }
});

test('the open gate, yard, main entry, corridor and one cell can be traversed', () => {
  for (const [x, z] of [[-58, 108], [-58, 105], [-58, 102], [-58, 99],
    [-40, 68], [-39, 38], [-39, 36], [-39, 30], [-39, 26],
    [-60, 26], [-60, 28.1], [-60, 31]]) {
    assert.equal(dressing.collides(x, z, 0.32), false, `${x},${z} should be passable`);
  }
  for (const [x, z] of [[-50, 105], [-90, 55], [-40, 15], [-40, 37 + 0.01],
    [-67, 28.1], [-60, 23.9]]) {
    // The central main doorway is intentionally open; test the neighboring
    // front-wall position instead of that opening.
    if (x === -40 && z > 37) continue;
    assert.equal(dressing.collides(x, z, 0.32), true, `${x},${z} should be solid`);
  }
  assert.equal(dressing.collides(-28, 37), true, 'cell-block frontage is solid away from doorway');
});

test('each watchtower stone plinth blocks its exposed inner corner without sealing the yard', () => {
  const bases = dressing.colliders.filter((collider) => collider.id === 'prison_watchtower_base');
  assert.equal(bases.length, 4);
  for (const base of bases) {
    assert.equal(base.width, 4.2);
    assert.equal(base.depth, 4.2);
    const inwardX = base.x < 0 ? 1 : -1;
    const inwardZ = base.z < 50 ? 1 : -1;
    assert.equal(dressing.collides(base.x + inwardX * 1.3,
      base.z + inwardZ * 1.3, 0.32), true,
    `pass-through at watchtower ${base.x},${base.z}`);
  }
  for (const [x, z] of [[-58, 108], [-58, 105], [-58, 102], [-58, 99],
    [-40, 68], [-40, 41], [-40, 26]]) {
    assert.equal(dressing.collides(x, z, 0.32), false,
      `watchtower collider must leave story route open at ${x},${z}`);
  }
});

test('folded gate leaves match the visible rails and keep the central entrance open', () => {
  const leaves = dressing.colliders.filter((collider) => collider.id === 'prison_gate_leaf');
  assert.equal(leaves.length, 2);
  for (const leaf of leaves) {
    assert.equal(leaf.width, 3);
    assert.ok(Math.abs(leaf.rotation) > 1,
      'folded leaf collision must follow its rendered rotation');
    assert.equal(dressing.collides(leaf.x, leaf.z, 0.32), true,
      `the player should not pass through gate leaf at ${leaf.x},${leaf.z}`);
  }
  for (let z = 108; z >= 99; z -= 0.25) {
    assert.equal(dressing.collides(PRISON_LAYOUT.gate.x, z, 0.32), false,
      `gate route sealed at ${z}`);
  }
});

test('the full gate-to-cell-block yard route remains walkable between landmarks', () => {
  const route = [[-58, 112], [-58, 99], [-40, 41], [-40, 26]];
  for (let segment = 1; segment < route.length; segment++) {
    const [ax, az] = route[segment - 1], [bx, bz] = route[segment];
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25);
    for (let i = 0; i <= steps; i++) {
      const x = ax + (bx - ax) * i / steps;
      const z = az + (bz - az) * i / steps;
      assert.ok(world.isWalkable(x, z), `route leaves island at ${x},${z}`);
      assert.equal(dressing.collides(x, z, 0.32), false,
        `route blocked by prison dressing at ${x},${z}`);
    }
  }
});

test('the cell-block entrance opens straight into its central corridor', () => {
  for (let z = 41; z >= 24.5; z -= 0.25) {
    assert.equal(dressing.collides(-40, z, 0.32), false,
      `central entrance obstructed at -40,${z}`);
  }
});

test('opaque ceilings cover the prison rooms from below', () => {
  const samples = [
    { x: -57.3, z: 26, roofY: dressing.prison.roofY },
    { x: -37.2, z: 26, roofY: dressing.prison.roofY },
    { x: -17.2, z: 26, roofY: dressing.prison.roofY },
    { x: -59, z: 31, roofY: dressing.prison.roofY },
    { x: -53.3, z: 20, roofY: dressing.prison.roofY },
    { x: dressing.clinic.x + 2, z: dressing.clinic.z + 2,
      roofY: dressing.clinic.roofY },
    { x: dressing.administration.x + 2, z: dressing.administration.z + 2,
      roofY: dressing.administration.roofY },
  ];
  for (const { x, z, roofY } of samples) {
    const eyeY = world.terrainHeight(x, z) + 1.7;
    const ray = new THREE.Raycaster(new THREE.Vector3(x, eyeY, z),
      new THREE.Vector3(0, 1, 0), 0.02, roofY + 1 - eyeY);
    const solidCover = ray.intersectObject(dressing.group, true).some((hit) =>
      hit.point.y > eyeY + 1.5 && hit.point.y < roofY + 0.2 &&
      !hit.object.material.transparent);
    assert.ok(solidCover, `sky visible above prison interior at ${x},${z}`);
  }
});

test('shelter query covers the prison interiors, not the yard or gate', () => {
  for (const site of [PRISON_LAYOUT.cellBlock, PRISON_LAYOUT.clinic,
    PRISON_LAYOUT.administration]) {
    assert.ok(dressing.isSheltered(site.x, site.z), `${site.x},${site.z} roof missing`);
  }
  assert.equal(dressing.isSheltered(-40, 67), false);
  assert.equal(dressing.isSheltered(-58, 105), false);
});

test('all three original period vehicles have matching collision footprints', () => {
  assert.deepEqual(dressing.vehicles.map(v => v.id),
    ['staff_car', 'transport', 'service_wagon']);
  for (const vehicle of dressing.vehicles) {
    assert.ok(world.isWalkable(vehicle.x, vehicle.z));
    assert.equal(dressing.collides(vehicle.x, vehicle.z), true, vehicle.id);
    assert.equal(dressing.collides(vehicle.x, vehicle.z, 0.32, vehicle.id), false,
      `${vehicle.id} must be excluded from its own collision test`);
    assert.ok(vehicle.width >= 2 && vehicle.length >= 5, vehicle.id);
    assert.equal(vehicle.group.parent, dressing.group, `${vehicle.id} must remain movable`);
    assert.equal(vehicle.group.position.x, vehicle.x);
    assert.equal(vehicle.group.position.z, vehicle.z);
    assert.equal(vehicle.group.children.filter((part) => part.isInstancedMesh).length, 4,
      `${vehicle.id} wheels and brake lamps should be instanced`);
  }
  assert.equal(dressing.collides(-34, 126), false, 'car collider must not extend down the road');
});

test('each parked car has a usable first metre of driving space', () => {
  const drive = createDriving(dressing.vehicles, world.terrainHeight);
  const canPlace = (x, z, vehicle, radius) => world.isWalkable(x, z)
    && !SITES.some((site) => buildingWallBlocks(site, x, z, radius))
    && !circlesBlock(x, z, radius, world.natureObstacles)
    && !dressing.collides(x, z, radius, vehicle.id);
  for (const vehicle of dressing.vehicles) {
    assert.equal(drive.enter(vehicle.id), true);
    const startX = vehicle.x, startZ = vehicle.z;
    for (let i = 0; i < 60; i++) drive.update(1 / 60, { throttle: 1 }, canPlace);
    assert.ok(Math.hypot(vehicle.x - startX, vehicle.z - startZ) > 0.8,
      `${vehicle.id} cannot leave its parking place`);
    vehicle.speed = 0;
    assert.ok(drive.exit(() => true));
  }
});

test('static geometry is batched for desktop rendering', () => {
  let meshes = 0, triangles = 0;
  dressing.group.traverse((object) => {
    if (!object.isMesh) return;
    meshes++;
    const count = object.geometry.index?.count ?? object.geometry.attributes.position.count;
    triangles += count / 3 * (object.isInstancedMesh ? object.count : 1);
    const pos = object.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      assert.ok(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) &&
        Number.isFinite(pos.getZ(i)), 'non-finite prison mesh vertex');
    }
  });
  // The prison stays batched; each movable car needs its own body materials
  // and three instanced wheel layers rather than being welded to the yard.
  assert.ok(meshes <= 55, `too many prison and moving-car draw calls: ${meshes}`);
  assert.ok(triangles < 70_000, `too many prison triangles: ${triangles}`);
  assert.ok(dressing.materialBatches > 5);
});
