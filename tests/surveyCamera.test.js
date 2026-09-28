import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import { NAV_LIGHTS, SITES } from '../src/story.js';
import {
  SURVEY_HOLD_SECONDS, SURVEY_STAKES, beginSurvey, captureSurvey,
  createStandbyLampClock, createSurveyState, evaluateSurveyFrame, serializeSurveyState, stepSurveyHold,
} from '../src/surveyCamera.js';

const world = createWorld(new THREE.Scene(), new THREE.Camera());

function frameAt(stakeId, overrides = {}) {
  const [x, z] = SURVEY_STAKES[stakeId].position;
  const observer = overrides.observer ?? { x, y: world.terrainHeight(x, z) + 1.72, z };
  const basics = {
    stakeId, observer, yaw: 0, pitch: 0, fov: 34,
    aspect: 16 / 9, terrainHeight: world.terrainHeight,
    visibleLights: { front: true, main: true, standby: true },
  };
  const sightline = evaluateSurveyFrame(basics);
  return evaluateSurveyFrame({
    ...basics, yaw: sightline.targetYaw, pitch: sightline.targetPitch,
    ...overrides,
  });
}

test('survey photographs measure the two real leading-light lines', () => {
  const west = frameAt('headland_view');
  const east = frameAt('east_ridge_view');
  assert.equal(west.status, 'ready');
  assert.equal(west.rear, 'main');
  assert.ok(west.bearingSeparationDeg < 0.5);
  assert.ok(west.verticalSeparationDeg > 15, 'lights align in bearing but are vertically stacked');
  assert.equal(east.status, 'ready');
  assert.equal(east.rear, 'standby');
  assert.ok(east.bearingSeparationDeg < 0.1);
  assert.ok(east.verticalSeparationDeg > 4);
});

test('the east survey pair clears the opaque Signal Tower building', () => {
  const [stakeX, stakeZ] = SURVEY_STAKES.east_ridge_view.position;
  const tower = SITES.find((site) => site.id === 'tower');
  const halfDiagonal = Math.hypot(tower.scale[0], tower.scale[1]) / 2;
  for (const lampId of ['standby', 'front']) {
    const lamp = NAV_LIGHTS[lampId];
    const dx = lamp.x - stakeX;
    const dz = lamp.z - stakeZ;
    const lengthSquared = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1,
      ((tower.x - stakeX) * dx + (tower.z - stakeZ) * dz) / lengthSquared));
    const clearance = Math.hypot(
      tower.x - (stakeX + t * dx), tower.z - (stakeZ + t * dz));
    assert.ok(clearance > halfDiagonal + 1,
      `${lampId} lamp is hidden behind the Signal Tower footprint (${clearance.toFixed(1)}m clearance)`);
  }
});

test('player must stand at a survey bolt, use telephoto framing, and wait for the standby lamp', () => {
  const [x, z] = SURVEY_STAKES.east_ridge_view.position;
  const far = frameAt('east_ridge_view', {
    observer: { x: x + 8, y: world.terrainHeight(x + 8, z) + 1.72, z },
  });
  assert.equal(far.status, 'move_to_stake');
  assert.equal(frameAt('east_ridge_view', { fov: 52 }).status, 'zoom_in');
  assert.equal(frameAt('east_ridge_view', {
    visibleLights: { front: true, main: true, standby: false },
  }).status, 'wait_for_light');
  const correct = frameAt('east_ridge_view');
  assert.equal(frameAt('east_ridge_view', { yaw: correct.targetYaw + 0.25 }).status, 'aim_at_pair');
  assert.equal(frameAt('east_ridge_view', {
    fov: 52, visibleLights: { front: true, main: true, standby: false },
  }).status, 'zoom_in', 'a dark lamp should not hide zoom guidance');
  assert.equal(frameAt('east_ridge_view', {
    yaw: correct.targetYaw + 0.25,
    visibleLights: { front: true, main: true, standby: false },
  }).status, 'aim_at_pair', 'a dark lamp should not hide aim guidance');
});

test('a steady east photograph remains possible when frames arrive one second apart', () => {
  const view = frameAt('east_ridge_view');
  let state = beginSurvey(createSurveyState(null), 'east_ridge_view');
  const dark = frameAt('east_ridge_view', {
    visibleLights: { front: true, main: true, standby: false },
  });
  state = stepSurveyHold(state, dark, 1);
  assert.equal(state.holdSeconds, 0);
  state = stepSurveyHold(state, view, 1);
  assert.equal(state.holdSeconds, SURVEY_HOLD_SECONDS);
  assert.equal(captureSurvey(state, view).accepted, true);
});

test('standby beacon flashes in wall time at both fast and slow frame cadences', () => {
  for (const frameSeconds of [1 / 60, 1]) {
    const lamp = createStandbyLampClock();
    const litTimes = [];
    for (let seconds = frameSeconds; seconds <= 19.001; seconds += frameSeconds) {
      if (lamp.update(frameSeconds)) litTimes.push(seconds);
    }
    assert.ok(litTimes.some((seconds) => seconds >= 2 && seconds <= 5),
      `standby beacon never lit at ${frameSeconds}s cadence`);
    assert.ok(litTimes.some((seconds) => seconds >= 16 && seconds <= 19),
      'the beacon should flash again rather than stay dark');
  }
  const lamp = createStandbyLampClock();
  assert.equal(lamp.update(60), false, 'a suspended-tab gap must not skip a whole cycle');
  assert.equal(lamp.update(0, true), true, 'restored power holds the beacon on');
});

test('sweeping past the pair cannot satisfy the hold; steady player aim can', () => {
  const view = frameAt('headland_view');
  let state = beginSurvey(createSurveyState(null), 'headland_view');
  for (let i = 0; i < 4; i++) state = stepSurveyHold(state, view, 0.1);
  assert.equal(captureSurvey(state, view).accepted, false);

  // A fast 2-degree flick stays inside the framing tolerance but breaks stability.
  const flicked = frameAt('headland_view', { yaw: view.targetYaw + 2 * Math.PI / 180 });
  assert.equal(flicked.status, 'ready');
  state = stepSurveyHold(state, flicked, 0.016);
  assert.equal(state.holdSeconds, 0);
  for (let i = 0; i < 9; i++) state = stepSurveyHold(state, flicked, 0.1);
  assert.equal(state.holdSeconds, SURVEY_HOLD_SECONDS);

  const result = captureSurvey(state, flicked);
  assert.equal(result.accepted, true);
  assert.equal(result.capture.rear, 'main');
  assert.equal(result.state.activeStake, null);
  const saved = serializeSurveyState(result.state);
  const restored = createSurveyState(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored.captures.headland_view, result.capture);
  assert.equal(restored.holdSeconds, 0);
});

test('aiming at the tempting third light does not record the west safe line', () => {
  const [x, z] = SURVEY_STAKES.headland_view.position;
  const wrongYaw = Math.atan2(-(NAV_LIGHTS.standby.x - x), -(NAV_LIGHTS.standby.z - z));
  const wrong = frameAt('headland_view', { yaw: wrongYaw });
  assert.equal(wrong.ready, false);
  let state = beginSurvey(createSurveyState(null), 'headland_view');
  for (let i = 0; i < 10; i++) state = stepSurveyHold(state, wrong, 0.1);
  assert.equal(captureSurvey(state, wrong).accepted, false);
  const recovered = frameAt('headland_view');
  for (let i = 0; i < 10; i++) state = stepSurveyHold(state, recovered, 0.1);
  assert.equal(captureSurvey(state, recovered).accepted, true);
});

test('invalid saves cannot forge a survey photo or make a malformed frame pass', () => {
  const restored = createSurveyState({ version: 1, captures: {
    headland_view: { rear: 'standby', bearingDeg: 0, fovDeg: 34, observer: [-186, 40, -120] },
    east_ridge_view: { rear: 'standby', bearingDeg: 0, fovDeg: 34, observer: {} },
  } });
  assert.deepEqual(restored.captures, {});
  assert.equal(evaluateSurveyFrame({ stakeId: 'headland_view' }).status, 'invalid');
});
