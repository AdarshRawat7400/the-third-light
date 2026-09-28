import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createEvidenceProps, EVIDENCE_FACE_FACTS } from '../src/evidenceProps.js';
import { CLUES, SITES } from '../src/story.js';
import { BUILDING_SHAPES, ARCHIVE_FURNITURE, archiveFurnitureBlocks } from '../src/collision.js';

test('source-bearing radio and pump clues have distinct props at their original interaction anchors', () => {
  const scene = new THREE.Scene();
  const terrainHeight = (x, z) => 12 + x * 0.001 + z * 0.002;
  const evidence = createEvidenceProps(scene, SITES, CLUES, terrainHeight);
  const kinds = {
    lamp_strip: 'relay_strip',
    island_loop_ledger: 'loop_ledger',
    radio_unsent_call: 'distress_form',
    pump_service_order: 'service_order',
    pump_iris_route: 'bypass_sketch',
    daybreak_report: 'correction_terminal',
  };
  for (const [id, kind] of Object.entries(kinds)) {
    const clue = CLUES.find((item) => item.id === id);
    const site = SITES.find((item) => item.id === clue.room);
    const prop = evidence.entries.get(id);
    assert.ok(prop, `${id} has a physical prop`);
    assert.equal(prop.userData.evidenceKind, kind);
    assert.equal(prop.position.x, site.x + clue.x);
    assert.equal(prop.position.z, site.z + clue.z);
    assert.ok(Math.abs(prop.position.y - terrainHeight(site.x, site.z) - 0.07) < 1e-9);
    let meshCount = 0;
    prop.traverse((object) => { if (object.isMesh) meshCount++; });
    assert.ok(meshCount >= 4, `${id} has a readable 3D silhouette`);
    const bounds = new THREE.Box3().setFromObject(prop);
    const room = BUILDING_SHAPES[site.id];
    assert.ok(bounds.min.x > site.x - room.halfWidth && bounds.max.x < site.x + room.halfWidth,
      `${id} stays within the room's side walls`);
    assert.ok(bounds.min.z > site.z - room.halfDepth && bounds.max.z < site.z + room.halfDepth,
      `${id} stays within the room's end walls`);
  }

  let relayDraws = 0;
  evidence.entries.get('lamp_strip').traverse((object) => {
    if (object.isMesh) relayDraws++;
  });
  assert.ok(relayDraws <= 8, 'the source-critical relay strip uses a few draws rather than individual punched marks');
  evidence.dispose();
  assert.equal(scene.children.includes(evidence.group), false);
});

test('source records have distinct, bounded physical props and factual markings', () => {
  const scene = new THREE.Scene();
  const terrainHeight = () => 35;
  const evidence = createEvidenceProps(scene, SITES, CLUES, terrainHeight);
  const expected = {
    official_log: 'typed_log',
    captain_statement: 'captain_testimony',
    archive_draft_memo: 'draft_memo',
    archive_revision_stamp: 'revision_stamp',
    archive_witness_addendum: 'witness_addendum',
    prison_intake_ledger: 'intake_ledger',
    west_gale_chart: 'gale_reel',
    tower_failover_tag: 'failover_tag',
    tower_training_card: 'training_card',
    north_jetty_sounding: 'sounding_board',
    tunnel_water_mark: 'waterline_stain',
  };
  for (const [id, kind] of Object.entries(expected)) {
    const clue = CLUES.find((item) => item.id === id);
    const prop = evidence.entries.get(id);
    assert.ok(prop, `${id} has a physical evidence object`);
    assert.equal(prop.userData.evidenceKind, kind);
    assert.deepEqual(EVIDENCE_FACE_FACTS[kind].length, 3, `${id} has three concise visible facts`);
    assert.equal(prop.position.x, clue.room ? SITES.find((site) => site.id === clue.room).x + clue.x : clue.world[0]);
    assert.equal(prop.position.z, clue.room ? SITES.find((site) => site.id === clue.room).z + clue.z : clue.world[1]);
    let draws = 0;
    prop.traverse((object) => { if (object.isMesh) draws++; });
    assert.ok(draws >= 5 && draws <= 9, `${id} uses 5–9 visible meshes, found ${draws}`);
    const bounds = new THREE.Box3().setFromObject(prop);
    assert.ok(bounds.max.y - bounds.min.y <= 2.15, `${id} stays below the room/canopy ceiling`);
    if (clue.room && BUILDING_SHAPES[clue.room]) {
      const site = SITES.find((item) => item.id === clue.room);
      const room = BUILDING_SHAPES[clue.room];
      assert.ok(bounds.min.x > site.x - room.halfWidth && bounds.max.x < site.x + room.halfWidth,
        `${id} stays clear of the side walls`);
      assert.ok(bounds.min.z > site.z - room.halfDepth && bounds.max.z < site.z + room.halfDepth,
        `${id} stays clear of the end walls`);
    }
  }
  const intake = new THREE.Box3().setFromObject(evidence.entries.get('prison_intake_ledger'));
  assert.ok(intake.min.x > -59.1 && intake.max.x < -54.9 && intake.min.z > 96.3 && intake.max.z < 99.7,
    'the detention ledger fits under the existing intake canopy');
  const sounding = new THREE.Box3().setFromObject(evidence.entries.get('north_jetty_sounding'));
  assert.ok(sounding.min.x > -68 && sounding.max.x < -62,
    'the depth board stays on the north jetty deck');
  assert.ok(sounding.max.x - sounding.min.x < 0.9 && sounding.max.y - sounding.min.y < 1.6,
    'the sign fits a small pier-side stand instead of blocking the sea view');
  const soundingVisual = evidence.entries.get('north_jetty_sounding').children[0];
  assert.ok(soundingVisual.position.z < -2 && soundingVisual.position.x > 1,
    'the sign is mounted beyond the inspection anchor along the pier edge');
  evidence.dispose();
});

test('record face markings are actually drawn into the browser canvas labels', () => {
  const originalDocument = globalThis.document;
  const drawn = new Set();
  const context = {
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, arc() {}, stroke() {}, fill() {},
    fillText(value) { drawn.add(value); },
  };
  globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
  let evidence;
  try {
    evidence = createEvidenceProps(new THREE.Scene(), SITES, CLUES, () => 35);
    for (const [kind, lines] of Object.entries(EVIDENCE_FACE_FACTS)) {
      for (const line of lines) assert.ok(drawn.has(line), `${kind} renders ${line}`);
    }
  } finally {
    evidence?.dispose();
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});

test('archive records clear authored shelves while signed papers sit on the real table', () => {
  const scene = new THREE.Scene();
  const evidence = createEvidenceProps(scene, SITES, CLUES, () => 35);
  const site = SITES.find((item) => item.id === 'archive');
  const floorRecords = [
    'official_log', 'captain_statement', 'archive_draft_memo',
    'archive_revision_stamp', 'archive_witness_addendum', 'archive_chart',
  ];
  const intersectsFootprint = (bounds, piece) => {
    const minX = site.x + piece.x - piece.halfWidth;
    const maxX = site.x + piece.x + piece.halfWidth;
    const minZ = site.z + piece.z - piece.halfDepth;
    const maxZ = site.z + piece.z + piece.halfDepth;
    return bounds.max.x > minX && bounds.min.x < maxX
      && bounds.max.z > minZ && bounds.min.z < maxZ;
  };
  for (const id of floorRecords) {
    const clue = CLUES.find((item) => item.id === id);
    const bounds = new THREE.Box3().setFromObject(evidence.entries.get(id));
    for (const piece of ARCHIVE_FURNITURE) {
      assert.equal(intersectsFootprint(bounds, piece), false,
        `${id} stays out of ${piece.id}`);
    }
    const candidates = [[0, 0.85], [-0.7, 0.85], [0.7, 0.85], [0, 1.6]];
    assert.ok(candidates.some(([dx, dz]) => {
      const x = site.x + clue.x + dx;
      const z = site.z + clue.z + dz;
      return !archiveFurnitureBlocks(site, x, z)
        && Math.abs(x - site.x) < BUILDING_SHAPES.archive.halfWidth - 0.32
        && Math.abs(z - site.z) < BUILDING_SHAPES.archive.halfDepth - 0.32
        && Math.hypot(dx, dz) < 3.25;
    }), `${id} has a clear place to stand within interaction range`);
  }
  const table = ARCHIVE_FURNITURE.find((piece) => piece.id === 'central_table');
  for (const id of ['archive_signing_finding', 'archive_reconstruction']) {
    const bounds = new THREE.Box3().setFromObject(evidence.entries.get(id));
    assert.ok(bounds.min.x > site.x + table.x - table.halfWidth
      && bounds.max.x < site.x + table.x + table.halfWidth
      && bounds.min.z > site.z + table.z - table.halfDepth
      && bounds.max.z < site.z + table.z + table.halfDepth,
    `${id} visibly rests within the actual central table`);
    assert.ok(bounds.min.y > 35.95, `${id} is above the tabletop`);
  }
  const signed = new THREE.Box3().setFromObject(evidence.entries.get('archive_signing_finding'));
  const reconstruction = new THREE.Box3().setFromObject(evidence.entries.get('archive_reconstruction'));
  assert.ok(signed.max.x < reconstruction.min.x,
    'signed summary and reconstruction folder do not overlap');
  assert.ok(signed.min.z > site.z + 1.16,
    'signed summary stays in front of the signing-room working carbon');
  evidence.dispose();
});

test('tunnel stain is marked on both approaches and west-wall warning faces into tower', () => {
  const evidence = createEvidenceProps(new THREE.Scene(), SITES, CLUES, () => 35);
  const tunnel = evidence.entries.get('tunnel_water_mark');
  const visual = tunnel.children[0];
  assert.equal(visual.rotation.y, 0, 'the front faces the default +z approach');
  const front = visual.getObjectByName('Tunnel water mark toward jetty');
  const back = visual.getObjectByName('Tunnel water mark toward pump');
  assert.ok(front && back && front.position.z > 0 && back.position.z < 0);
  assert.equal(back.rotation.y, Math.PI);
  assert.equal(front.material, back.material, 'both readings reuse one canvas texture');
  const failover = evidence.entries.get('tower_failover_tag');
  assert.equal(failover.children[0].rotation.y, Math.PI / 2,
    'warning on the west wall faces the room interior');
  evidence.dispose();
});
