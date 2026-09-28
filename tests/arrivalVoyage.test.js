import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { classifyCoastalStep } from '../src/cliffFall.js';
import {
  ARRIVAL_ROUTE, arrivalFrameSeconds, createArrivalState, createArrivalVoyage,
  restoreArrivalState,
} from '../src/arrivalVoyage.js';

const makeVoyage = () => {
  const scene = new THREE.Scene();
  const loader = { load() { assert.fail('the original ferry should not load a GLB'); } };
  const voyage = createArrivalVoyage(scene, loader, () => 0.055);
  return { scene, voyage };
};

function runFor(voyage, seconds, elapsedOffset = 0) {
  const frames = Math.ceil(seconds * 10);
  for (let i = 0; i < frames; i++) voyage.update(0.1, elapsedOffset + i * 0.1);
}

test('the ferry handoff connects by walkable pier and cove boardwalk to South Landing', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  const pier = (x, z) => Math.abs(x) < 3.8 && z >= 342 && z <= 357;
  const coast = { isWalkable: world.isWalkable, terrainHeight: world.terrainHeight,
    coastalRadius: world.coastalRadius, isPier: pier };
  let from = { x: ARRIVAL_ROUTE.pier.x, z: ARRIVAL_ROUTE.pier.z };
  for (let x = from.x - 0.5; x >= 0; x = Math.max(0, x - 0.5)) {
    const to = { x, z: from.z };
    assert.notEqual(classifyCoastalStep(from, to, coast).kind, 'blocked',
      `pier crossing blocked at x=${x}`);
    from = to;
    if (x === 0) break;
  }
  for (let z = from.z - 0.5; z >= 270; z = Math.max(270, z - 0.5)) {
    const to = { x: 0, z };
    assert.equal(classifyCoastalStep(from, to, coast).kind, 'ground',
      `boardwalk interrupted at z=${z}`);
    from = to;
    if (z === 270) break;
  }
});

test('arrival travels the sea route, holds for independent berth check, then hands off to the pier', () => {
  const { scene, voyage } = makeVoyage();
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  assert.equal(voyage.status, 'idle');
  assert.equal(voyage.boat.visible, false);
  voyage.start();
  assert.ok(scene.children.includes(voyage.boat));
  assert.ok(voyage.boat.getObjectByName('Greywake weathered passenger ferry'));
  assert.equal(voyage.status, 'approach');
  assert.equal(voyage.boat.position.z, ARRIVAL_ROUTE.offshoreZ);
  for (let i = 0; i < 200; i++) {
    voyage.update(0.1, i * 0.1);
    assert.ok(voyage.boat.position.z >= ARRIVAL_ROUTE.holdingZ,
      'the unconfirmed vessel must stay outside the cove');
    assert.equal(world.isWalkable(voyage.boat.position.x, voyage.boat.position.z), false,
      'the player vessel must never traverse the island terrain');
  }
  assert.equal(voyage.status, 'holding');
  assert.equal(voyage.boat.position.z, ARRIVAL_ROUTE.holdingZ);
  assert.equal(voyage.applyAction('arrival.disembark').status, 'blocked');
  runFor(voyage, 15, 20);
  assert.equal(voyage.boat.position.z, ARRIVAL_ROUTE.holdingZ,
    'elapsed time alone cannot unlock the berth');
  assert.equal(voyage.applyAction('arrival.confirm.pilot').event, 'arrival_pier_verified');
  assert.equal(voyage.status, 'berthing');
  for (let i = 0; i < 150 && voyage.status !== 'stalled'; i++) {
    voyage.update(0.1, 35 + i * 0.1);
    assert.equal(world.isWalkable(voyage.boat.position.x, voyage.boat.position.z), false);
  }
  assert.equal(voyage.status, 'stalled');
  assert.equal(voyage.boat.position.z, ARRIVAL_ROUTE.snagZ);
  const bowFoam = voyage.boat.getObjectByName('Snagged bow cross-swell foam');
  assert.ok(bowFoam.visible, 'the held bow has a visible water impact cue');
  scene.updateMatrixWorld(true);
  const buoy = scene.getObjectByName('Old mooring buoy float');
  const pose = voyage.cameraPose();
  const eye = new THREE.Vector3(pose.position.x, pose.position.y, pose.position.z);
  const buoyTop = buoy.localToWorld(new THREE.Vector3(0, 0.28, 0));
  const toBuoy = buoyTop.clone().sub(eye);
  const forward = new THREE.Vector3(pose.target.x, pose.target.y, pose.target.z).sub(eye);
  assert.ok(forward.angleTo(toBuoy) < 0.55,
    'the snag buoy should be inside the forward deck camera view');
  const occlusion = new THREE.Raycaster(eye, toBuoy.clone().normalize(),
    0, toBuoy.length() - 0.01).intersectObject(voyage.boat, true);
  assert.equal(occlusion.length, 0,
    'the ferry hull and deck must not hide the mooring buoy at the snag');
  voyage.update(0.5, 40);
  assert.ok(bowFoam.material.uniforms.uAlpha.value > 0);
  assert.equal(voyage.applyAction('arrival.disembark').status, 'blocked');
  assert.ok(voyage.getPanel().actions.some(({ action }) => action === 'arrival.clear.snag'));
  assert.equal(voyage.applyAction('arrival.clear.snag').event, 'arrival_snag_cleared');
  assert.equal(voyage.status, 'berthing');
  assert.equal(bowFoam.visible, false, 'the bow wash clears with the snag');
  for (let i = 0; i < 100 && voyage.status !== 'docked'; i++) {
    voyage.update(0.1, 43 + i * 0.1);
    assert.equal(world.isWalkable(voyage.boat.position.x, voyage.boat.position.z), false);
  }
  assert.equal(voyage.status, 'docked');
  assert.equal(voyage.boat.position.z, ARRIVAL_ROUTE.berthZ);
  assert.equal(voyage.boat.visible, true);
  const result = voyage.applyAction('arrival.disembark');
  assert.equal(result.status, 'completed');
  assert.equal(result.complete, true);
  assert.deepEqual(result.handoff, ARRIVAL_ROUTE.pier);
  assert.equal(voyage.boat.visible, false);
  assert.ok(Math.abs(result.handoff.x) < 3.8 && result.handoff.z >= 342 && result.handoff.z <= 357,
    'handoff must be on the authored timber pier');
});

test('three grounded observations can be taken at any point and the channel is treated as unverified', () => {
  const { voyage } = makeVoyage();
  voyage.start();
  const panel = voyage.getPanel();
  assert.ok(panel.actions.some(({ action }) => action === 'arrival.observe.cliff'));
  assert.ok(panel.actions.some(({ action }) => action === 'arrival.inspect.dispatch'));
  assert.ok(panel.actions.some(({ action }) => action === 'arrival.listen.island'));
  const cliff = voyage.applyAction({ action: 'arrival.observe.cliff' });
  const dispatch = voyage.applyAction('arrival.inspect.dispatch');
  const radio = voyage.applyAction({ type: 'arrival.listen.island' });
  for (const note of [cliff, dispatch, radio]) {
    assert.equal(note.status, 'changed');
    assert.ok(note.journal.length > 40);
  }
  assert.match(radio.message, /origin is not verified/i);
  assert.match(radio.journal, /could not establish/i);
  assert.equal(voyage.applyAction('arrival.listen.island').status, 'unchanged');
  assert.deepEqual(voyage.getPanel().observed, {
    cliff: true, dispatch: true, radio: true, pier: false,
  });
  assert.ok(voyage.getPanel().actions.some(({ action }) => action === 'arrival.confirm.pilot'));
  assert.ok(voyage.getPanel().actions.some(({ action }) => action === 'arrival.look.forward'));
  assert.equal(voyage.applyAction('arrival.look.forward').status, 'changed');
  for (const focus of ['cliff', 'dispatch', 'radio']) {
    voyage.restore({ ...voyage.snapshot(), focus });
    const pose = voyage.cameraPose();
    for (const value of [...Object.values(pose.position), ...Object.values(pose.target)]) {
      assert.ok(Number.isFinite(value), `${focus} produced a non-finite camera pose`);
    }
  }
});

test('berth confirmation can happen during passage; the skipper clears an unattended snag', () => {
  const { voyage } = makeVoyage();
  voyage.start();
  voyage.applyAction('arrival.confirm.pilot');
  runFor(voyage, 24);
  assert.equal(voyage.status, 'stalled');
  assert.equal(voyage.boat.position.z, ARRIVAL_ROUTE.snagZ);
  assert.equal(voyage.snapshot().snagResolved, false);
  runFor(voyage, 12, 24);
  assert.equal(voyage.status, 'stalled', 'the player has time to inspect the snag and help');
  runFor(voyage, 20, 36);
  assert.equal(voyage.status, 'docked');
  assert.equal(voyage.snapshot().snagResolved, true);
  assert.equal(voyage.getPanel().observed.cliff, false);
  assert.ok(voyage.getPanel().actions.some(({ action }) => action === 'arrival.disembark'));
  assert.equal(voyage.applyAction('arrival.disembark').complete, true);
});

test('arrival restoration preserves progress and rejects impossible unconfirmed docking', () => {
  assert.deepEqual(restoreArrivalState(null), createArrivalState());
  const { voyage } = makeVoyage();
  voyage.start();
  voyage.applyAction('arrival.observe.cliff');
  voyage.applyAction('arrival.confirm.pilot');
  runFor(voyage, 23);
  const saved = voyage.snapshot();
  assert.equal(saved.status, 'stalled');
  assert.ok(saved.snagSeconds > 0);
  const other = makeVoyage().voyage;
  other.restore(saved);
  assert.deepEqual(other.snapshot(), saved);
  assert.equal(other.boat.visible, true);
  runFor(other, 29, 23);
  assert.equal(other.status, 'docked');
  assert.equal(other.applyAction('arrival.disembark').complete, true);
  other.restore({ version: 2, status: 'docked', z: -9999, pilotConfirmed: false });
  assert.equal(other.status, 'holding');
  assert.equal(other.boat.position.z, ARRIVAL_ROUTE.holdingZ);
  other.restore({ version: 2, status: 'stalled', z: ARRIVAL_ROUTE.snagZ,
    pilotConfirmed: false, snagSeconds: 99 });
  assert.equal(other.status, 'holding');
  assert.equal(other.snapshot().snagSeconds, 0);
  other.skip();
  assert.equal(other.complete, true);
  assert.equal(other.active, false);
  assert.equal(other.cameraPose(), null);
  assert.equal(other.getPanel(), null);
  assert.equal(other.boat.visible, false);
  assert.equal(restoreArrivalState(other.snapshot()).status, 'skipped');
});

test('legacy saves already inside the cove continue without reversing or replaying the snag', () => {
  const { voyage } = makeVoyage();
  const legacy = { version: 1, status: 'berthing', z: ARRIVAL_ROUTE.snagZ - 4,
    pilotConfirmed: true, dispatchRead: true, focus: 'pier' };
  voyage.restore(legacy);
  assert.equal(voyage.snapshot().version, 2);
  assert.equal(voyage.snapshot().snagResolved, true);
  assert.equal(voyage.boat.position.z, legacy.z);
  runFor(voyage, 10);
  assert.equal(voyage.status, 'docked');
  assert.equal(voyage.getPanel().observed.dispatch, true);
  assert.equal(voyage.applyAction('arrival.clear.snag').status, 'blocked');
});

test('the crossing keeps its short duration at one frame per second without skipping a long suspended-tab gap', () => {
  const simulate = (voyage, fromSecond, toSecond, fps) => {
    let previous = fromSecond * 1000;
    const count = (toSecond - fromSecond) * fps;
    for (let frame = 1; frame <= count; frame++) {
      const now = (fromSecond + frame / fps) * 1000;
      voyage.update(arrivalFrameSeconds(now, previous), now / 1000);
      previous = now;
    }
  };
  const high = makeVoyage().voyage;
  const low = makeVoyage().voyage;
  for (const voyage of [high, low]) {
    voyage.start();
    voyage.applyAction('arrival.confirm.pilot');
  }
  simulate(high, 0, 20, 60);
  simulate(low, 0, 20, 1);
  assert.equal(high.status, 'berthing');
  assert.equal(low.status, 'berthing');
  assert.ok(Math.abs(high.snapshot().z - low.snapshot().z) < 5,
    'low frame rate should leave the ferry at nearly the same point after 20 real seconds');
  simulate(high, 20, 25, 60);
  simulate(low, 20, 25, 1);
  assert.equal(high.status, 'stalled');
  assert.equal(low.status, 'stalled');
  for (const voyage of [high, low]) voyage.applyAction('arrival.clear.snag');
  simulate(high, 25, 32, 60);
  simulate(low, 25, 32, 1);
  assert.equal(high.status, 'docked');
  assert.equal(low.status, 'docked');
  assert.equal(high.snapshot().z, ARRIVAL_ROUTE.berthZ);
  assert.equal(low.snapshot().z, ARRIVAL_ROUTE.berthZ);
  assert.equal(arrivalFrameSeconds(61_000, 1_000), 1,
    'a minute in a suspended tab must count as at most one second of crossing');
  assert.equal(arrivalFrameSeconds(1_000, 2_000), 0);
});
