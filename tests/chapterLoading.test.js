import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createChapterLoadingScreen, trackAssetLoading } from '../src/chapterLoading.js';

test('chapter load waits for all nested Three resources, including later texture requests', async () => {
  const manager = new THREE.LoadingManager();
  const updates = [];
  const loading = trackAssetLoading(manager, (progress) => updates.push(progress));
  manager.itemStart('/assets/house.glb');
  const finished = loading.whenIdle();
  let settled = false;
  void finished.then(() => { settled = true; });
  manager.itemStart('/assets/shared_images/roof.webp');
  manager.itemEnd('/assets/house.glb');
  await Promise.resolve();
  assert.equal(settled, false, 'a loaded GLB must not release the screen while its image remains');
  assert.deepEqual(loading.snapshot(), { loaded: 1, total: 2, pending: 1, errors: 0 });
  manager.itemEnd('/assets/shared_images/roof.webp');
  assert.deepEqual(await finished, { loaded: 2, total: 2, pending: 0, errors: 0 });
  assert.equal(updates.at(-1).pending, 0);

  manager.itemStart('/assets/late-character.glb');
  manager.itemError('/assets/late-character.glb');
  assert.equal(loading.snapshot().errors, 1);
  manager.itemEnd('/assets/late-character.glb');
  assert.equal((await loading.whenIdle()).pending, 0);
});

test('a completed older chapter load cannot uncover a newer chapter screen', () => {
  const previousDocument = globalThis.document;
  const elements = Object.fromEntries(['screen', 'hud', 'modal', 'touch-controls']
    .map((id) => [id, { inert: false }]));
  globalThis.document = {
    getElementById: (id) => elements[id],
    activeElement: { blur() {} },
  };
  const fields = Object.fromEntries(['#loading-heading', '#loading-detail', '#loading-progress', '#loading-count']
    .map((id) => [id, { textContent: '', removeAttribute(name) { delete this[name]; } }]));
  const root = {
    hidden: false,
    querySelector: (id) => fields[id],
    setAttribute() {}, removeAttribute() {},
  };
  try {
    const screen = createChapterLoadingScreen(root);
    const first = screen.show('CHAPTER 2');
    screen.setPhase('assets', 'Loading models and textures…');
    screen.updateProgress({ loaded: 4, total: 9, pending: 5, errors: 0 });
    assert.equal(fields['#loading-progress'].value, 4);
    assert.equal(fields['#loading-count'].textContent, '4 OF 9 RESOURCES LOADED');
    const second = screen.show('CHAPTER 3');
    assert.equal(screen.hide(first), false);
    assert.equal(root.hidden, false);
    assert.equal(elements.screen.inert, true);
    assert.equal(screen.hide(second), true);
    assert.equal(root.hidden, true);
    assert.equal(elements.screen.inert, false);
  } finally {
    globalThis.document = previousDocument;
  }
});
