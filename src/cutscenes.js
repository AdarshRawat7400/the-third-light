import * as THREE from 'three';

// All coordinates are offsets from the world-space origin supplied by the
// caller. The three origins are South Pier, the service hatch, and North Jetty.
// The dialogue says only what the player has already established at each beat.
export const CUTSCENES = Object.freeze({
  ferry_landing: Object.freeze({
    title: 'South Landing', duration: 7.4,
    shots: Object.freeze([
      Object.freeze({ at: 0, eye: [8, 4.1, 19], look: [-12, 17, -58], fov: 63,
        line: 'Greywake rises out of the rain.' }),
      Object.freeze({ at: 2.6, eye: [5, 5.4, 8], look: [-31, 31, -115], fov: 59,
        line: 'One low pier breaks the cliff line.' }),
      Object.freeze({ at: 5.1, eye: [3.2, 2.8, 2.5], look: [-17, 10, -51], fov: 64,
        line: 'Iris’s message led me here.' }),
    ]),
  }),
  service_rescue: Object.freeze({
    title: 'The Service Hatch', duration: 11.8,
    shots: Object.freeze([
      Object.freeze({ at: 0, eye: [2.7, 2.7, 5.6], look: [0.2, 1.1, 0], fov: 57,
        line: 'The gate gives. The water falls below the rail.' }),
      Object.freeze({ at: 4.0, eye: [3.7, 2.55, 4.8], look: [2.2, 1.1, 1.2], fov: 55,
        line: 'Iris climbs into the rain with the records.' }),
      Object.freeze({ at: 8.0, eye: [5.4, 2.65, 4.2], look: [8.9, 1.5, 6.9], fov: 60,
        line: 'She carries the originals herself.' }),
    ]),
  }),
  north_jetty_daybreak: Object.freeze({
    title: 'North Inlet · Daybreak', duration: 8.0,
    shots: Object.freeze([
      Object.freeze({ at: 0, eye: [2.4, 3.3, 10.5], look: [-4, 2.5, -28], fov: 64,
        line: 'The north inlet is quiet at daybreak.' }),
      Object.freeze({ at: 2.8, eye: [-4, 3.7, 7.5], look: [-11, 1.8, -53], fov: 58,
        line: 'The correction has reached the mainland.' }),
      Object.freeze({ at: 5.4, eye: [-7, 3.5, 4], look: [-6, 1.8, -45], fov: 63,
        line: 'The witnesses and the family decide what comes next.' }),
    ]),
  }),
});

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => { const t = clamp01(value); return t * t * (3 - 2 * t); };
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

function validOrigin(origin) {
  if (!origin || !['x', 'y', 'z'].every((key) => Number.isFinite(origin[key]))) {
    throw new TypeError('Cutscene origin requires finite x, y, and z coordinates.');
  }
  return { x: origin.x, y: origin.y, z: origin.z };
}

function offset(origin, values) {
  return {
    x: origin.x + values[0],
    y: origin.y + values[1],
    z: origin.z + values[2],
  };
}

function interpolate(a, b, amount) {
  return {
    x: THREE.MathUtils.lerp(a.x, b.x, amount),
    y: THREE.MathUtils.lerp(a.y, b.y, amount),
    z: THREE.MathUtils.lerp(a.z, b.z, amount),
  };
}

/** Pure timeline sampler, useful for previews and for deterministic tests. */
export function sampleCutscene(id, seconds, {
  origin = { x: 0, y: 0, z: 0 }, reducedMotion = false,
} = {}) {
  const definition = CUTSCENES[id];
  if (!definition) throw new RangeError(`Unknown cutscene: ${id}`);
  const base = validOrigin(origin);
  const time = Math.min(definition.duration, Math.max(0, finite(seconds)));
  const shots = definition.shots;
  let index = 0;
  while (index + 1 < shots.length && shots[index + 1].at <= time) index++;
  const from = shots[index];
  const to = shots[Math.min(index + 1, shots.length - 1)];
  const mix = to === from ? 0 : smooth((time - from.at) / (to.at - from.at));
  const eye = interpolate(offset(base, from.eye), offset(base, to.eye), mix);
  const look = interpolate(offset(base, from.look), offset(base, to.look), mix);
  // The final frame stays visible until the player presses Continue. Fading
  // it out before that gesture would flash the HUD through the letterbox.
  const fade = Math.min(1, time / 0.48);
  return {
    id, title: definition.title, line: from.line,
    seconds: time, duration: definition.duration,
    progress: time / definition.duration,
    done: time >= definition.duration,
    opacity: reducedMotion ? 1 : clamp01(fade),
    pose: reducedMotion ? null : { eye, look,
      fov: THREE.MathUtils.lerp(from.fov, to.fov, mix) },
  };
}

/** Only known completed IDs should be restored from a saved game. */
export function restoreCutsceneFlags(raw) {
  const values = raw instanceof Set ? [...raw] : Array.isArray(raw) ? raw : [];
  return new Set(values.filter((id) => Object.hasOwn(CUTSCENES, id)));
}

export function shouldPlayCutscene(id, completedIds) {
  return Object.hasOwn(CUTSCENES, id) && !restoreCutsceneFlags(completedIds).has(id);
}

function createOverlay(root) {
  if (!root?.ownerDocument) return null;
  const doc = root.ownerDocument;
  const overlay = doc.createElement('div');
  overlay.className = 'third-light-cutscene';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Cinematic scene');
  overlay.style.cssText = `position:fixed;inset:0;z-index:12;display:flex;
    flex-direction:column;justify-content:space-between;align-items:stretch;
    color:#f3e9d7;pointer-events:auto;text-shadow:0 2px 12px #000;
    font-family:'DM Sans',Arial,sans-serif;`;
  const top = doc.createElement('div');
  top.style.cssText = `height:clamp(32px,9vh,95px);background:#060d12;
    display:flex;align-items:center;padding:0 max(24px,env(safe-area-inset-left));
    border-bottom:1px solid #63736e;letter-spacing:.2em;font-size:10px;`;
  const title = doc.createElement('span');
  top.appendChild(title);
  const bottom = doc.createElement('div');
  bottom.style.cssText = `min-height:clamp(110px,22vh,188px);background:#060d12;
    display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;
    gap:16px;padding:15px max(24px,env(safe-area-inset-right))
    max(15px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));
    border-top:1px solid #63736e;box-sizing:border-box;`;
  const line = doc.createElement('p');
  line.setAttribute('role', 'status');
  line.setAttribute('aria-live', 'polite');
  line.setAttribute('aria-atomic', 'true');
  line.style.cssText = `margin:0;max-width:min(670px,70vw);
    font:clamp(17px,2.2vw,27px)/1.4 'Libre Baskerville',Georgia,serif;`;
  const button = doc.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-keyshortcuts', 'Escape');
  button.style.cssText = `min-height:48px;min-width:135px;padding:10px 17px;
    border:1px solid #d0b58b;background:#1e2b2d;color:#f5e4c7;
    font:700 11px 'DM Sans',Arial,sans-serif;letter-spacing:.14em;
    cursor:pointer;touch-action:manipulation;`;
  const motionButton = doc.createElement('button');
  motionButton.type = 'button';
  motionButton.style.cssText = `min-height:48px;min-width:135px;padding:10px 17px;
    border:1px solid #667b78;background:#132024;color:#d3e4dc;
    font:700 11px 'DM Sans',Arial,sans-serif;letter-spacing:.1em;
    cursor:pointer;touch-action:manipulation;`;
  const controls = doc.createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;align-items:center;';
  controls.append(motionButton, button);
  bottom.append(line, controls);
  overlay.append(top, bottom);
  root.appendChild(overlay);
  return { overlay, title, line, button, motionButton, doc };
}

/**
 * Start only after the triggering evidence/action is committed. The game owns
 * save flags, movement pause, and audio. `onSuspend` runs before pointer lock
 * is released and may return a token that `onResume` receives. The root marks
 * an ID as seen only from `onComplete` (`finished` or `skipped`). `cancel()`
 * resumes controls without a completion event, so reload can replay the scene.
 *
 * Call update after the normal camera pose and before rendering. The final
 * shot waits for Continue/Enter; this supplies a gesture for pointer lock.
 */
export function createCutsceneDirector({
  camera, root = globalThis.document?.body, reducedMotion,
  onSuspend = () => undefined, onResume = () => {}, onComplete = () => {},
  releasePointerLock = true,
} = {}) {
  if (!camera?.position || !camera?.quaternion || !Number.isFinite(camera?.fov)
    || typeof camera.updateProjectionMatrix !== 'function') {
    throw new TypeError('Cutscene director requires a PerspectiveCamera.');
  }
  const view = createOverlay(root);
  if (view) view.overlay.style.display = 'none';
  // Cameras look along local -Z; a plain Object3D.lookAt points +Z and
  // would turn every authored shot out toward the open sea.
  const target = new THREE.Camera();
  let current = null;
  let disposed = false;
  let lastLine = '';
  let lastAwaiting = false;

  function motionReduced(override) {
    if (typeof override === 'boolean') return override;
    if (typeof reducedMotion === 'boolean') return reducedMotion;
    return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  function restoreCamera(snapshot) {
    camera.position.copy(snapshot.position);
    camera.quaternion.copy(snapshot.quaternion);
    if (camera.fov !== snapshot.fov) {
      camera.fov = snapshot.fov;
      camera.updateProjectionMatrix();
    }
  }

  function end(reason, completed) {
    if (!current) return false;
    const ending = current;
    current = null;
    restoreCamera(ending.savedCamera);
    if (view) {
      view.overlay.style.display = 'none';
      view.overlay.style.opacity = '0';
      // The arrival beat often follows a modal whose action button is now
      // hidden. Do not return screen-reader focus to that invisible control.
      if (ending.previousFocus?.isConnected
        && !ending.previousFocus.closest?.('.hidden')) ending.previousFocus.focus?.();
    }
    onResume({ id: ending.id, reason, token: ending.suspendToken });
    if (completed) onComplete({ id: ending.id, reason });
    return true;
  }

  function skip() { return end('skipped', true); }
  function continueScene() {
    if (!current?.awaitingContinue) return false;
    return end('finished', true);
  }
  function cancel() { return end('cancelled', false); }

  function toggleMotion() {
    if (!current) return false;
    current.reducedMotion = !current.reducedMotion;
    if (current.reducedMotion) restoreCamera(current.savedCamera);
    if (view) {
      view.motionButton.textContent = current.reducedMotion
        ? 'CAMERA MOTION: OFF' : 'CAMERA MOTION: ON';
      view.motionButton.setAttribute('aria-pressed', String(current.reducedMotion));
    }
    update(0);
    return current.reducedMotion;
  }

  function keydown(event) {
    if (!current) return;
    if (event.code === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation?.(); skip();
    } else if (event.code === 'Enter' || event.code === 'Space') {
      event.preventDefault(); event.stopImmediatePropagation?.();
      if (view?.doc.activeElement === view?.motionButton) toggleMotion();
      else if (current.awaitingContinue) continueScene();
      else skip();
    } else if (event.code === 'Tab') {
      event.preventDefault(); event.stopImmediatePropagation?.();
      const next = view?.doc.activeElement === view?.button
        ? view.motionButton : view.button;
      next?.focus?.();
    } else {
      // Game inputs are frozen by onSuspend. Stop document shortcuts, too.
      event.stopImmediatePropagation?.();
    }
  }
  view?.doc.addEventListener?.('keydown', keydown, true);
  // closeModal() may have a requestPointerLock promise still in flight when
  // the scene starts. Release that late lock as well so Skip stays clickable.
  function pointerlockchange() {
    if (releasePointerLock && current && view?.doc.pointerLockElement) {
      view.doc.exitPointerLock?.();
    }
  }
  view?.doc.addEventListener?.('pointerlockchange', pointerlockchange);
  if (view) view.button.addEventListener('click', () => {
    if (current?.awaitingContinue) continueScene();
    else skip();
  });
  view?.motionButton.addEventListener('click', toggleMotion);

  function start(id, { origin, reducedMotion: motionOverride } = {}) {
    if (disposed || current || !Object.hasOwn(CUTSCENES, id)) return false;
    const base = validOrigin(origin);
    const savedCamera = {
      position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov,
    };
    const previousFocus = view?.doc.activeElement ?? null;
    const suspendToken = onSuspend({ id });
    current = {
      id, origin: base, reducedMotion: motionReduced(motionOverride),
      seconds: 0, awaitingContinue: false, savedCamera, previousFocus, suspendToken,
    };
    lastLine = '';
    lastAwaiting = false;
    if (releasePointerLock && view?.doc.pointerLockElement) {
      view.doc.exitPointerLock?.();
    }
    if (view) {
      view.title.textContent = CUTSCENES[id].title.toUpperCase();
      view.overlay.setAttribute('aria-label', `${CUTSCENES[id].title} cinematic scene`);
      view.overlay.style.display = 'flex';
      view.overlay.style.opacity = '0';
      view.button.textContent = 'SKIP SCENE · ESC';
      view.motionButton.textContent = current.reducedMotion
        ? 'CAMERA MOTION: OFF' : 'CAMERA MOTION: ON';
      view.motionButton.setAttribute('aria-pressed', String(current.reducedMotion));
      view.button.focus?.();
    }
    update(0);
    return true;
  }

  function update(dt) {
    if (!current) return null;
    current.seconds = Math.min(CUTSCENES[current.id].duration,
      current.seconds + Math.max(0, Math.min(1, finite(dt))));
    const frame = sampleCutscene(current.id, current.seconds, {
      origin: current.origin, reducedMotion: current.reducedMotion,
    });
    current.awaitingContinue = frame.done;
    if (frame.pose) {
      target.position.set(frame.pose.eye.x, frame.pose.eye.y, frame.pose.eye.z);
      target.lookAt(frame.pose.look.x, frame.pose.look.y, frame.pose.look.z);
      const entry = smooth(current.seconds / 0.68);
      camera.position.copy(current.savedCamera.position).lerp(target.position, entry);
      camera.quaternion.copy(current.savedCamera.quaternion).slerp(target.quaternion, entry);
      const fov = THREE.MathUtils.lerp(current.savedCamera.fov, frame.pose.fov, entry);
      if (Math.abs(camera.fov - fov) > 0.001) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    }
    if (view) {
      view.overlay.style.opacity = String(frame.done ? 1 : frame.opacity);
      if (frame.line !== lastLine) {
        lastLine = frame.line;
        view.line.textContent = frame.line;
      }
      if (current.awaitingContinue !== lastAwaiting) {
        lastAwaiting = current.awaitingContinue;
        view.button.textContent = lastAwaiting ? 'CONTINUE · ENTER' : 'SKIP SCENE · ESC';
        view.button.setAttribute('aria-keyshortcuts', lastAwaiting ? 'Enter' : 'Escape');
      }
    }
    return frame;
  }

  function dispose() {
    if (disposed) return;
    cancel();
    disposed = true;
    view?.doc.removeEventListener?.('keydown', keydown, true);
    view?.doc.removeEventListener?.('pointerlockchange', pointerlockchange);
    view?.overlay.remove();
  }

  return {
    start, update, skip, continue: continueScene, cancel, dispose,
    get active() { return current !== null; },
    get id() { return current?.id ?? null; },
    get awaitingContinue() { return current?.awaitingContinue ?? false; },
  };
}
