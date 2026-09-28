import * as THREE from 'three';

const VERSION = 1;
const EXIT_X = 167;
const EXIT_Z = 150;
const REST_X = 176;
const REST_Z = 157;
const FULL_SECONDS = 10.5;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => value * value * (3 - 2 * value);

function part(group, geometry, material, x, y, z, name) {
  const item = new THREE.Mesh(geometry, material);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  item.name = name;
  group.add(item);
  return item;
}

/**
 * A physical water sight glass beside the service hatch and a staged exit
 * using Iris's existing NPC figure. The exit begins only after the hatch
 * milestone is recorded; dt=0 or paused=true holds the animation in place.
 * This module never changes clues, collision, dialogue, or gate mechanics.
 */
export function createRescueStaging(scene, terrainHeight, hatchGroup = null,
  { initiallyRescued = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Service hatch water sight glass and rescue indicators';
  group.position.set(164.65, terrainHeight(164.65, 151.05) + 0.06, 151.05);
  scene.add(group);

  const iron = new THREE.MeshStandardMaterial({ color: 0x384648, metalness: 0.65, roughness: 0.68 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x756652, metalness: 0.48, roughness: 0.75 });
  const controlBrass = new THREE.MeshStandardMaterial({ color: 0xae9b70, metalness: 0.64,
    roughness: 0.48, emissive: 0x241b0d, emissiveIntensity: 0.12 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x8da5a5, transparent: true,
    opacity: 0.36, roughness: 0.17, metalness: 0.04, depthWrite: false,
    side: THREE.DoubleSide });
  const water = new THREE.MeshStandardMaterial({ color: 0x426a75, emissive: 0x152a34,
    emissiveIntensity: 0.2, roughness: 0.24, metalness: 0.12 });
  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x9a584c,
    emissive: 0x9a4738, emissiveIntensity: 1.2, roughness: 0.3 });

  part(group, new THREE.BoxGeometry(0.64, 0.12, 0.6), iron, 0, 0.09, 0, 'Sight glass bolted base');
  part(group, new THREE.CylinderGeometry(0.048, 0.056, 1.24, 9), iron,
    -0.25, 0.75, 0, 'Left cast iron gauge pipe');
  part(group, new THREE.CylinderGeometry(0.048, 0.056, 1.24, 9), iron,
    0.25, 0.75, 0, 'Right cast iron gauge pipe');
  part(group, new THREE.BoxGeometry(0.6, 0.09, 0.3), edge, 0, 1.38, 0,
    'Gauge corroded top cap');
  part(group, new THREE.BoxGeometry(0.4, 0.86, 0.12), iron, 0, 0.88, -0.02,
    'Gauge backplate');
  const waterColumn = part(group, new THREE.BoxGeometry(0.21, 1, 0.025), water,
    0, 0.49, 0.045, 'Visible tunnel water column');
  const face = part(group, new THREE.BoxGeometry(0.3, 0.92, 0.018), glass,
    0, 0.88, 0.073, 'Rain-streaked sight glass');
  face.castShadow = false;
  for (let i = 0; i < 5; i++) {
    const tick = part(group, new THREE.BoxGeometry(i === 1 ? 0.13 : 0.07, 0.012, 0.022), edge,
      0.23, 0.56 + i * 0.15, 0.09, `Sight glass depth mark ${i + 1}`);
    tick.castShadow = false;
  }
  const lamp = part(group, new THREE.SphereGeometry(0.115, 12, 9), lampMaterial,
    0, 1.56, 0, 'Pump and hatch status lamp');
  lamp.castShadow = false;
  const hood = part(group, new THREE.CylinderGeometry(0.18, 0.12, 0.08, 12), iron,
    0, 1.7, 0, 'Status lamp rain hood');
  hood.castShadow = false;

  // Mount the controls above the north rail, facing the south path. A low
  // pedestal beside the gate falls below the normal first-person view at the
  // 1.3 m hatch approach; this console leaves the opening and collision clear.
  // Its moving parts mirror the saved steps in the action menu.
  const controls = new THREE.Group();
  controls.name = 'Service gate release controls';
  controls.position.set(EXIT_X - group.position.x,
    terrainHeight(EXIT_X, EXIT_Z) + 0.07 - group.position.y,
    EXIT_Z - group.position.z);
  group.add(controls);
  part(controls, new THREE.BoxGeometry(0.36, 0.1, 0.34), iron,
    0.64, 0.07, -1.03, 'Release pedestal foot');
  part(controls, new THREE.BoxGeometry(0.13, 1.28, 0.13), iron,
    0.64, 0.74, -1.03, 'Release console support');
  part(controls, new THREE.BoxGeometry(0.72, 0.82, 0.16), iron,
    0.64, 1.43, -0.98, 'Release gearbox housing');
  part(controls, new THREE.BoxGeometry(0.77, 0.065, 0.22), edge,
    0.64, 1.87, -0.98, 'Release gearbox cap');
  const makeWheel = (name, x, y, radius) => {
    const wheel = new THREE.Group();
    wheel.name = name;
    wheel.position.set(x, y, -0.86);
    controls.add(wheel);
    part(wheel, new THREE.TorusGeometry(radius, 0.025, 5, 14), controlBrass,
      0, 0, 0, `${name} rim`);
    part(wheel, new THREE.BoxGeometry(radius * 1.7, 0.035, 0.035), controlBrass,
      0, 0, 0, `${name} horizontal spoke`);
    part(wheel, new THREE.BoxGeometry(0.035, radius * 1.7, 0.035), controlBrass,
      0, 0, 0, `${name} vertical spoke`);
    part(wheel, new THREE.CylinderGeometry(0.05, 0.05, 0.065, 8), iron,
      0, 0, 0.03, `${name} hub`).rotation.x = Math.PI / 2;
    return wheel;
  };
  const bleedWheel = makeWheel('Service gate bleed handwheel', 0.4, 1.56, 0.13);
  const releaseWheel = makeWheel('Service gate release handwheel', 0.84, 1.56, 0.2);
  part(controls, new THREE.BoxGeometry(0.38, 0.07, 0.11), iron,
    0.43, 1.16, -0.87, 'Keeper pin guide');
  const keeperPin = part(controls, new THREE.BoxGeometry(0.26, 0.045, 0.055), controlBrass,
    0.38, 1.16, -0.78, 'Service gate keeper pin');
  const outerBolt = part(controls, new THREE.BoxGeometry(0.39, 0.09, 0.09), controlBrass,
    0.76, 1.17, -0.78, 'Service gate outer bolt');

  // Evidence props wrap the hatch in a named visual group. Rotate its hinged
  // child, never the whole model (which includes the fixed frame and posts).
  const hatchVisual = hatchGroup?.children.find((child) =>
    child.isGroup && child.name.endsWith(' model')) ?? hatchGroup;
  const hatchLid = hatchVisual?.children.find((child) => child.isGroup) ?? null;
  let seconds = initiallyRescued ? FULL_SECONDS : 0;
  let wasRescued = initiallyRescued;
  let phase = initiallyRescued ? 'ready' : 'sealed';
  let lampCode = '';
  let controlsInitialized = false;
  const controlFractions = { bleed: 0, keeper: 0, bolt: 0 };

  function restore(raw) {
    if (!raw || raw.version !== VERSION || !Number.isFinite(raw.seconds)) return snapshot();
    seconds = Math.max(0, Math.min(FULL_SECONDS, raw.seconds));
    wasRescued = raw.wasRescued === true;
    phase = wasRescued ? seconds >= FULL_SECONDS ? 'ready' : 'opening' : 'sealed';
    return snapshot();
  }

  function snapshot() {
    return { version: VERSION, seconds: Number(seconds.toFixed(2)), wasRescued };
  }

  function update(dt, elapsed, {
    chapter = 0, pumpRestored = false, drainFraction = 0,
    tunnelDrained = false, launchGuided = false,
    irisRescued = false, hatch = null, paused = false, cameraPosition = null,
  } = {}, irisFigure = null) {
    const dx = cameraPosition ? cameraPosition.x - EXIT_X : 0;
    const dz = cameraPosition ? cameraPosition.z - EXIT_Z : 0;
    group.visible = chapter >= 3 && dx * dx + dz * dz < 110 * 110;
    const drained = clamp01(tunnelDrained ? 1 : pumpRestored ? drainFraction : 0);
    const columnHeight = 0.07 + 0.68 * (1 - drained);
    waterColumn.scale.y = columnHeight;
    waterColumn.position.y = 0.48 + columnHeight / 2;
    const nextLampCode = irisRescued ? 'open' : tunnelDrained && launchGuided ? 'launchReady'
      : tunnelDrained ? 'drained'
      : pumpRestored ? 'draining' : 'flooded';
    if (nextLampCode !== lampCode) {
      lampCode = nextLampCode;
      const color = nextLampCode === 'open' ? 0xe1ddbe
        : nextLampCode === 'launchReady' ? 0xaec5b2
        : nextLampCode === 'drained' ? 0x8dab94
          : nextLampCode === 'draining' ? 0xc29a67 : 0x9a584c;
      lampMaterial.color.setHex(color);
      lampMaterial.emissive.setHex(color);
    }
    lampMaterial.emissiveIntensity = pumpRestored ? 0.95 + Math.sin(elapsed * 2.2) * 0.12 : 0.56;

    const targets = {
      bleed: irisRescued || hatch?.pressureEqualized === true ? 1 : 0,
      keeper: irisRescued || hatch?.jamCleared === true ? 1 : 0,
      bolt: irisRescued || hatch?.boltReleased === true ? 1 : 0,
    };
    // The first update applies saved flags immediately. Later actions animate
    // only while playing. A cinematic may pass up to one second of bounded
    // wall time on a slow frame; regular gameplay still passes its physics dt.
    const step = !paused && Number.isFinite(dt) && dt > 0 ? Math.min(dt, 1) : 0;
    for (const key of Object.keys(controlFractions)) {
      controlFractions[key] = !controlsInitialized ? targets[key]
        : Math.max(0, Math.min(1, controlFractions[key]
          + Math.sign(targets[key] - controlFractions[key])
            * Math.min(Math.abs(targets[key] - controlFractions[key]), step * 2.1)));
    }
    controlsInitialized = true;
    bleedWheel.rotation.z = controlFractions.bleed * Math.PI * 0.58;
    keeperPin.position.x = 0.38 - controlFractions.keeper * 0.22;
    releaseWheel.rotation.z = controlFractions.bolt * Math.PI * 0.72;
    outerBolt.position.x = 0.76 + controlFractions.bolt * 0.23;

    if (!irisRescued) {
      wasRescued = false;
      seconds = 0;
      phase = 'sealed';
      if (hatchLid) hatchLid.rotation.z = 0;
      return phase;
    }
    if (!wasRescued) {
      wasRescued = true;
      seconds = 0;
    }
    if (!paused && Number.isFinite(dt) && dt > 0) {
      seconds = Math.min(FULL_SECONDS, seconds + Math.min(dt, 1));
    }
    const openFraction = smooth(clamp01(seconds / 2.1));
    if (hatchLid) hatchLid.rotation.z = 1.1 * openFraction;
    phase = seconds < 2.1 ? 'opening'
      : seconds < 4.15 ? 'emerging'
        : seconds < FULL_SECONDS ? 'walking' : 'ready';

    if (!irisFigure?.root || !irisFigure.figure) return phase;
    const { root, figure, head, ring } = irisFigure;
    root.visible = true;
    if (seconds >= FULL_SECONDS) {
      root.position.set(REST_X, terrainHeight(REST_X, REST_Z) + 0.02, REST_Z);
      root.rotation.y = 0.9;
      figure.rotation.x = 0;
      if (ring) ring.visible = true;
      return phase;
    }
    let x = EXIT_X + 0.18;
    let z = EXIT_Z + 0.1;
    let belowGround = -1.45;
    if (seconds >= 2.1 && seconds < 4.15) {
      const climb = smooth(clamp01((seconds - 2.1) / 2.05));
      belowGround = -1.45 * (1 - climb);
    } else if (seconds >= 4.15) {
      const walk = smooth(clamp01((seconds - 4.15) / (FULL_SECONDS - 4.15)));
      x += (REST_X - x) * walk;
      z += (REST_Z - z) * walk;
      belowGround = 0;
    }
    root.position.set(x, terrainHeight(x, z) + 0.02 + belowGround, z);
    root.rotation.y = 0.9;
    figure.rotation.x = -0.22 * (1 - clamp01((seconds - 2.1) / 2.05));
    if (seconds >= 4.15) figure.position.y = (figure.userData.baseY || 0)
      + Math.sin(elapsed * 9) * 0.024;
    if (head) head.rotation.y = seconds < 4.15 ? -0.16 : Math.sin(elapsed * 0.6) * 0.08;
    if (ring) ring.visible = false;
    return phase;
  }

  function dispose() {
    scene.remove(group);
    group.traverse((item) => {
      if (!item.isMesh) return;
      item.geometry.dispose();
    });
    for (const material of [iron, edge, controlBrass, glass, water, lampMaterial]) material.dispose();
  }

  return {
    group, update, restore, snapshot, dispose,
    get phase() { return phase; },
    get emergenceSeconds() { return seconds; },
    get ready() { return phase === 'ready'; },
  };
}
