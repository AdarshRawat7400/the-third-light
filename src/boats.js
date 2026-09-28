import * as THREE from 'three';
import { NAV_LIGHTS, SITES } from './story.js';
import { createFerryVisual, createRescueLaunchVisual } from './ferryVisual.js';

const SEA_LEVEL = 0.05;
const ROUTE_VERSION = 1;

// A waiting vessel is visible offshore before guidance. Once cleared, it
// follows the main/front leading-light line and turns seaward of the reef.
export const RESCUE_ROUTE = Object.freeze({
  offshoreZ: -420, turnZ: -390, berthX: -65, berthZ: -342,
  approachSeconds: 76,
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));

// The front and main rear lights define the true navigable bearing. Extending
// that straight line seaward keeps the rescue launch clear of the west reef.
export function safeLineX(z) {
  const { front, main } = NAV_LIGHTS;
  return front.x + (z - front.z) * (front.x - main.x) / (front.z - main.z);
}

const TURN_X = safeLineX(RESCUE_ROUTE.turnZ);

/** Reusable output avoids a Vector3 allocation on every render frame. */
export function rescueRoutePose(progress, output = {}) {
  const t = clamp01(Number.isFinite(progress) ? progress : 0);
  if (t <= 0.5) {
    const z = RESCUE_ROUTE.offshoreZ
      + (RESCUE_ROUTE.turnZ - RESCUE_ROUTE.offshoreZ) * t * 2;
    output.x = safeLineX(z);
    output.z = z;
    output.yaw = Math.atan2(safeLineX(-389) - safeLineX(-390), 1);
    return output;
  }
  const u = (t - 0.5) * 2, v = 1 - u;
  // The first control tangent matches the safe bearing; the remaining
  // controls bend through open water toward the seaward side of the jetty.
  const x0 = TURN_X, z0 = RESCUE_ROUTE.turnZ;
  const x1 = TURN_X - 5.22, z1 = RESCUE_ROUTE.turnZ + 10;
  const x2 = -65, z2 = -365;
  const x3 = RESCUE_ROUTE.berthX, z3 = RESCUE_ROUTE.berthZ;
  output.x = v*v*v*x0 + 3*v*v*u*x1 + 3*v*u*u*x2 + u*u*u*x3;
  output.z = v*v*v*z0 + 3*v*v*u*z1 + 3*v*u*u*z2 + u*u*u*z3;
  const dx = 3*v*v*(x1-x0) + 6*v*u*(x2-x1) + 3*u*u*(x3-x2);
  const dz = 3*v*v*(z1-z0) + 6*v*u*(z2-z1) + 3*u*u*(z3-z2);
  output.yaw = Math.atan2(dx, dz);
  return output;
}

function addNavLight(group, color, x, z, intensity, y = 1.5) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color, toneMapped: false }),
  );
  bulb.position.set(x, y, z);
  group.add(bulb);
  const light = new THREE.PointLight(color, intensity, 23, 2);
  light.position.copy(bulb.position);
  group.add(light);
  return { bulb, light };
}

function glowTexture() {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot((x + 0.5 - size / 2) / 16, (y + 0.5 - size / 2) / 16);
    const index = (y * size + x) * 4;
    pixels[index] = pixels[index + 1] = pixels[index + 2] = 255;
    pixels[index + 3] = Math.round(Math.pow(Math.max(0, 1 - d), 2.3) * 205);
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function addGlow(group, color, position, map, scale = 2.5) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, opacity: 0.7, depthWrite: false, fog: true,
  }));
  sprite.position.copy(position);
  sprite.scale.set(scale, scale, 1);
  group.add(sprite);
  return sprite;
}

function makeWake() {
  const positions = [];
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const t0 = i / 9, t1 = (i + 1) / 9;
    const point = (t, offset) => positions.push(
      side * (0.8 + t * 3.15 + offset), -0.14, -3.4 - t * 17.5);
    point(t0, 0); point(t1, 0); point(t0, 0.12 + t0 * 0.34);
    point(t0, 0.12 + t0 * 0.34); point(t1, 0); point(t1, 0.12 + t1 * 0.34);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const wake = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0xadc5c8, transparent: true, opacity: 0.30,
    depthWrite: false, side: THREE.DoubleSide,
  }));
  wake.name = 'Rescue launch broken wake';
  return wake;
}

function makeBerthRipples() {
  // Thin, broken whitewater at the hull's moving waterline makes the rescued
  // launch read as moored in the inlet, even over translucent swell shading.
  const positions = [];
  for (const [start, span] of [
    [0.05, 0.72], [1.1, 0.67], [2.19, 0.83],
    [3.42, 0.68], [4.43, 0.59], [5.37, 0.65],
  ]) {
    const point = (angle, outer) => {
      const radiusX = outer ? 1.23 : 0.99;
      const radiusZ = outer ? 3.78 : 3.41;
      return [Math.sin(angle) * radiusX, -0.13, Math.cos(angle) * radiusZ];
    };
    for (let i = 0; i < 8; i++) {
      const a = start + span * i / 8;
      const b = start + span * (i + 1) / 8;
      positions.push(...point(a, false), ...point(a, true), ...point(b, false),
        ...point(a, true), ...point(b, true), ...point(b, false));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0xcbd8d4, transparent: true, opacity: 0.23,
    depthWrite: false, side: THREE.DoubleSide, fog: true,
  }));
  mesh.name = 'Rescue launch moored waterline ripples';
  mesh.visible = false;
  return mesh;
}

/**
 * A period passenger ferry at South Landing and a small rescue launch.
 *
 * South Landing has a docked ferry near the cove's sea edge. The rescue boat
 * holds offshore from Chapter 5, follows the confirmed deep-water bearing,
 * and reaches the seaward berth in about 76 seconds at cautious storm speed.
 *
 * @param {THREE.Scene} scene
 * @param {import('three/addons/loaders/GLTFLoader.js').GLTFLoader} loader Retained for the current call site; the boats no longer need a GLB.
 * @returns {{update:Function,restore:Function,snapshot:Function,arrival:THREE.Group,rescue:THREE.Group}}
 */
export function createBoats(scene, loader) {
  const landing = SITES.find((site) => site.id === 'landing');
  const arrival = new THREE.Group();
  arrival.name = 'Passenger ferry, South Landing';
  arrival.position.set(landing.x + 6, SEA_LEVEL + 0.19, landing.z + 82);
  arrival.rotation.y = Math.PI;
  scene.add(arrival);

  const rescue = new THREE.Group();
  rescue.name = 'Rescue launch, true north-inlet bearing';
  const pose = rescueRoutePose(0);
  rescue.position.set(pose.x, SEA_LEVEL + 0.19, pose.z);
  rescue.rotation.y = pose.yaw;
  rescue.visible = false;
  scene.add(rescue);

  const ferry = createFerryVisual();
  const rescueVisual = createRescueLaunchVisual();
  arrival.add(ferry);
  rescue.add(rescueVisual);
  addNavLight(arrival, 0xe6d7a3, 0, -1.87, 0.75, 4.28);
  const mast = addNavLight(rescue, 0xe8ecdd, 0, -0.85, 2.2, 4.14);
  // Bow faces local +Z, so its port side is local +X.
  const port = addNavLight(rescue, 0xd7a5a2, 1.12, 0.3, 0.45, 1.45);
  const starboard = addNavLight(rescue, 0xa7d6ad, -1.12, 0.3, 0.45, 1.45);
  const glowMap = glowTexture();
  const mastGlow = addGlow(rescue, 0xe8ecdd, mast.bulb.position, glowMap, 3.1);
  const portGlow = addGlow(rescue, 0xd7a5a2, port.bulb.position, glowMap, 1.7);
  const starboardGlow = addGlow(rescue, 0xa7d6ad, starboard.bulb.position, glowMap, 1.7);
  const wake = makeWake();
  wake.visible = false;
  rescue.add(wake);
  const berthRipples = makeBerthRipples();
  rescue.add(berthRipples);

  let motionSeconds = 0;
  let firstFrame = true;
  let loadedProgress = false;
  let rescuePhase = 'hidden';

  function snapshot() {
    return { version: ROUTE_VERSION, motionSeconds: Number(motionSeconds.toFixed(2)) };
  }

  function restore(raw) {
    loadedProgress = Boolean(raw && raw.version === ROUTE_VERSION
      && Number.isFinite(raw.motionSeconds));
    motionSeconds = loadedProgress
      ? Math.max(0, Math.min(RESCUE_ROUTE.approachSeconds, raw.motionSeconds)) : 0;
    firstFrame = true;
    return snapshot();
  }

  function update(dt, elapsed, {
    rescueExpected = false, pumpRestored = false, launchWarned = false,
    launchGuided = false, irisRescued = false, ended = false,
  } = {}, waterHeight) {
    const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    const time = Number.isFinite(elapsed) ? elapsed : 0;
    const expected = Boolean(rescueExpected || launchGuided || irisRescued || ended);
    if (firstFrame && irisRescued && !loadedProgress) {
      // Chapter 6 presets and older saves begin after the launch's arrival.
      motionSeconds = RESCUE_ROUTE.approachSeconds;
    }
    firstFrame = false;
    if (!expected) {
      rescue.visible = false;
      wake.visible = false;
      berthRipples.visible = false;
      rescuePhase = 'hidden';
      motionSeconds = 0;
    } else {
      rescue.visible = true;
      if (ended) motionSeconds = RESCUE_ROUTE.approachSeconds;
      else if (launchGuided) motionSeconds = Math.min(RESCUE_ROUTE.approachSeconds,
        motionSeconds + seconds);
      const progress = motionSeconds / RESCUE_ROUTE.approachSeconds;
      rescueRoutePose(progress, pose);
      rescue.position.x = pose.x;
      rescue.position.z = pose.z;
      rescue.rotation.y = pose.yaw;
      rescuePhase = !launchGuided && progress === 0 ? 'holding'
        : progress >= 1 ? 'berthed' : 'approaching';
      wake.visible = rescuePhase === 'approaching';
      berthRipples.visible = rescuePhase === 'berthed';
      berthRipples.material.opacity = 0.2 + Math.sin(time * 0.87) * 0.035;
      wake.material.opacity = progress > 0.88
        ? 0.3 * Math.max(0.25, (1 - progress) / 0.12) : 0.3;
      mastGlow.material.opacity = rescuePhase === 'holding'
        ? (launchWarned ? 0.56 + 0.2 * Math.max(0, Math.sin(time * 2.7)) : 0.48)
        : 0.76;
      portGlow.material.opacity = 0.52 + Math.sin(time * 2.1) * 0.06;
      starboardGlow.material.opacity = 0.52 + Math.sin(time * 2.1 + 0.7) * 0.06;
      mast.light.intensity = rescuePhase === 'holding' && !pumpRestored ? 1.8 : 2.5;
    }

    // Slow, unequal cycles suggest swell without making boats look weightless.
    const arrivalSea = typeof waterHeight === 'function'
      ? waterHeight(arrival.position.x, arrival.position.z, time) : SEA_LEVEL;
    arrival.position.y = arrivalSea + 0.19 + Math.sin(time * 1.14 + 1.3) * 0.035;
    arrival.rotation.z = Math.sin(time * 0.83 + 0.5) * 0.022;
    arrival.rotation.x = Math.sin(time * 0.67 + 2.1) * 0.016;
    if (rescue.visible) {
      const rescueSea = typeof waterHeight === 'function'
        ? waterHeight(rescue.position.x, rescue.position.z, time) : SEA_LEVEL;
      rescue.position.y = rescueSea + 0.19 + Math.sin(time * 1.47 + 0.8) * 0.05;
      rescue.rotation.z = Math.sin(time * 1.08 + 1.8) * 0.025;
      rescue.rotation.x = Math.sin(time * 0.91 + 0.3) * 0.022;
    }
  }

  return {
    update, restore, snapshot, arrival, rescue,
    get rescuePhase() { return rescuePhase; },
    get rescueProgress() { return motionSeconds / RESCUE_ROUTE.approachSeconds; },
  };
}
