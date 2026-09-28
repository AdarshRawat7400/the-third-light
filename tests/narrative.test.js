import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SITES, CHAPTERS, CLUES } from '../src/story.js';
import { createWorld } from '../src/world.js';

const bySite = Object.fromEntries(SITES.map((site) => [site.id, site]));
const byClue = Object.fromEntries(CLUES.map((clue) => [clue.id, clue]));
const optional = CLUES.filter((clue) => clue.optional && clue.purpose);
// These are the walkable collision interiors in main.js, narrower than some
// decorative room meshes. A glint outside them cannot be inspected indoors.
const interiorFootprints = {
  lodge: [17.4, 14.9], archive: [15, 11.2], tower: [9, 9],
  radio: [12, 10.9], pump: [12, 10],
};

test('optional evidence retains complete writing beside the archive and daybreak gates', () => {
  assert.ok(optional.length >= 10);
  const required = new Set(CHAPTERS.flatMap((chapter) => chapter.required));
  for (const clue of optional) {
    assert.ok(!required.has(clue.id), `${clue.id} unexpectedly gates progression`);
    assert.ok(Number.isInteger(clue.minChapter) && clue.minChapter >= 0
      && clue.minChapter < CHAPTERS.length, `${clue.id}: invalid chapter`);
    assert.ok(clue.body?.includes('<p>'), `${clue.id}: missing inspectable evidence`);
    assert.ok(clue.journal?.length > 25, `${clue.id}: missing journal interpretation`);
    assert.ok(clue.radio?.length > 10, `${clue.id}: missing radio response`);
    assert.ok(clue.purpose.length > 30, `${clue.id}: missing narrative purpose`);
  }
  assert.equal(byClue.archive_witness_addendum.minChapter, 1,
    'the later witness must follow the original testimony');
  assert.ok(byClue.tower_failover_tag.minChapter < byClue.pump_power.minChapter,
    'the dangerous shared power feed must be foreshadowed');
  assert.ok(byClue.pump_iris_route.minChapter <= byClue.tunnel_signal.minChapter,
    'Iris must be seen acting before the rescue chapter');
});

test('optional indoor evidence lies within walkable building interiors and remains individually selectable', () => {
  for (const clue of optional.filter((entry) => entry.room)) {
    assert.ok(bySite[clue.room], `${clue.id}: unknown room`);
    const [width, depth] = interiorFootprints[clue.room];
    assert.ok(Math.abs(clue.x) < width / 2 - 0.28, `${clue.id}: outside room width`);
    assert.ok(Math.abs(clue.z) < depth / 2 - 0.28, `${clue.id}: outside room depth`);
    for (const other of CLUES) {
      if (other === clue || other.room !== clue.room) continue;
      const distance = Math.hypot(clue.x - other.x, clue.z - other.z);
      assert.ok(distance > 3.25, `${clue.id} overlaps the ${other.id} interaction spot`);
    }
  }
});

test('outdoor evidence is reachable from its physical site without crossing cliffs or sea', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  for (const clue of optional.filter((entry) => entry.world)) {
    const site = bySite[clue.nearSite];
    assert.ok(site, `${clue.id}: missing physical landmark`);
    const distance = Math.hypot(clue.world[0] - site.x, clue.world[1] - site.z);
    assert.ok(distance <= 26, `${clue.id}: too far from ${site.name}`);
    const steps = Math.ceil(distance * 2);
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const x = site.x + (clue.world[0] - site.x) * t;
      const z = site.z + (clue.world[1] - site.z) * t;
      assert.ok(world.isWalkable(x, z), `${clue.id}: path from ${site.name} blocked at ${t.toFixed(2)}`);
    }
  }
});
