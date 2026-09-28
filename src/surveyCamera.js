import { CLUES, NAV_LIGHTS } from './story.js';

// A leading-light pair is aligned in bearing, not in height: the two lamps
// appear one above the other. In Greywake's current terrain the west pair is
// about 20 degrees apart vertically, so requiring a single 3D overlap would
// make the photograph physically impossible.
export const SURVEY_STAKES = Object.freeze({
  headland_view: Object.freeze({ rear: 'main', position: CLUES.find((clue) => clue.id === 'headland_view').world }),
  east_ridge_view: Object.freeze({ rear: 'standby', position: CLUES.find((clue) => clue.id === 'east_ridge_view').world }),
});
export const SURVEY_FOV = Object.freeze({ min: 26, max: 58, requiredMax: 40 });
export const SURVEY_STAKE_RADIUS = 3;
export const SURVEY_HOLD_SECONDS = 0.7;
const BEARING_TOLERANCE_DEG = 2.7;
const CENTER_TOLERANCE_DEG = 3.5;
const EDGE_MARGIN_DEG = 1.25;
const MAX_AIM_SPEED_DEG_PER_SECOND = 20;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// The intermittent standby beacon is a visual timing cue. Walking uses a
// short physics step, but that capped step would make the beacon's dark period
// much longer in wall time on a slow browser. Bound only suspended-tab gaps.
export function createStandbyLampClock() {
  let seconds = 0;
  return {
    update(wallSeconds, energized = false) {
      if (Number.isFinite(wallSeconds)) seconds += Math.min(1, Math.max(0, wallSeconds));
      return Boolean(energized) || Math.sin(seconds * 0.47) > 0.82;
    },
  };
}

function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
function validHeightFunction(heightAt) { return typeof heightAt === 'function'; }
function angleDifference(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
function lampDirection(observer, lamp, heightAt) {
  const dx = lamp.x - observer.x;
  const dz = lamp.z - observer.z;
  const dy = heightAt(lamp.x, lamp.z) + lamp.height + 0.5 - observer.y;
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: Math.atan2(dy, Math.hypot(dx, dz)),
    distance: Math.hypot(dx, dy, dz),
  };
}
function isLightOn(id, visibleLights) {
  if (visibleLights === undefined || visibleLights === null) return true;
  if (visibleLights instanceof Set) return visibleLights.has(id);
  if (Array.isArray(visibleLights)) return visibleLights.includes(id);
  return visibleLights[id] !== false;
}
function terrainClear(observer, lamp, heightAt) {
  const targetY = heightAt(lamp.x, lamp.z) + lamp.height + 0.5;
  const distance = Math.hypot(lamp.x - observer.x, lamp.z - observer.z);
  const samples = Math.max(12, Math.ceil(distance / 5));
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const x = observer.x + (lamp.x - observer.x) * t;
    const z = observer.z + (lamp.z - observer.z) * t;
    if (heightAt(x, z) + 0.4 >= observer.y + (targetY - observer.y) * t) return false;
  }
  return true;
}

/**
 * Evaluate the *current* camera view, without steering or snapping it.
 * `fov` is the Three.js vertical field of view in degrees. Pass the player's
 * actual x/y/z, yaw/pitch, canvas aspect ratio and world.terrainHeight.
 * `visibleLights` should reflect the current standby-lamp blink when supplied.
 */
export function evaluateSurveyFrame({ stakeId, observer, yaw, pitch, fov, aspect, terrainHeight, visibleLights } = {}) {
  const stake = SURVEY_STAKES[stakeId];
  if (!stake || !observer || ![observer.x, observer.y, observer.z, yaw, pitch, fov, aspect].every(finite)
    || !validHeightFunction(terrainHeight) || fov <= 0 || fov >= 180 || aspect <= 0) {
    return { status: 'invalid', ready: false, stakeId };
  }

  const distanceFromStake = Math.hypot(observer.x - stake.position[0], observer.z - stake.position[1]);
  const front = lampDirection(observer, NAV_LIGHTS.front, terrainHeight);
  const rear = lampDirection(observer, NAV_LIGHTS[stake.rear], terrainHeight);
  const bearingSeparationDeg = Math.abs(angleDifference(front.yaw, rear.yaw)) * DEG;
  const verticalSeparationDeg = Math.abs(front.pitch - rear.pitch) * DEG;
  const targetYaw = front.yaw + angleDifference(rear.yaw, front.yaw) / 2;
  const targetPitch = (front.pitch + rear.pitch) / 2;
  const centerYawErrorDeg = Math.abs(angleDifference(yaw, targetYaw)) * DEG;
  const centerPitchErrorDeg = Math.abs(pitch - targetPitch) * DEG;
  const horizontalFovDeg = 2 * Math.atan(Math.tan(fov * RAD / 2) * aspect) * DEG;
  const inFrame = [front, rear].every((lamp) =>
    Math.abs(angleDifference(lamp.yaw, yaw)) * DEG < horizontalFovDeg / 2 - EDGE_MARGIN_DEG
    && Math.abs(lamp.pitch - pitch) * DEG < fov / 2 - EDGE_MARGIN_DEG);
  const lineOfSight = terrainClear(observer, NAV_LIGHTS.front, terrainHeight)
    && terrainClear(observer, NAV_LIGHTS[stake.rear], terrainHeight);
  let status = 'ready';
  if (distanceFromStake > SURVEY_STAKE_RADIUS) status = 'move_to_stake';
  else if (!lineOfSight) status = 'obscured';
  else if (bearingSeparationDeg > BEARING_TOLERANCE_DEG) status = 'bearing_mismatch';
  else if (fov > SURVEY_FOV.requiredMax) status = 'zoom_in';
  else if (!inFrame || centerYawErrorDeg > CENTER_TOLERANCE_DEG
    || centerPitchErrorDeg > CENTER_TOLERANCE_DEG) status = 'aim_at_pair';
  else if (!isLightOn('front', visibleLights) || !isLightOn(stake.rear, visibleLights)) status = 'wait_for_light';

  return {
    status, ready: status === 'ready', stakeId, rear: stake.rear,
    distanceFromStake, bearingSeparationDeg, verticalSeparationDeg,
    centerYawErrorDeg, centerPitchErrorDeg, horizontalFovDeg,
    targetYaw, targetPitch, lineOfSight, inFrame,
    lampAngles: { front, rear },
    observer: { x: observer.x, y: observer.y, z: observer.z }, yaw, pitch, fov,
  };
}

function sanitizeCapture(stakeId, capture) {
  if (!capture || capture.rear !== SURVEY_STAKES[stakeId].rear
    || !Array.isArray(capture.observer) || capture.observer.length !== 3
    || ![capture.bearingDeg, capture.fovDeg, ...capture.observer].every(finite)
    || capture.fovDeg < SURVEY_FOV.min || capture.fovDeg > SURVEY_FOV.requiredMax
    || capture.bearingDeg > BEARING_TOLERANCE_DEG || capture.bearingDeg < 0) return null;
  return {
    rear: capture.rear,
    bearingDeg: capture.bearingDeg,
    fovDeg: capture.fovDeg,
    observer: [...capture.observer],
  };
}

/** Hydrate saved photographs. Holding/aim state is intentionally transient. */
export function createSurveyState(saved) {
  const captures = {};
  for (const stakeId of Object.keys(SURVEY_STAKES)) {
    const capture = sanitizeCapture(stakeId, saved?.version === 1 ? saved.captures?.[stakeId] : null);
    if (capture) captures[stakeId] = capture;
  }
  return { activeStake: null, holdSeconds: 0, lastAim: null, captures };
}

export function beginSurvey(state, stakeId) {
  if (!SURVEY_STAKES[stakeId]) return state;
  return { ...state, activeStake: stakeId, holdSeconds: 0, lastAim: null };
}

export function stepSurveyHold(state, evaluation, dt) {
  if (!state?.activeStake || evaluation?.stakeId !== state.activeStake || !finite(dt)) return state;
  // The camera hold measures actual time spent on a visible, steady pair.
  // A short-lived lamp must remain photographable on a slow desktop frame.
  // The frame loop supplies a bounded wall-clock interval separately from
  // its physics step; cap long tab suspensions here as a final safeguard.
  const elapsed = Math.min(1, Math.max(0, dt));
  const aim = finite(evaluation.yaw) && finite(evaluation.pitch)
    ? { yaw: evaluation.yaw, pitch: evaluation.pitch } : null;
  const aimSpeed = state.lastAim && aim && elapsed > 0
    ? Math.hypot(angleDifference(aim.yaw, state.lastAim.yaw), aim.pitch - state.lastAim.pitch) * DEG / elapsed
    : 0;
  const steady = evaluation.ready && aimSpeed <= MAX_AIM_SPEED_DEG_PER_SECOND;
  return {
    ...state,
    holdSeconds: steady ? Math.min(SURVEY_HOLD_SECONDS, state.holdSeconds + elapsed) : 0,
    lastAim: aim,
  };
}

export function captureSurvey(state, evaluation) {
  if (!state?.activeStake || evaluation?.stakeId !== state.activeStake || !evaluation.ready
    || state.holdSeconds < SURVEY_HOLD_SECONDS) {
    return { accepted: false, status: 'not_ready', state };
  }
  const stakeId = state.activeStake;
  const capture = {
    rear: SURVEY_STAKES[stakeId].rear,
    bearingDeg: evaluation.bearingSeparationDeg,
    fovDeg: evaluation.fov,
    observer: [evaluation.observer.x, evaluation.observer.y, evaluation.observer.z],
  };
  const nextState = {
    ...state, activeStake: null, holdSeconds: 0, lastAim: null,
    captures: { ...state.captures, [stakeId]: capture },
  };
  return { accepted: true, status: 'captured', state: nextState, capture };
}

export function serializeSurveyState(state) {
  const captures = {};
  for (const stakeId of Object.keys(SURVEY_STAKES)) {
    const capture = sanitizeCapture(stakeId, state?.captures?.[stakeId]);
    if (capture) captures[stakeId] = capture;
  }
  return { version: 1, captures };
}
