import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ISLAND_PEOPLE, applyConversationAction, blocksIslandPersonMove,
  collidesWithIslandPerson, createIslandPeople, createPeopleState,
  getConversationPanel, listVisiblePeople, nearestIslandPerson, serializePeopleState,
} from '../src/islandPeople.js';

const context = (chapter, foundIds = [], choices = {}) => ({
  chapter, foundIds: new Set(foundIds), choices,
});

test('physical character presence follows the authored chronology', () => {
  const arrival = listVisiblePeople(context(0));
  assert.deepEqual(arrival.map((person) => person.id), ['tamsin']);
  assert.deepEqual(arrival[0].world, [9, 280]);
  const storm = listVisiblePeople(context(3, ['radio_patch'], { eliasRoute: 'ask_account' }));
  assert.deepEqual(storm.map((person) => person.id), ['tamsin', 'oren', 'elias']);
  assert.deepEqual(storm[0].world, [136, 141]);
  assert.equal(listVisiblePeople(context(3, ['radio_patch'])).some((person) => person.id === 'elias'), false,
    'Elias must not appear before the player chooses how to confront him');
  assert.equal(listVisiblePeople(context(4, ['tunnel_signal'], { eliasRoute: 'ask_account' }))
    .some((person) => person.id === 'iris'), false,
  'Iris must remain behind the service hatch until physically rescued');
  assert.equal(listVisiblePeople(context(5, ['iris_rescued'], { eliasRoute: 'ask_account' }))
    .some((person) => person.id === 'iris'), true);
});

test('dialogue gates respect observations and later topics can be revisited', () => {
  const blank = createPeopleState();
  const preNote = getConversationPanel('tamsin', blank, context(0));
  assert.deepEqual(preNote.actions.map((action) => action.id), ['arrival']);
  assert.equal(applyConversationAction(blank, 'tamsin', 'iris', context(0)).status, 'blocked');
  const afterNote = getConversationPanel('tamsin', blank, context(0, ['iris_note']));
  assert.deepEqual(afterNote.actions.map((action) => action.id), ['arrival', 'iris']);
  const first = applyConversationAction(blank, 'tamsin', 'iris', context(0, ['iris_note']));
  assert.equal(first.status, 'changed');
  assert.equal(first.source, 'FIRSTHAND');
  assert.match(first.line, /never saw what was in the prints/);
  assert.deepEqual(blank, createPeopleState(), 'prior save state must stay immutable');
  assert.equal(getConversationPanel('tamsin', first.state, context(2, ['iris_note']))
    .actions.find((action) => action.id === 'iris').heard, true);
  assert.equal(applyConversationAction(first.state, 'tamsin', 'iris', context(2, ['iris_note'])).status,
    'unchanged', 'replaying a conversation remains possible without duplicating progress');
  const survey = context(2, ['iris_note', 'headland_view', 'east_ridge_view']);
  assert.ok(getConversationPanel('tamsin', first.state, survey).actions.some((action) => action.id === 'approach'));
});

test('Elias dialogue adds context without preempting the route choice or overstating intent', () => {
  const evidence = ['radio_patch', 'lamp_strip', 'pump_service_order'];
  assert.equal(getConversationPanel('elias', createPeopleState(), context(3, evidence)), null);
  const chosen = context(3, evidence, { eliasRoute: 'show_records' });
  const panel = getConversationPanel('elias', createPeopleState(), chosen);
  assert.deepEqual(panel.actions.map((action) => action.id), ['identity', 'relay']);
  const answer = applyConversationAction(createPeopleState(), 'elias', 'relay', chosen);
  assert.match(answer.line, /cannot ask you to infer my intent/);
  assert.match(answer.journal, /physical records/);
  assert.equal(answer.state.seenTopics.elias.includes('relay'), true);
  const publicRoute = context(5, [...evidence, 'iris_rescued'], { eliasRoute: 'public_radio' });
  const publicAnswer = applyConversationAction(createPeopleState(), 'elias', 'statement', publicRoute);
  assert.match(publicAnswer.line, /will not sign/);
  assert.match(applyConversationAction(createPeopleState(), 'elias', 'statement',
    context(5, [...evidence, 'iris_rescued'], { eliasRoute: 'ask_account' })).line, /will sign/);
});

test('Iris only describes recovered records after rescue and the custody handoff', () => {
  const rescued = context(5, ['iris_rescued']);
  const first = getConversationPanel('iris', createPeopleState(), rescued);
  assert.deepEqual(first.actions.map((action) => action.id), ['condition']);
  const records = context(5, ['iris_rescued', 'lamp_strip', 'archive_draft_memo']);
  assert.deepEqual(getConversationPanel('iris', createPeopleState(), records).actions.map((action) => action.id),
    ['condition', 'strip', 'mara']);
  assert.equal(applyConversationAction(createPeopleState(), 'iris', 'custody', records).status, 'blocked');
  const handoff = context(5, ['iris_rescued', 'lamp_strip', 'archive_draft_memo', 'iris_handoff']);
  const reply = applyConversationAction(createPeopleState(), 'iris', 'custody', handoff);
  assert.match(reply.line, /I chose to keep the originals/);
  assert.equal(reply.source, 'WITNESS PREFERENCE');
});

test('conversation state serializes only valid topic IDs', () => {
  const loaded = createPeopleState({ seenTopics: {
    tamsin: ['arrival', 'arrival', 'made_up', 17],
    iris: ['condition'],
    unknown: ['arrival'],
  } });
  assert.deepEqual(loaded.seenTopics.tamsin, ['arrival']);
  assert.deepEqual(loaded.seenTopics.iris, ['condition']);
  assert.equal('unknown' in loaded.seenTopics, false);
  assert.deepEqual(serializePeopleState(loaded), loaded);
});

test('talk and body radii match visible placements without blocking escape', () => {
  const arrival = context(0);
  assert.equal(nearestIslandPerson(9, 280, arrival).id, 'tamsin');
  assert.equal(nearestIslandPerson(30, 280, arrival), null);
  assert.equal(collidesWithIslandPerson(9.3, 280, 0.35, arrival), true);
  assert.equal(collidesWithIslandPerson(11, 280, 0.35, arrival), false);
  assert.equal(blocksIslandPersonMove(10.5, 280, 9.7, 280, arrival), true);
  assert.equal(blocksIslandPersonMove(9.1, 280, 9.4, 280, arrival), false,
    'a player overlapped by a new spawn can always walk away');
});

test('original 3D figures render at terrain height and honor visibility gates', () => {
  const scene = new THREE.Scene();
  const terrainHeight = (x, z) => 22 + x * 0.001 - z * 0.001;
  const people = createIslandPeople(scene, terrainHeight);
  assert.equal(ISLAND_PEOPLE.length, 4);
  assert.equal(scene.children.length, 4);
  people.update(1, context(0));
  assert.equal(people.figures.get('tamsin').root.visible, true);
  assert.equal(people.figures.get('iris').root.visible, false);
  assert.equal(people.figures.get('tamsin').root.position.y, terrainHeight(9, 280) + 0.02);
  people.update(15, context(5, ['iris_rescued'], { eliasRoute: 'ask_account' }));
  assert.equal(people.figures.get('iris').root.visible, true);
  assert.deepEqual(people.figures.get('tamsin').root.position.toArray().filter((_, i) => i !== 1), [136, 141]);
  people.dispose();
  assert.equal(scene.children.length, 0);
});

test('nearby residents turn toward the player and gesture during dialogue without adding meshes', () => {
  const scene = new THREE.Scene();
  const people = createIslandPeople(scene, () => 0);
  const tamsin = people.figures.get('tamsin');
  const countMeshes = () => {
    let count = 0;
    tamsin.root.traverse((object) => { if (object.isMesh) count++; });
    return count;
  };
  const originalMeshes = countMeshes();
  people.update(0, { ...context(0), playerX: 0, playerZ: 260 });
  for (let tick = 1; tick <= 20; tick++) people.update(tick * 0.1,
    { ...context(0), playerX: 12, playerZ: 280, speakingId: 'tamsin' });
  const facingEast = -Math.PI / 2;
  const error = Math.atan2(Math.sin(tamsin.root.rotation.y - facingEast),
    Math.cos(tamsin.root.rotation.y - facingEast));
  assert.ok(Math.abs(error) < 0.15, 'a resident should face the nearby speaker smoothly');
  assert.ok(tamsin.arms[0].rotation.x < -0.05, 'the free arm should gesture while speaking');
  for (let tick = 21; tick <= 40; tick++) people.update(tick * 0.1,
    { ...context(0), playerX: 0, playerZ: 260 });
  const restingError = Math.atan2(Math.sin(tamsin.root.rotation.y - Math.PI),
    Math.cos(tamsin.root.rotation.y - Math.PI));
  assert.ok(Math.abs(restingError) < 0.15, 'the resident should return to their work stance');
  assert.equal(countMeshes(), originalMeshes, 'responsiveness should reuse the existing figure');
  people.dispose();
});

test('resident facing catches up after a long render frame', () => {
  const people = createIslandPeople(new THREE.Scene(), () => 0);
  const oren = people.figures.get('oren');
  people.update(0, { ...context(2), playerX: 0, playerZ: 0 });
  people.update(2.5, { ...context(2), playerX: -83, playerZ: -296.8 });
  const target = -Math.PI;
  const error = Math.atan2(Math.sin(oren.root.rotation.y - target),
    Math.cos(oren.root.rotation.y - target));
  assert.ok(Math.abs(error) < 1.6,
    'a slow frame must turn the model materially toward the nearby player');
  people.update(5, { ...context(2), playerX: -83, playerZ: -296.8 });
  const settled = Math.atan2(Math.sin(oren.root.rotation.y - target),
    Math.cos(oren.root.rotation.y - target));
  assert.ok(Math.abs(settled) < 0.1,
    'after two slow frames the model should face the player, rather than show its back');
  people.dispose();
});

test('Tamsin keeps the talkable procedural figure until the nearby CC0 asset loads', () => {
  const scene = new THREE.Scene();
  let finishLoad;
  let loadCount = 0;
  const tamsinLoader = { load(url, onLoad) {
    assert.match(url, /assets\/tamsin\.glb$/);
    loadCount++;
    finishLoad = onLoad;
  } };
  const people = createIslandPeople(scene, () => 0, { tamsinLoader });
  const tamsin = people.figures.get('tamsin');
  const fallback = tamsin.figure;
  people.update(0, { ...context(0), playerX: 0, playerZ: 0 });
  assert.equal(loadCount, 0, 'the large model must not load far from the resident');
  people.update(1, { ...context(0), playerX: 9, playerZ: 281 });
  assert.equal(loadCount, 1);
  assert.equal(fallback.visible, true, 'the body remains until the GLB succeeds');
  const asset = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.62, 0.2),
    new THREE.MeshStandardMaterial());
  body.position.y = 0.81;
  asset.add(body);
  finishLoad({ scene: asset });
  assert.equal(fallback.visible, false);
  assert.equal(tamsin.figure.name, 'Tamsin CC0 character');
  assert.equal(tamsin.root.userData.asset, 'cc0-makehuman');
  assert.equal(nearestIslandPerson(9, 281, context(0)).id, 'tamsin');
  people.update(2, { ...context(0), playerX: 9, playerZ: 281 });
  assert.equal(loadCount, 1, 'later frames must reuse the loaded model');
  people.dispose();
});

test('a successful character swap releases its old body but keeps the shared fallback texture alive', () => {
  const scene = new THREE.Scene();
  let finishLoad;
  const people = createIslandPeople(scene, () => 0, {
    tamsinLoader: { load(_url, onLoad) { finishLoad = onLoad; } },
  });
  const tamsin = people.figures.get('tamsin');
  const fallback = tamsin.figure;
  const sample = fallback.children.find((child) => child.isMesh);
  const weave = sample.material.map;
  let geometryDisposals = 0;
  let materialDisposals = 0;
  let weaveDisposals = 0;
  const originalGeometryDispose = sample.geometry.dispose.bind(sample.geometry);
  const originalMaterialDispose = sample.material.dispose.bind(sample.material);
  const originalWeaveDispose = weave.dispose.bind(weave);
  sample.geometry.dispose = () => { geometryDisposals++; originalGeometryDispose(); };
  sample.material.dispose = () => { materialDisposals++; originalMaterialDispose(); };
  weave.dispose = () => { weaveDisposals++; originalWeaveDispose(); };

  people.update(1, { ...context(0), playerX: 9, playerZ: 280 });
  assert.equal(fallback.parent, tamsin.root, 'the fallback must remain while loading');
  const character = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.62, 0.2),
    new THREE.MeshStandardMaterial());
  body.position.y = 0.81;
  character.add(body);
  finishLoad({ scene: character });
  assert.equal(fallback.parent, null, 'the hidden fallback should leave the live scene');
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.equal(tamsin.head.children.length, 0, 'bone controls must not retain fallback meshes');
  assert.equal(tamsin.head.parent, null);
  assert.ok(tamsin.arms.every((arm) => arm.children.length === 0 && arm.parent === null));
  assert.equal(weaveDisposals, 0, 'other procedural residents still share the weave');
  assert.equal(people.figures.get('oren').figure.children[0].material.map, weave);
  assert.equal(tamsin.root.userData.asset, 'cc0-makehuman');
  people.dispose();
  assert.equal(weaveDisposals, 1, 'dispose also frees the weave after every body is gone');
});

test('a failed character request retains the procedural resident and interaction', () => {
  const scene = new THREE.Scene();
  let failLoad;
  let requests = 0;
  const people = createIslandPeople(scene, () => 0, {
    tamsinLoader: { load(_url, _onLoad, _progress, onError) {
      requests++;
      failLoad = onError;
    } },
  });
  const fallback = people.figures.get('tamsin').figure;
  people.update(0, { ...context(0), playerX: 9, playerZ: 280 });
  const previousWarn = console.warn;
  console.warn = () => {};
  try { failLoad(new Error('offline')); } finally { console.warn = previousWarn; }
  people.update(1, { ...context(0), playerX: 9, playerZ: 280 });
  assert.equal(requests, 1, 'an unavailable asset must not retry every frame');
  assert.equal(fallback.parent, people.figures.get('tamsin').root);
  assert.equal(fallback.visible, true);
  assert.equal(nearestIslandPerson(9, 280, context(0)).id, 'tamsin');
  people.dispose();
});

test('Iris loads her distinct CC0 body only after rescue and close approach', () => {
  const scene = new THREE.Scene();
  let finishLoad;
  let loadCount = 0;
  const irisLoader = { load(url, onLoad) {
    assert.match(url, /assets\/iris\.glb$/);
    finishLoad = onLoad;
    loadCount++;
  } };
  const people = createIslandPeople(scene, () => 0, { irisLoader });
  const iris = people.figures.get('iris');
  const fallback = iris.figure;
  const rescued = { ...context(5, ['iris_rescued']), playerX: 176, playerZ: 157 };
  people.update(0, { ...context(4), playerX: 176, playerZ: 157 });
  assert.equal(loadCount, 0, 'do not load Iris before her rescue');
  people.update(1, { ...rescued, playerX: 0, playerZ: 0 });
  assert.equal(loadCount, 0, 'do not load the full model across the island');
  people.update(2, rescued);
  assert.equal(loadCount, 1);
  assert.equal(fallback.visible, true);
  const asset = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.66, 0.2),
    new THREE.MeshStandardMaterial());
  body.position.y = 0.93;
  asset.add(body);
  finishLoad({ scene: asset });
  assert.equal(fallback.visible, false);
  assert.equal(iris.figure.name, 'Iris CC0 character');
  assert.ok(iris.figure.getObjectByName('Iris sealed document case'));
  assert.equal(iris.root.userData.asset, 'cc0-makehuman');
  assert.equal(nearestIslandPerson(176, 157, rescued).id, 'iris');
  assert.ok(Math.abs(iris.figure.userData.baseY + 0.1) < 0.00001);
  people.update(3, rescued);
  assert.ok(Math.abs(iris.figure.position.y - iris.figure.userData.baseY) <= 0.0061,
    'breathing must preserve the model ground offset');
  assert.equal(loadCount, 1);
  people.dispose();
});

test('Oren and Elias load their own bodies only when present and approached', () => {
  const scene = new THREE.Scene();
  const requests = [];
  const pending = {};
  const loader = (id) => ({ load(url, onLoad) {
    assert.match(url, new RegExp(`assets/${id}\\.glb$`));
    requests.push(id);
    pending[id] = onLoad;
  } });
  const people = createIslandPeople(scene, () => 0,
    { orenLoader: loader('oren'), eliasLoader: loader('elias') });
  const oren = people.figures.get('oren');
  const elias = people.figures.get('elias');
  const orenFallback = oren.figure;
  const eliasFallback = elias.figure;

  people.update(0, { ...context(0), playerX: -83, playerZ: -300 });
  assert.deepEqual(requests, [], 'Oren must not fetch before his story appearance');
  people.update(1, { ...context(2), playerX: 0, playerZ: 0 });
  assert.deepEqual(requests, [], 'neither large asset should load across the island');
  people.update(2, { ...context(2), playerX: -83, playerZ: -300 });
  assert.deepEqual(requests, ['oren']);
  assert.equal(orenFallback.visible, true);
  people.update(3, { ...context(3), playerX: 159, playerZ: -43 });
  assert.deepEqual(requests, ['oren'], 'Elias remains absent before the route choice');
  people.update(4, { ...context(3, [], { eliasRoute: 'ask_account' }),
    playerX: 159, playerZ: -43 });
  assert.deepEqual(requests, ['oren', 'elias']);
  assert.equal(eliasFallback.visible, true);

  for (const [id, height] of [['oren', 1.77], ['elias', 1.73]]) {
    const asset = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, 0.2),
      new THREE.MeshStandardMaterial());
    body.position.y = height / 2;
    asset.add(body);
    pending[id]({ scene: asset });
    const figure = people.figures.get(id);
    assert.equal(figure.figure.name, `${id[0].toUpperCase()}${id.slice(1)} CC0 character`);
    assert.equal(figure.root.userData.asset, 'cc0-makehuman');
    assert.ok(figure.figure.getObjectByName(id === 'oren'
      ? 'Oren depth jotting board' : 'Elias portable radio pouch'));
    assert.equal((id === 'oren' ? orenFallback : eliasFallback).visible, false);
  }
  people.update(5, { ...context(3, [], { eliasRoute: 'ask_account' }),
    playerX: 159, playerZ: -43 });
  assert.deepEqual(requests, ['oren', 'elias'], 'loaded residents should reuse their body');
  people.dispose();
});
