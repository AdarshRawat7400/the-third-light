import test from 'node:test';
import assert from 'node:assert/strict';
import { createFallPresentation, sampleFallPresentation } from '../src/fallPresentation.js';

function fakeRoot() {
  const root = { children: [], ownerDocument: null };
  root.ownerDocument = {
    createElement() {
      return {
        style: {}, children: [], textContent: '',
        setAttribute() {},
        appendChild(child) { this.children.push(child); },
        remove() { root.children = root.children.filter((entry) => entry !== this); },
      };
    },
  };
  root.appendChild = (child) => root.children.push(child);
  return root;
}

test('fall visuals show a short impact and clear during respawn', () => {
  const falling = sampleFallPresentation({ phase: 'falling', progress: 0.5, dropMeters: 12 });
  const impact = sampleFallPresentation({ phase: 'impact', progress: 0, dropMeters: 30 });
  const respawn = sampleFallPresentation({ phase: 'respawn', progress: 1 });
  assert.equal(falling.cameraDrop, 12);
  assert.ok(falling.cameraRoll > 0.1);
  assert.ok(impact.foamOpacity > 0.5);
  assert.equal(impact.status, 'Fallen into the sea.');
  assert.equal(respawn.opacity, 0);
  assert.equal(respawn.cameraDrop, 0);
});

test('reduced motion keeps feedback while removing roll, blur, and impact flash', () => {
  for (const phase of ['falling', 'impact', 'respawn']) {
    const frame = sampleFallPresentation({ phase, progress: 0.5, reducedMotion: true });
    assert.equal(frame.cameraRoll, 0);
    assert.equal(frame.blurPx, 0);
    assert.equal(frame.foamOpacity, 0);
  }
  assert.equal(sampleFallPresentation({ phase: 'impact', reducedMotion: true }).status,
    'Fallen into the sea.');
});

test('camera drop is idempotent and reset restores the original pose', () => {
  const root = fakeRoot();
  const camera = { position: { y: 55 }, rotation: { z: 0 } };
  const presentation = createFallPresentation({ camera, root, reducedMotion: false });
  presentation.update(1 / 60, { phase: 'falling', progress: 0.5, dropMeters: 10 });
  assert.equal(camera.position.y, 45);
  assert.ok(camera.rotation.z > 0);
  presentation.update(1 / 60, { phase: 'falling', progress: 0.6, dropMeters: 15 });
  assert.equal(camera.position.y, 40, 'the prior drop is removed before the next update');
  presentation.update(1 / 60, { phase: 'respawn', progress: 0.5 });
  assert.equal(camera.position.y, 55);
  assert.equal(camera.rotation.z, 0);
  presentation.dispose();
  assert.equal(root.children.length, 0);
});
