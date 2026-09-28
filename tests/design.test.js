import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SITES, NAV_LIGHTS, CHAPTERS, CLUES } from '../src/story.js';
import { createWorld } from '../src/world.js';

const byId = Object.fromEntries(CLUES.map((clue) => [clue.id, clue]));
const siteById = Object.fromEntries(SITES.map((site) => [site.id, site]));
const world = createWorld(new THREE.Scene(), new THREE.Camera());

function lineDistance(point, a, b) {
  const cross = (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x);
  return Math.abs(cross) / Math.hypot(b.x - a.x, b.z - a.z);
}
function xAtZ(a, b, z) { return a.x + (b.x - a.x) * (z - a.z) / (b.z - a.z); }

test('six chapters have reachable, distinct required clues', () => {
  assert.equal(CHAPTERS.length, 6);
  const ids = CLUES.map((clue) => clue.id);
  assert.equal(new Set(ids).size, ids.length);
  CHAPTERS.forEach((chapter, chapterIndex) => {
    assert.ok(chapter.required.length >= (chapter.title === 'DAYBREAK' ? 1 : 2), chapter.title);
    for (const id of chapter.required) {
      assert.ok(byId[id], `${chapter.title}: missing ${id}`);
      assert.ok(byId[id].minChapter <= chapterIndex, `${chapter.title}: ${id} unlocks too late`);
    }
  });
  for (const clue of CLUES) {
    assert.ok(clue.room ? siteById[clue.room] : clue.world, `${clue.id}: no location`);
    const x = clue.room ? siteById[clue.room].x + clue.x : clue.world[0];
    const z = clue.room ? siteById[clue.room].z + clue.z : clue.world[1];
    assert.ok(world.isWalkable(x, z), `${clue.id}: outside walkable island`);
  }
});

test('the safe and false survey bearings match the physical light layout', () => {
  const west = { x: byId.headland_view.world[0], z: byId.headland_view.world[1] };
  const east = { x: byId.east_ridge_view.world[0], z: byId.east_ridge_view.world[1] };
  assert.ok(lineDistance(west, NAV_LIGHTS.front, NAV_LIGHTS.main) < 1);
  assert.ok(lineDistance(east, NAV_LIGHTS.front, NAV_LIGHTS.standby) < 1);
  assert.ok(lineDistance(west, NAV_LIGHTS.front, NAV_LIGHTS.standby) > 25);
  assert.ok(lineDistance(east, NAV_LIGHTS.front, NAV_LIGHTS.main) > 25);
  // Looking seaward reverses the apparent east/west order after the lines cross.
  const safeSeaX = xAtZ(NAV_LIGHTS.front, NAV_LIGHTS.main, -370);
  const reefSeaX = xAtZ(NAV_LIGHTS.front, NAV_LIGHTS.standby, -370);
  assert.ok(reefSeaX < safeSeaX - 100);
});

test('all major locations remain on walkable ground', () => {
  for (const site of SITES) {
    assert.ok(world.isWalkable(site.x, site.z), site.name);
    assert.ok(Number.isFinite(world.terrainHeight(site.x, site.z)));
  }
});

test('raised coastline has sea cliffs while both landing coves stay accessible', () => {
  assert.ok(world.terrainHeight(200, 310) > 30, 'south headland must rise well above sea');
  assert.ok(world.terrainHeight(200, 330) < 3, 'south headland falls to water within its cliff rim');
  assert.equal(world.isWalkable(200, 320), false, 'sheer cliff face blocks walking');
  for (const z of [270, 300, 330, 340]) {
    assert.ok(world.isWalkable(0, z), `South Landing approach blocked at z=${z}`);
  }
  assert.ok(world.isWalkable(-65, -315), 'North Inlet jetty is reachable');
});

test('survey photographs have unobstructed terrain sightlines to both light pairs', () => {
  for (const [clueId, lightId] of [
    ['headland_view', 'front'], ['headland_view', 'main'],
    ['east_ridge_view', 'front'], ['east_ridge_view', 'standby'],
  ]) {
    const clue = byId[clueId];
    const light = NAV_LIGHTS[lightId];
    const x0 = clue.world[0], z0 = clue.world[1] + 1.3;
    const eye = world.terrainHeight(x0, z0) + 1.72;
    const bulb = world.terrainHeight(light.x, light.z) + light.height + 0.5;
    let clearance = Infinity;
    for (let i = 1; i < 100; i++) {
      const t = i / 100;
      const x = x0 + (light.x - x0) * t;
      const z = z0 + (light.z - z0) * t;
      const rayHeight = eye + (bulb - eye) * t;
      clearance = Math.min(clearance, rayHeight - world.terrainHeight(x, z));
    }
    assert.ok(clearance > 1.5, `${clueId} → ${lightId} is blocked (${clearance.toFixed(2)} m)`);
  }
});
