import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createAmbientTraffic } from '../src/ambientTraffic.js';
import { isRoad } from '../src/roads.js';

const flatTerrain = () => 42;
const context = (overrides = {}) => ({
  playerX: 0, playerZ: 270, weather: 'mist', chapter: 0, ...overrides,
});
const pointAhead = (vehicle, distance) => {
  const wanted = vehicle.progress + vehicle.direction * distance;
  return vehicle.path.samples.reduce((closest, sample) =>
    Math.abs(sample.distance - wanted) < Math.abs(closest.distance - wanted)
      ? sample : closest);
};

test('at most two original staff cars follow the drawn roads with seated drivers', () => {
  const scene = new THREE.Scene();
  const traffic = createAmbientTraffic(scene, flatTerrain);
  traffic.update(0.05, context({ playerX: -128, playerZ: 126 }));
  assert.ok(scene.children.includes(traffic.group));
  assert.equal(traffic.vehicles.filter((vehicle) => vehicle.visible).length, 2);
  assert.equal(traffic.vehicles[0].visible, true, 'the archive car is visible from the QA overlook');
  assert.ok(traffic.vehicles[0].group.children.some((part) => part.isMesh &&
    part.geometry.type === 'SphereGeometry'), 'driver face/head geometry is present');
  const first = traffic.vehicles[0];
  const start = { x: first.x, z: first.z };
  for (let i = 0; i < 160; i++) {
    traffic.update(0.05, context());
    for (const vehicle of traffic.vehicles.filter((candidate) => candidate.visible)) {
      assert.ok(isRoad(vehicle.x, vehicle.z, 0.3), `${vehicle.id} left the gravel road`);
      assert.ok([vehicle.x, vehicle.y, vehicle.z, vehicle.heading].every(Number.isFinite));
    }
  }
  assert.ok(Math.hypot(first.x - start.x, first.z - start.z) > 20);
  const paused = { x: first.x, z: first.z };
  traffic.update(0, context());
  assert.deepEqual({ x: first.x, z: first.z }, paused);
  traffic.dispose();
  assert.ok(!scene.children.includes(traffic.group));
});

test('a car does not appear on top of the player and waits to reactivate out of sight', () => {
  const traffic = createAmbientTraffic(new THREE.Scene(), flatTerrain);
  const archive = traffic.vehicles[0];
  traffic.update(0.05, context({ playerX: archive.x, playerZ: archive.z }));
  assert.equal(archive.visible, false);
  traffic.update(0.05, context({ playerX: archive.x + 30, playerZ: archive.z }));
  assert.equal(archive.visible, false, 'reactivation must not pop in nearby');
  traffic.update(0.05, context());
  assert.equal(archive.visible, true);
  traffic.dispose();
});

test('the road car brakes for the player and for a stopped player-owned car', () => {
  const parked = [];
  const traffic = createAmbientTraffic(new THREE.Scene(), flatTerrain, { parkedVehicles: parked });
  traffic.update(0.05, context());
  const archive = traffic.vehicles[0];
  const pedestrian = pointAhead(archive, 18);
  for (let i = 0; i < 240; i++) {
    traffic.update(0.05, context({ playerX: pedestrian.x, playerZ: pedestrian.z }));
  }
  assert.ok(Math.hypot(archive.x - pedestrian.x, archive.z - pedestrian.z) > 5,
    'the moving car did not reach the pedestrian');
  assert.ok(archive.speed < 0.15, 'the car came to a stop for the pedestrian');
  traffic.dispose();

  const parkedTraffic = createAmbientTraffic(new THREE.Scene(), flatTerrain,
    { parkedVehicles: parked });
  parkedTraffic.update(0.05, context());
  const moving = parkedTraffic.vehicles[0];
  const obstruction = pointAhead(moving, 18);
  parked.push({ id: 'player-car', x: obstruction.x, z: obstruction.z,
    length: 5.15, width: 2.18 });
  for (let i = 0; i < 240; i++) parkedTraffic.update(0.05, context());
  assert.ok(Math.hypot(moving.x - obstruction.x, moving.z - obstruction.z) > 6,
    'the service car kept a gap from the player-owned car');
  assert.ok(moving.speed < 0.15);
  parkedTraffic.dispose();
});

test('cars arrive at road ends and turn only when the player is distant', () => {
  const traffic = createAmbientTraffic(new THREE.Scene(), flatTerrain);
  traffic.update(0.05, context());
  const archive = traffic.vehicles[0];
  const originalDirection = archive.direction;
  // The observer is off the route but close enough to witness a turnaround.
  const observing = context({ playerX: -110, playerZ: 60 });
  for (let i = 0; i < 520; i++) traffic.update(0.05, observing);
  assert.equal(archive.direction, originalDirection);
  assert.ok(archive.turnaroundWait > 0);
  assert.equal(archive.speed, 0);
  for (let i = 0; i < 30; i++) traffic.update(0.05, context());
  assert.equal(archive.direction, -originalDirection,
    'the car reversed only once the endpoint was out of view');
  traffic.dispose();
});

test('storm chapters freeze moving road traffic and retire distant cars', () => {
  const traffic = createAmbientTraffic(new THREE.Scene(), flatTerrain);
  traffic.update(0.05, context());
  for (let i = 0; i < 70; i++) traffic.update(0.05, context());
  const before = traffic.vehicles.map(({ x, z }) => ({ x, z }));
  traffic.update(0.05, context({ weather: 'storm', chapter: 3 }));
  assert.ok(traffic.vehicles.every((vehicle) => vehicle.speed === 0));
  assert.ok(traffic.vehicles.every((vehicle, index) =>
    vehicle.x === before[index].x && vehicle.z === before[index].z));
  assert.equal(traffic.vehicles.filter((vehicle) => vehicle.visible).length, 0);
  traffic.dispose();
});

test('traffic collision uses moving oriented car footprints', () => {
  const traffic = createAmbientTraffic(new THREE.Scene(), flatTerrain);
  traffic.update(0.05, context());
  const car = traffic.vehicles[0];
  assert.ok(traffic.collides(car.x, car.z, 0.3));
  assert.ok(traffic.blocksMove(car.x - 6, car.z, car.x + 6, car.z, 0.3));
  assert.equal(traffic.collides(car.x + 25, car.z + 25, 0.3), false);
  assert.equal(traffic.nearbyVehicle(car.x, car.z, 1)?.vehicle.id, car.id);
  traffic.dispose();
});
