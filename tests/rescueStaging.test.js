import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoats, RESCUE_ROUTE, rescueRoutePose, safeLineX } from '../src/boats.js';
import { createWorld } from '../src/world.js';
import { createRescueStaging } from '../src/rescueStaging.js';
import { createIslandPeople } from '../src/islandPeople.js';

test('rescue launch follows the verified bearing and stays over sea through the north berth', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  for (const fraction of [0, 0.125, 0.25, 0.375, 0.5]) {
    const point = rescueRoutePose(fraction);
    assert.ok(Math.abs(point.x - safeLineX(point.z)) < 0.000001,
      'the outer half of the route must stay on the surveyed bearing');
  }
  for (let i = 0; i <= 100; i++) {
    const point = rescueRoutePose(i / 100);
    assert.equal(world.isWalkable(point.x, point.z), false,
      `launch must remain at sea at route sample ${i}`);
    assert.ok(world.terrainHeight(point.x, point.z) < 0,
      `hull must not cross exposed island terrain at route sample ${i}`);
  }
  const berth = rescueRoutePose(1);
  assert.equal(berth.x, RESCUE_ROUTE.berthX);
  assert.equal(berth.z, RESCUE_ROUTE.berthZ);
  assert.ok(berth.z < -333, 'final position stays seaward of the jetty tip');
});

test('rescue boat holds offshore until guided, advances at measured speed, pauses, and resumes from save', () => {
  const scene = new THREE.Scene();
  const boat = createBoats(scene, { load() {
    assert.fail('the north-berth rescue launch should not load the old Blender boat');
  } });
  boat.update(0.1, 0, {});
  assert.equal(boat.rescue.visible, false);
  const hold = { rescueExpected: true, pumpRestored: true, launchWarned: true };
  for (let i = 0; i < 120; i++) boat.update(0.1, i * 0.1, hold, () => 0.05);
  assert.equal(boat.rescuePhase, 'holding');
  assert.equal(boat.rescue.visible, true);
  assert.equal(boat.rescueProgress, 0);
  const berthRipples = boat.rescue.getObjectByName('Rescue launch moored waterline ripples');
  assert.ok(berthRipples);
  assert.equal(berthRipples.visible, false);
  assert.ok(boat.rescue.children.some((child) => child.name === 'Rescue launch broken wake'
    && child.visible === false));
  const guided = { ...hold, launchGuided: true };
  for (let i = 0; i < 200; i++) boat.update(0.1, 12 + i * 0.1, guided, () => 0.05);
  assert.ok(boat.rescueProgress > 0.26 && boat.rescueProgress < 0.27);
  assert.equal(boat.rescuePhase, 'approaching');
  assert.equal(berthRipples.visible, false);
  const middle = boat.snapshot();
  boat.update(0, 33, guided, () => 0.05);
  assert.deepEqual(boat.snapshot(), middle, 'zero gameplay delta freezes the boat');
  const resumed = createBoats(new THREE.Scene(), { load() {} });
  resumed.restore(middle);
  resumed.update(0, 33, guided, () => 0.05);
  assert.equal(resumed.rescueProgress, middle.motionSeconds / RESCUE_ROUTE.approachSeconds);
  for (let i = 0; i < 580; i++) resumed.update(0.1, 34 + i * 0.1, guided, () => 0.05);
  assert.equal(resumed.rescuePhase, 'berthed');
  assert.equal(resumed.rescue.getObjectByName('Rescue launch moored waterline ripples').visible,
    true, 'a subtle contact ripple grounds the boat in the inlet at berth');
  assert.equal(resumed.rescueProgress, 1);
  assert.equal(resumed.rescue.position.x, RESCUE_ROUTE.berthX);
  assert.equal(resumed.rescue.position.z, RESCUE_ROUTE.berthZ);
  const daybreak = createBoats(new THREE.Scene(), { load() {} });
  daybreak.update(0, 0, { rescueExpected: true, irisRescued: true }, () => 0.05);
  assert.equal(daybreak.rescuePhase, 'berthed',
    'a Chapter 6 preset with Iris already rescued starts after the arrival');
});

test('hatch sight glass drains visibly and Iris emerges once through the existing NPC', () => {
  const scene = new THREE.Scene();
  const terrainHeight = (x, z) => 33 + (x - 167) * 0.07 + (z - 150) * 0.04;
  const hatch = new THREE.Group();
  const lid = new THREE.Group();
  hatch.add(lid);
  const stage = createRescueStaging(scene, terrainHeight, hatch);
  const irisLoader = { load(path, onLoad) {
    assert.match(path, /assets\/iris\.glb$/);
    const asset = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.66, 0.2),
      new THREE.MeshStandardMaterial());
    body.position.y = 0.93; // The source mesh floor is 0.1 m above its origin.
    asset.add(body);
    onLoad({ scene: asset });
  } };
  const people = createIslandPeople(scene, terrainHeight, { irisLoader });
  const iris = people.figures.get('iris');
  assert.ok(iris);
  const start = {
    chapter: 4, pumpRestored: false, drainFraction: 0,
    tunnelDrained: false, launchGuided: false, irisRescued: false,
  };
  stage.update(0.1, 0, start, iris);
  assert.equal(stage.phase, 'sealed');
  assert.equal(lid.rotation.z, 0);
  const column = stage.group.getObjectByName('Visible tunnel water column');
  const fullHeight = column.scale.y;
  stage.update(0.1, 1, { ...start, pumpRestored: true, drainFraction: 0.5 }, iris);
  assert.ok(column.scale.y < fullHeight);
  stage.update(0.1, 2, { ...start, pumpRestored: true, drainFraction: 1,
    tunnelDrained: true, launchGuided: true }, iris);
  assert.ok(column.scale.y < fullHeight / 4);
  people.update(2, { chapter: 4, foundIds: new Set(['iris_rescued']),
    playerX: 167, playerZ: 150 });
  assert.equal(iris.figure.name, 'Iris CC0 character');
  const opened = { ...start, pumpRestored: true, drainFraction: 1,
    tunnelDrained: true, launchGuided: true, irisRescued: true };
  stage.update(0, 2, { ...opened, paused: true }, iris);
  assert.equal(stage.emergenceSeconds, 0);
  assert.equal(lid.rotation.z, 0, 'the clue modal must not consume the reveal');
  assert.ok(iris.root.position.y < terrainHeight(167, 150));
  for (let i = 0; i < 30; i++) {
    people.update(3 + i * 0.1, { chapter: 4, foundIds: new Set(['iris_rescued']) });
    stage.update(0.1, 3 + i * 0.1, opened, iris);
  }
  assert.equal(stage.phase, 'emerging');
  assert.ok(lid.rotation.z > 1, 'the physical hatch lid must open before Iris climbs out');
  const save = stage.snapshot();
  assert.ok(save.seconds > 2.9 && save.seconds < 3.1);
  const restored = createRescueStaging(new THREE.Scene(), terrainHeight, hatch);
  restored.restore(save);
  assert.ok(restored.emergenceSeconds > 2.9);
  for (let i = 0; i < 90; i++) {
    people.update(6 + i * 0.1, { chapter: 4, foundIds: new Set(['iris_rescued']) });
    stage.update(0.1, 6 + i * 0.1, opened, iris);
    if (stage.phase === 'walking') {
      assert.ok(Math.abs(iris.figure.position.y - iris.figure.userData.baseY) <= 0.0241,
        'the rescue walk must retain the GLB ground offset');
    }
  }
  assert.equal(stage.phase, 'ready');
  assert.deepEqual([iris.root.position.x, iris.root.position.z], [176, 157]);
  assert.equal(iris.ring.visible, true);
  assert.equal(lid.rotation.z, 1.1);
  people.dispose();
  stage.dispose();
  restored.dispose();
});

test('service gate hardware follows each saved hatch release step without advancing in a modal', () => {
  const stage = createRescueStaging(new THREE.Scene(), () => 33);
  const bleed = stage.group.getObjectByName('Service gate bleed handwheel');
  const keeper = stage.group.getObjectByName('Service gate keeper pin');
  const release = stage.group.getObjectByName('Service gate release handwheel');
  const bolt = stage.group.getObjectByName('Service gate outer bolt');
  assert.ok(bleed && keeper && release && bolt);
  stage.group.updateWorldMatrix(true, true);
  for (const control of [bleed, keeper, release, bolt]) {
    const at = control.getWorldPosition(new THREE.Vector3());
    const angleFromApproach = Math.atan2(Math.abs(at.x - 167), 151.3 - at.z);
    assert.ok(angleFromApproach < 0.55,
      `${control.name} must stay near the hatch in the normal south-facing view`);
    assert.ok(at.z < 149.4 && at.y > 34.1,
      `${control.name} must sit above and beyond the north rail, not under the player's feet`);
  }
  const initial = { bleed: bleed.rotation.z, keeper: keeper.position.x,
    release: release.rotation.z, bolt: bolt.position.x };
  const context = { chapter: 4, pumpRestored: true, tunnelDrained: true,
    launchGuided: true, hatch: {} };
  stage.update(0, 0, context);
  stage.update(0.1, 1, { ...context, hatch: { pressureEqualized: true }, paused: true });
  assert.equal(bleed.rotation.z, initial.bleed,
    'opening the modal does not move the bleed handwheel');
  for (let i = 0; i < 5; i++) stage.update(0.1, 2 + i * 0.1,
    { ...context, hatch: { pressureEqualized: true } });
  assert.ok(bleed.rotation.z > 1.7);
  assert.equal(keeper.position.x, initial.keeper);
  assert.equal(release.rotation.z, initial.release);
  for (let i = 0; i < 5; i++) stage.update(0.1, 3 + i * 0.1,
    { ...context, hatch: { pressureEqualized: true, jamCleared: true } });
  assert.ok(keeper.position.x < initial.keeper - 0.2);
  assert.equal(bolt.position.x, initial.bolt);
  for (let i = 0; i < 5; i++) stage.update(0.1, 4 + i * 0.1,
    { ...context, hatch: { pressureEqualized: true, jamCleared: true,
      boltReleased: true } });
  assert.ok(release.rotation.z > 2.1);
  assert.ok(bolt.position.x > initial.bolt + 0.2);

  const restored = createRescueStaging(new THREE.Scene(), () => 33);
  restored.restore(stage.snapshot());
  restored.update(0, 6, { ...context, hatch: { pressureEqualized: true,
    jamCleared: true, boltReleased: true }, paused: true });
  assert.equal(restored.group.getObjectByName('Service gate bleed handwheel').rotation.z,
    bleed.rotation.z, 'committed hatch state is visible immediately after reload');
  assert.equal(restored.group.getObjectByName('Service gate keeper pin').position.x,
    keeper.position.x);
  assert.equal(restored.group.getObjectByName('Service gate outer bolt').position.x,
    bolt.position.x);
  stage.dispose();
  restored.dispose();
});

test('only the hinged hatch lid rotates inside the real evidence prop wrapper', () => {
  const evidence = new THREE.Group();
  const visual = new THREE.Group();
  visual.name = 'Open service hatch model';
  const lid = new THREE.Group();
  visual.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1.5),
    new THREE.MeshStandardMaterial()));
  visual.add(lid);
  evidence.add(visual);
  const stage = createRescueStaging(new THREE.Scene(), () => 33, evidence);
  stage.update(0, 0, { chapter: 4, irisRescued: true, paused: true });
  stage.update(0.1, 1, { chapter: 4, irisRescued: true });
  assert.equal(visual.rotation.z, 0, 'the fixed frame does not tilt with the gate');
  assert.ok(lid.rotation.z > 0, 'the hinged lid begins opening');
  stage.dispose();
});
