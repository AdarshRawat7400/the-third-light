import * as THREE from 'three';
import { createFerryVisual } from './ferryVisual.js';

// South Landing's pier is centred at (0, 350). The ferry stays on the water,
// alongside its east edge; the player is handed to the pier only after E/Click.
export const ARRIVAL_ROUTE = Object.freeze({
  x: 6,
  offshoreZ: 535,
  holdingZ: 386,
  snagZ: 370,
  berthZ: 352,
  approachSpeed: 8.4,
  berthingSpeed: 3.2,
  snagTimeout: 20,
  pier: Object.freeze({ x: 2.6, z: 350, yaw: 0 }),
});

// Keep the old buoy beyond the bow and inside the deck camera's view at the
// snag. Its previous position was hidden by the hull from that camera.
const SNAG_BUOY = Object.freeze({ x: 7.4, z: 358.4 });

const VERSION = 2;
const STATUSES = new Set(['idle', 'approach', 'holding', 'berthing', 'stalled', 'docked', 'complete', 'skipped']);
const ACTIVE_STATUSES = new Set(['approach', 'holding', 'berthing', 'stalled', 'docked']);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// The crossing is a timed scene, independent of the short physics timestep
// used for walking. One second is enough to keep it moving at 1 FPS without
// letting a long suspended-tab gap skip the approach or the snag outright.
export function arrivalFrameSeconds(now, previousNow) {
  if (!Number.isFinite(now) || !Number.isFinite(previousNow)) return 0;
  return clamp((now - previousNow) / 1000, 0, 1);
}

export function createArrivalState() {
  return {
    version: VERSION,
    status: 'idle',
    z: ARRIVAL_ROUTE.offshoreZ,
    cliffSeen: false,
    dispatchRead: false,
    islandRadioHeard: false,
    pilotConfirmed: false,
    snagResolved: false,
    snagSeconds: 0,
    focus: 'island',
  };
}

/** Reject impossible save states rather than placing an unconfirmed ferry at the pier. */
export function restoreArrivalState(raw) {
  const state = createArrivalState();
  if (!raw || typeof raw !== 'object' || ![1, VERSION].includes(raw.version)
    || !STATUSES.has(raw.status)) return state;
  state.status = raw.status;
  state.cliffSeen = raw.cliffSeen === true;
  state.dispatchRead = raw.dispatchRead === true;
  state.islandRadioHeard = raw.islandRadioHeard === true;
  state.pilotConfirmed = raw.pilotConfirmed === true;
  state.snagResolved = raw.snagResolved === true;
  state.snagSeconds = Number.isFinite(raw.snagSeconds)
    ? clamp(raw.snagSeconds, 0, ARRIVAL_ROUTE.snagTimeout) : 0;
  state.focus = ['island', 'cliff', 'dispatch', 'radio', 'pier'].includes(raw.focus) ? raw.focus : 'island';
  state.z = Number.isFinite(raw.z)
    ? clamp(raw.z, ARRIVAL_ROUTE.berthZ, ARRIVAL_ROUTE.offshoreZ)
    : ARRIVAL_ROUTE.offshoreZ;
  if (state.status === 'idle' || state.status === 'skipped') state.z = ARRIVAL_ROUTE.offshoreZ;
  if (state.status === 'approach') state.z = Math.max(ARRIVAL_ROUTE.holdingZ, state.z);
  if (state.status === 'holding') state.z = ARRIVAL_ROUTE.holdingZ;
  if (state.status === 'berthing') state.z = clamp(state.z, ARRIVAL_ROUTE.berthZ, ARRIVAL_ROUTE.holdingZ);
  if (state.status === 'stalled') state.z = ARRIVAL_ROUTE.snagZ;
  if (state.status === 'docked' || state.status === 'complete') state.z = ARRIVAL_ROUTE.berthZ;
  // Older saves may already be inside the snag without knowing about it.
  // Continue their crossing from the saved position instead of moving backward.
  if (state.status === 'berthing' && state.z < ARRIVAL_ROUTE.snagZ) state.snagResolved = true;
  if (state.status === 'docked' || state.status === 'complete') state.snagResolved = true;
  if (state.status === 'stalled' && state.snagResolved) state.status = 'berthing';
  if (!state.pilotConfirmed && ['berthing', 'stalled', 'docked', 'complete'].includes(state.status)) {
    state.status = 'holding';
    state.z = ARRIVAL_ROUTE.holdingZ;
    state.snagResolved = false;
    state.snagSeconds = 0;
  }
  state.version = VERSION;
  return state;
}

function wakeMesh() {
  // A translucent vee begins behind the ferry stern and stays in its frame.
  const positions = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const t0 = i / 7;
      const t1 = (i + 1) / 7;
      const add = (t, offset) => positions.push(side * (1.85 + t * 4.3 + offset), -0.17,
        -5.9 - t * 18.5);
      add(t0, 0); add(t1, 0); add(t0, 0.22 + t0 * 0.38);
      add(t0, 0.22 + t0 * 0.38); add(t1, 0); add(t1, 0.22 + t1 * 0.38);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: 0xaabdc1, transparent: true, opacity: 0.32,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const wake = new THREE.Mesh(geometry, material);
  wake.name = 'Arrival ferry wake';
  return wake;
}

function snagFoamMesh() {
  // A broken oval of foam forms around the held bow instead of a flat opaque
  // splash card. It costs one small draw and vanishes as the line comes free.
  const uniforms = { uTime: { value: 0 }, uAlpha: { value: 0 } };
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 3.1),
    new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uAlpha;
        void main() {
          vec2 q = (vUv - 0.5) * vec2(1.0, 1.35);
          float radius = length(q);
          float ring = exp(-pow((radius - 0.43) * 23.0, 2.0));
          float broken = 0.61 + 0.23 * sin(vUv.x * 71.0 + uTime * 3.1)
            + 0.16 * sin(vUv.y * 87.0 - uTime * 2.3);
          float fleck = smoothstep(0.38, 0.75, broken) * ring;
          float alpha = clamp((ring * 0.36 + fleck * 0.64) * uAlpha, 0.0, 0.5);
          gl_FragColor = vec4(0.72, 0.82, 0.82, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    }));
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, -0.12, 5.96);
  foam.name = 'Snagged bow cross-swell foam';
  foam.visible = false;
  return { mesh: foam, uniforms };
}

function snagMarker(scene) {
  // One old buoy is visible in the cove before the vessel reaches it. A short
  // line only appears once it draws taut under the bow.
  const group = new THREE.Group();
  group.name = 'South cove old mooring buoy';
  const buoy = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.37, 0.84, 10),
    new THREE.MeshStandardMaterial({ color: 0xa85132, metalness: 0.16, roughness: 0.85 }),
  );
  buoy.name = 'Old mooring buoy float';
  buoy.position.set(SNAG_BUOY.x, 0.29, SNAG_BUOY.z);
  const whiteBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.43, 0.425, 0.13, 10),
    new THREE.MeshStandardMaterial({ color: 0xc9c2a9, metalness: 0.12, roughness: 0.87 }),
  );
  whiteBand.position.set(SNAG_BUOY.x, 0.42, SNAG_BUOY.z);
  const iron = new THREE.MeshStandardMaterial({ color: 0x343b3b, roughness: 0.8, metalness: 0.45 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), iron);
  cap.position.set(SNAG_BUOY.x, 0.85, SNAG_BUOY.z);
  const rope = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(6.0, -0.015, 364.15),
      new THREE.Vector3(6.65, 0.07, 363.55),
      new THREE.Vector3(SNAG_BUOY.x, 0.25, SNAG_BUOY.z),
    ]),
    new THREE.LineBasicMaterial({ color: 0x393c37, transparent: true, opacity: 0.85 }),
  );
  rope.name = 'Taut snagged mooring line';
  rope.visible = false;
  group.add(buoy, whiteBand, cap, rope);
  group.visible = false;
  scene.add(group);
  return { group, rope };
}

function addCrossingProps(boat) {
  const paper = new THREE.MeshStandardMaterial({ color: 0xc7bb9d, roughness: 0.96 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.82 });
  const brass = new THREE.MeshStandardMaterial({ color: 0x877761, metalness: 0.48, roughness: 0.5 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.82), dark);
  board.position.set(-0.36, 1.05, 2.77);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.72), paper);
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(-0.36, 1.074, 2.77);
  boat.add(board, sheet);
  for (let i = 0; i < 5; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(i === 0 ? 0.31 : 0.38, 0.002, 0.011), dark);
    line.position.set(-0.39, 1.078, 2.48 + i * 0.11);
    boat.add(line);
  }
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.26), dark);
  receiver.position.set(0.65, 1.17, 1.78);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 12), brass);
  dial.rotation.x = Math.PI / 2;
  dial.position.set(0.65, 1.185, 1.635);
  const aerial = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 6), brass);
  aerial.position.set(0.77, 1.56, 1.78);
  boat.add(receiver, dial, aerial);
  // A short bow rail gives the onboard camera a physical foreground while
  // leaving the low cove and cliff skyline unobstructed.
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.7, 7), dark);
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 1.34, 3.45);
  boat.add(rail);
  for (const x of [-0.8, 0.8]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.32, 7), dark);
    post.position.set(x, 1.18, 3.45);
    boat.add(post);
  }
}

function result(state, status, message, event = null, journal = null) {
  return { state: { ...state }, status, message, event, journal,
    complete: state.status === 'complete',
    handoff: state.status === 'complete' ? { ...ARRIVAL_ROUTE.pier } : null };
}

/**
 * Opening sea approach. The route advances by distance each frame; the skipper's
 * independent berth confirmation remains the one procedural requirement. A
 * loose mooring line briefly holds the ferry before the dock. The player can
 * help clear it, while the skipper will eventually resolve it if they wait.
 *
 * @param {THREE.Scene} scene
 * @param {{load:Function}} loader Kept for the existing call site; the original
 * procedural ferry uses the bundled CC0 timber maps instead of a boat model.
 * @param {(x:number,z:number,t:number)=>number} waterHeight Existing world sea sampler.
 */
export function createArrivalVoyage(scene, loader, waterHeight) {
  const boat = new THREE.Group();
  boat.name = 'Playable arrival ferry';
  boat.position.set(ARRIVAL_ROUTE.x, 0.24, ARRIVAL_ROUTE.offshoreZ);
  boat.rotation.y = Math.PI;
  boat.visible = false;
  scene.add(boat);
  let state = createArrivalState();

  boat.add(createFerryVisual());
  const wake = wakeMesh();
  boat.add(wake);
  const snagFoam = snagFoamMesh();
  boat.add(snagFoam.mesh);
  addCrossingProps(boat);
  const marker = snagMarker(scene);

  function syncVisibility() {
    boat.visible = ACTIVE_STATUSES.has(state.status);
    boat.position.z = state.z;
    wake.visible = state.status === 'approach' || state.status === 'berthing';
    snagFoam.mesh.visible = state.status === 'stalled';
    marker.group.visible = ACTIVE_STATUSES.has(state.status);
    marker.rope.visible = state.status === 'stalled';
  }

  function start() {
    state = { ...createArrivalState(), status: 'approach' };
    syncVisibility();
    return getPanel();
  }

  function skip() {
    state = { ...createArrivalState(), status: 'skipped' };
    syncVisibility();
    return { ...state };
  }

  function restore(raw) {
    state = restoreArrivalState(raw);
    syncVisibility();
    return { ...state };
  }

  function snapshot() { return { ...state }; }

  function update(dt, elapsed) {
    const seconds = Number.isFinite(dt) ? clamp(dt, 0, 1) : 0;
    if (state.status === 'approach') {
      state.z = Math.max(ARRIVAL_ROUTE.holdingZ,
        state.z - ARRIVAL_ROUTE.approachSpeed * seconds);
      if (state.z <= ARRIVAL_ROUTE.holdingZ) {
        state.status = state.pilotConfirmed ? 'berthing' : 'holding';
      }
    }
    if (state.status === 'holding' && state.pilotConfirmed) state.status = 'berthing';
    if (state.status === 'berthing') {
      const limit = state.snagResolved ? ARRIVAL_ROUTE.berthZ : ARRIVAL_ROUTE.snagZ;
      state.z = Math.max(limit, state.z - ARRIVAL_ROUTE.berthingSpeed * seconds);
      if (!state.snagResolved && state.z <= ARRIVAL_ROUTE.snagZ) {
        state.status = 'stalled';
        state.snagSeconds = 0;
      } else if (state.z <= ARRIVAL_ROUTE.berthZ) state.status = 'docked';
    } else if (state.status === 'stalled') {
      state.snagSeconds = Math.min(ARRIVAL_ROUTE.snagTimeout, state.snagSeconds + seconds);
      if (state.snagSeconds >= ARRIVAL_ROUTE.snagTimeout) {
        state.snagResolved = true;
        state.status = 'berthing';
      }
    }
    syncVisibility();
    if (!boat.visible) return;
    const time = Number.isFinite(elapsed) ? elapsed : 0;
    const sea = typeof waterHeight === 'function'
      ? waterHeight(ARRIVAL_ROUTE.x, state.z, time) : 0.055;
    const buoySea = typeof waterHeight === 'function'
      ? waterHeight(SNAG_BUOY.x, SNAG_BUOY.z, time) : 0.055;
    marker.group.position.y = Number.isFinite(buoySea) ? buoySea : 0.055;
    const stalled = state.status === 'stalled';
    snagFoam.uniforms.uTime.value = time;
    snagFoam.uniforms.uAlpha.value = stalled
      ? Math.min(0.42, 0.17 + state.snagSeconds * 0.075)
        * (0.86 + 0.14 * Math.sin(time * 5.2)) : 0;
    const firstCatch = stalled ? Math.exp(-state.snagSeconds * 1.25) : 0;
    boat.position.y = (Number.isFinite(sea) ? sea : 0.055) + 0.19
      + Math.sin(time * 1.07 + 0.5) * (stalled ? 0.046 : 0.028)
      + firstCatch * 0.06 * Math.sin(state.snagSeconds * 9);
    boat.rotation.x = Math.sin(time * 0.78 + 1.3) * (stalled ? 0.027 : 0.014)
      + firstCatch * 0.035 * Math.sin(state.snagSeconds * 8);
    boat.rotation.z = Math.sin(time * 0.96 + 0.7) * (stalled ? 0.042 : 0.022);
    return state.status;
  }

  function cameraPose() {
    if (!ACTIVE_STATUSES.has(state.status)) return null;
    boat.updateMatrixWorld(true);
    const readingNearDeck = ['dispatch', 'radio'].includes(state.focus)
      && (state.status === 'approach' || state.status === 'holding' || state.status === 'stalled');
    // The forward deck frames the view without filling half the screen.
    // Lean back only to read the clipboard and portable receiver.
    const eye = boat.localToWorld(new THREE.Vector3(0.16, 1.82,
      readingNearDeck ? 2.25 : 2.45));
    let look;
    if (state.status === 'berthing' || state.status === 'stalled' || state.status === 'docked') {
      look = new THREE.Vector3(0, 1.35, 340);
    } else if (state.focus === 'cliff') look = new THREE.Vector3(-140, 43, 181);
    else if (state.focus === 'dispatch') look = boat.localToWorld(new THREE.Vector3(-0.36, 1.05, 2.77));
    else if (state.focus === 'radio') look = boat.localToWorld(new THREE.Vector3(0.65, 1.17, 1.78));
    else if (state.focus === 'pier') look = new THREE.Vector3(0, 1.35, 340);
    else look = new THREE.Vector3(-30, 27, 218);
    return {
      position: { x: eye.x, y: eye.y, z: eye.z },
      target: { x: look.x, y: look.y, z: look.z },
    };
  }

  function getPanel() {
    if (!ACTIVE_STATUSES.has(state.status)) return null;
    const text = state.status === 'docked'
      ? 'The ferry settles against the east side of the timber pier. The path above it is the only gentle break in Greywake’s cliffs.'
      : state.status === 'stalled'
        ? 'A submerged mooring line catches beneath the ferry just short of the pier. The bow holds fast as a cross-swell rolls through the cove. The skipper can work it free, but you can point him toward the clear channel.'
      : state.status === 'berthing'
        ? 'The skipper has confirmed the south pier and brings the ferry in slowly through the cove.'
        : state.status === 'holding'
          ? 'The skipper holds beyond the cove. Verify the pier with the wheelhouse before the ferry enters.'
          : 'From the ferry, Greywake rises almost straight out of the sea. The south cove is the only visible landing.';
    const actions = [];
    if (!state.cliffSeen) actions.push({
      label: 'STUDY THE HIGH CLIFF SILHOUETTE', action: 'arrival.observe.cliff',
    });
    if (!state.dispatchRead) actions.push({
      label: 'READ THE CROSSING DISPATCH', action: 'arrival.inspect.dispatch',
    });
    if (!state.islandRadioHeard) actions.push({
      label: 'LISTEN TO THE ISLAND CHANNEL', action: 'arrival.listen.island',
    });
    if (!state.pilotConfirmed) actions.push({
      label: 'VERIFY THE PIER WITH THE SKIPPER', action: 'arrival.confirm.pilot',
    });
    if (state.status === 'stalled') actions.push({
      label: 'POINT OUT THE CLEAR CHANNEL TO THE SKIPPER', action: 'arrival.clear.snag',
    });
    if (state.focus !== 'island' && ['approach', 'holding'].includes(state.status)) actions.push({
      label: 'LOOK BACK TOWARD THE ISLAND', action: 'arrival.look.forward',
    });
    if (state.status === 'docked') actions.push({
      label: 'STEP ONTO THE PIER', action: 'arrival.disembark',
    });
    return {
      title: state.status === 'docked' ? 'South Landing'
        : state.status === 'stalled' ? 'Held Off the Pier' : 'The Crossing',
      text,
      actions,
      status: state.status,
      observed: {
        cliff: state.cliffSeen,
        dispatch: state.dispatchRead,
        radio: state.islandRadioHeard,
        pier: state.pilotConfirmed,
      },
    };
  }

  function applyAction(action) {
    const id = typeof action === 'string' ? action : action?.type || action?.action;
    if (!ACTIVE_STATUSES.has(state.status)) {
      return result(state, 'blocked', 'The crossing is not underway.');
    }
    if (id === 'arrival.observe.cliff') {
      if (state.cliffSeen) return result(state, 'unchanged', 'The cliff profile is already in the field notes.');
      state.cliffSeen = true;
      state.focus = 'cliff';
      return result(state, 'changed',
        'A high, grass-crowned headland hides most of the island. One low notch opens to a timber pier; the steep faces on either side offer no safe landing.',
        'arrival_cliff_seen',
        'From the ferry I saw one low south-cove landing beneath a continuous high cliff line. The rest of Greywake’s shore was sheer.');
    }
    if (id === 'arrival.inspect.dispatch') {
      if (state.dispatchRead) return result(state, 'unchanged', 'The crossing dispatch is already in the field notes.');
      state.dispatchRead = true;
      state.focus = 'dispatch';
      return result(state, 'changed',
        'The manifest lists one mainland investigator. The crossing was booked after Iris Hale’s message, but the skipper signed only for transport. No island escort is recorded.',
        'arrival_dispatch_read',
        'The ferry dispatch lists a one-person mainland investigation after Iris Hale’s message. The skipper signed for the crossing, not for any island escort.');
    }
    if (id === 'arrival.listen.island') {
      if (state.islandRadioHeard) return result(state, 'unchanged', 'The island-channel transmission is already noted.');
      state.islandRadioHeard = true;
      state.focus = 'radio';
      return result(state, 'changed',
        'A voice calling itself “Greywake shore control” says the lodge has power and tells you to stay there until the squall passes. Its origin is not verified.',
        'arrival_island_radio_heard',
        'On the approach, a voice identifying itself as Greywake shore control said the lodge had power. I could not establish where the call originated.');
    }
    if (id === 'arrival.confirm.pilot') {
      if (state.pilotConfirmed) return result(state, 'unchanged', 'The skipper has already verified the berth.');
      state.pilotConfirmed = true;
      state.focus = 'pier';
      if (state.status === 'holding') state.status = 'berthing';
      syncVisibility();
      return result(state, 'changed',
        'The skipper identifies the south timber pier on his own chart and confirms enough water beside its east edge. He eases the ferry in.',
        'arrival_pier_verified',
        'The skipper independently confirmed the south pier and its berth before entering the cove.');
    }
    if (id === 'arrival.clear.snag') {
      if (state.status !== 'stalled') return result(state, 'blocked', 'The ferry is clear of the mooring line.');
      state.snagResolved = true;
      state.status = 'berthing';
      state.focus = 'pier';
      syncVisibility();
      return result(state, 'changed',
        'You point out the clear side of the channel. The skipper gives the engine a short reverse pulse; the old mooring line slips off the keel guard. He brings the ferry back toward the pier.',
        'arrival_snag_cleared',
        'A loose mooring line caught beneath the ferry before South Landing. I pointed out the clear channel; the skipper reversed free and continued to the pier.');
    }
    if (id === 'arrival.look.forward') {
      state.focus = 'island';
      return result(state, 'changed', 'The south-cove landing and its high cliffs come back into view.');
    }
    if (id === 'arrival.disembark') {
      if (state.status !== 'docked') return result(state, 'blocked', 'Wait until the ferry is secured alongside the pier.');
      state.status = 'complete';
      syncVisibility();
      return result(state, 'completed',
        'Mara steps from the ferry onto the timber pier. The path climbs toward the keeper’s lodge.',
        'arrival_disembarked',
        'I came ashore at Greywake’s south pier. Iris’s message led me here; the keeper’s lodge is the first place to search.');
    }
    return result(state, 'blocked', 'That arrival action is unavailable.');
  }

  return {
    boat, start, skip, restore, snapshot, update, cameraPose, getPanel, applyAction,
    get active() { return ACTIVE_STATUSES.has(state.status); },
    get complete() { return state.status === 'complete' || state.status === 'skipped'; },
    get status() { return state.status; },
    get handoff() { return { ...ARRIVAL_ROUTE.pier }; },
  };
}
