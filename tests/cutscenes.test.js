import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { arrivalFrameSeconds } from '../src/arrivalVoyage.js';
import { createRescueStaging } from '../src/rescueStaging.js';
import {
  CUTSCENES, createCutsceneDirector, restoreCutsceneFlags,
  sampleCutscene, shouldPlayCutscene,
} from '../src/cutscenes.js';

const ORIGIN = { x: 2.6, y: 1.5, z: 350 };

function camera() {
  const view = new THREE.PerspectiveCamera(72, 16 / 9, 0.08, 1900);
  view.position.set(2.6, 3.2, 350);
  view.lookAt(-2, 12, 270);
  return view;
}

function fakeDom() {
  const listeners = new Map();
  const doc = {
    activeElement: null, pointerLockElement: null, exits: 0,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
    exitPointerLock() { this.pointerLockElement = null; this.exits++; },
  };
  function node() {
    return {
      ownerDocument: doc, children: [], style: {}, attributes: {},
      isConnected: true, textContent: '',
      setAttribute(name, value) { this.attributes[name] = value; },
      append(...items) { this.children.push(...items); },
      appendChild(item) { this.children.push(item); },
      addEventListener(type, listener) { this[`on${type}`] = listener; },
      focus() { doc.activeElement = this; },
      remove() { this.isConnected = false; },
    };
  }
  doc.createElement = node;
  const root = node();
  return { doc, root, listeners };
}

test('grounded timelines have finite short shots and do not move the camera in reduced motion', () => {
  assert.deepEqual(Object.keys(CUTSCENES), [
    'ferry_landing', 'service_rescue', 'north_jetty_daybreak',
  ]);
  for (const [id, definition] of Object.entries(CUTSCENES)) {
    assert.ok(definition.duration >= 7 && definition.duration <= 12);
    assert.equal(definition.shots[0].at, 0);
    assert.ok(definition.shots.at(-1).at < definition.duration);
    const start = sampleCutscene(id, 0, { origin: ORIGIN });
    const end = sampleCutscene(id, definition.duration + 100, { origin: ORIGIN });
    assert.equal(start.done, false);
    assert.equal(end.done, true);
    assert.equal(end.seconds, definition.duration);
    assert.equal(end.opacity, 1, 'the final frame stays covered while awaiting Continue');
    assert.ok(Number.isFinite(end.pose.eye.x));
    assert.ok(start.line.length > 15);
    assert.equal(sampleCutscene(id, 3, { origin: ORIGIN, reducedMotion: true }).pose, null);
  }
  assert.throws(() => sampleCutscene('unknown', 1), RangeError);
  assert.throws(() => sampleCutscene('ferry_landing', 1, { origin: { x: NaN, y: 0, z: 0 } }), TypeError);
});

test('saved once-only flags accept only known completed scenes', () => {
  const restored = restoreCutsceneFlags(['ferry_landing', 'not_a_scene', 'ferry_landing']);
  assert.deepEqual([...restored], ['ferry_landing']);
  assert.equal(shouldPlayCutscene('ferry_landing', restored), false);
  assert.equal(shouldPlayCutscene('service_rescue', restored), true);
  assert.equal(shouldPlayCutscene('not_a_scene', restored), false);
});

test('every moving shot faces its authored subject instead of looking backward', () => {
  for (const id of Object.keys(CUTSCENES)) {
    const cam = camera();
    const { root } = fakeDom();
    const director = createCutsceneDirector({ camera: cam, root });
    director.start(id, { origin: ORIGIN });
    for (let seconds = 0.5; seconds <= CUTSCENES[id].duration; seconds += 0.5) {
      director.update(0.5);
      if (seconds < 1) continue;
      const shot = sampleCutscene(id, seconds, { origin: ORIGIN });
      const towardSubject = new THREE.Vector3(
        shot.pose.look.x - cam.position.x,
        shot.pose.look.y - cam.position.y,
        shot.pose.look.z - cam.position.z,
      ).normalize();
      assert.ok(cam.getWorldDirection(new THREE.Vector3()).dot(towardSubject) > 0.98,
        `${id} should face its subject at ${seconds}s`);
    }
    director.cancel();
    director.dispose();
  }
});

test('director pauses once, plays, waits for a gesture, then restores exact camera and calls completion', () => {
  const cam = camera();
  const initialPosition = cam.position.clone();
  const initialQuaternion = cam.quaternion.clone();
  const events = [];
  const { root, doc, listeners } = fakeDom();
  doc.pointerLockElement = {};
  const director = createCutsceneDirector({
    camera: cam, root,
    onSuspend: ({ id }) => { events.push(`suspend:${id}`); return 'prior-state'; },
    onResume: ({ reason, token }) => events.push(`resume:${reason}:${token}`),
    onComplete: ({ id, reason }) => events.push(`complete:${id}:${reason}`),
  });
  assert.equal(director.start('ferry_landing', { origin: ORIGIN }), true);
  assert.equal(doc.exits, 1);
  doc.pointerLockElement = {};
  listeners.get('pointerlockchange')();
  assert.equal(doc.exits, 2, 'a late pointer-lock grant must not trap Skip');
  assert.equal(director.active, true);
  assert.equal(director.start('service_rescue', { origin: ORIGIN }), false);
  assert.equal(root.children[0].attributes.role, 'dialog');
  assert.equal(root.children[0].attributes['aria-modal'], 'true');
  const motionButton = root.children[0].children[1].children[1].children[0];
  assert.equal(motionButton.attributes['aria-pressed'], 'false');
  director.update(1);
  assert.ok(cam.position.distanceTo(initialPosition) > 0.1);
  const shot = sampleCutscene('ferry_landing', 1, { origin: ORIGIN });
  const towardSubject = new THREE.Vector3(
    shot.pose.look.x - cam.position.x,
    shot.pose.look.y - cam.position.y,
    shot.pose.look.z - cam.position.z,
  ).normalize();
  assert.ok(cam.getWorldDirection(new THREE.Vector3()).dot(towardSubject) > 0.98,
    'the cutscene camera must face its authored subject');
  motionButton.onclick();
  assert.equal(motionButton.attributes['aria-pressed'], 'true');
  assert.ok(cam.position.distanceTo(initialPosition) < 1e-10);
  motionButton.onclick();
  assert.equal(motionButton.attributes['aria-pressed'], 'false');
  for (let i = 0; i < 10; i++) director.update(1);
  assert.equal(director.awaitingContinue, true);
  assert.deepEqual(events, ['suspend:ferry_landing']);
  assert.equal(director.continue(), true);
  assert.equal(director.active, false);
  assert.ok(cam.position.distanceTo(initialPosition) < 1e-10);
  assert.ok(cam.quaternion.angleTo(initialQuaternion) < 1e-10);
  assert.equal(cam.fov, 72);
  assert.deepEqual(events, [
    'suspend:ferry_landing', 'resume:finished:prior-state',
    'complete:ferry_landing:finished',
  ]);
  director.dispose();
  assert.equal(listeners.has('pointerlockchange'), false);
});

test('Escape skips, cancellation does not record a completion, and reduced motion holds the gameplay pose', () => {
  const cam = camera();
  const initialPosition = cam.position.clone();
  const events = [];
  const { root, listeners } = fakeDom();
  const director = createCutsceneDirector({ camera: cam, root, reducedMotion: true,
    onComplete: (event) => events.push(event),
  });
  director.start('service_rescue', { origin: { x: 167, y: 30, z: 150 } });
  director.update(1);
  assert.ok(cam.position.distanceTo(initialPosition) < 1e-10);
  const event = { code: 'Escape', prevented: false,
    preventDefault() { this.prevented = true; }, stopImmediatePropagation() {},
  };
  listeners.get('keydown')(event);
  assert.equal(event.prevented, true);
  assert.deepEqual(events, [{ id: 'service_rescue', reason: 'skipped' }]);
  director.start('north_jetty_daybreak', { origin: { x: -65, y: 2, z: -315 } });
  assert.equal(director.cancel(), true);
  assert.equal(events.length, 1, 'cancel must not mark a once-only scene as seen');
  director.dispose();
  assert.equal(listeners.has('keydown'), false);
});

test('rescue scene and Iris emergence keep their real-time cadence at 60 FPS and 1 FPS', () => {
  const results = [];
  for (const fps of [60, 1]) {
    const director = createCutsceneDirector({ camera: camera(), root: null });
    const stage = createRescueStaging(new THREE.Scene(), () => 33);
    const context = { chapter: 4, irisRescued: true };
    stage.update(0, 0, { ...context, paused: true });
    director.start('service_rescue', { origin: { x: 167, y: 33, z: 150 } });
    const checkpoints = [];
    for (let step = 1; step <= 12 * fps; step++) {
      const now = step * 1000 / fps;
      const previous = (step - 1) * 1000 / fps;
      // The production frame loop gives both cinematic systems this bounded
      // wall-time delta; walking and driving retain their smaller physics dt.
      const sceneDt = arrivalFrameSeconds(now, previous);
      const frame = director.update(sceneDt);
      stage.update(sceneDt, now / 1000, context);
      if (step % (4 * fps) === 0) {
        checkpoints.push({
          sceneSeconds: frame.seconds,
          emergenceSeconds: stage.emergenceSeconds,
          phase: stage.phase,
          awaitingContinue: director.awaitingContinue,
        });
      }
    }
    assert.ok(Math.abs(checkpoints[0].sceneSeconds - 4) < 0.02);
    assert.ok(Math.abs(checkpoints[0].emergenceSeconds - 4) < 0.02,
      `Iris must be emerging after four real seconds at ${fps} FPS`);
    assert.equal(checkpoints[0].phase, 'emerging');
    assert.ok(Math.abs(checkpoints[1].sceneSeconds - 8) < 0.02);
    assert.ok(Math.abs(checkpoints[1].emergenceSeconds - 8) < 0.02);
    assert.equal(checkpoints[1].phase, 'walking');
    assert.equal(checkpoints[2].sceneSeconds, CUTSCENES.service_rescue.duration);
    assert.equal(checkpoints[2].phase, 'ready');
    assert.equal(checkpoints[2].awaitingContinue, true);
    results.push(checkpoints);
    director.dispose();
    stage.dispose();
  }
  for (let i = 0; i < 3; i++) {
    assert.ok(Math.abs(results[0][i].sceneSeconds - results[1][i].sceneSeconds) < 0.02);
    assert.ok(Math.abs(results[0][i].emergenceSeconds - results[1][i].emergenceSeconds) < 0.02);
  }
});
