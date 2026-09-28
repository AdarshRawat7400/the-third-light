import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHAPTERS, CLUES, SITES } from '../src/story.js';
import {
  BUILDING_SHAPES, PLAYER_RADIUS, isInsideBuilding,
  buildingWallBlocks, circlesBlock, archiveFurnitureBlocks, radioFurnitureBlocks,
} from '../src/collision.js';
import { createLodgeScene } from '../src/lodgeScene.js';
import { createSigningRoomScene } from '../src/signingRoomScene.js';
import { createPumpInterior } from '../src/pumpInterior.js';
import { createWorld } from '../src/world.js';
import { createSetDressing } from '../src/setDressing.js';
import { ancillaryBlocksMove, ancillaryFootprints } from '../src/buildingDetails.js';
import { LODGE_STATIONS } from '../src/lodgeSequence.js';
import { SIGNING_STATIONS } from '../src/signingReconstruction.js';
import { TOWER_CIRCUIT_STATIONS } from '../src/towerCircuit.js';
import { WITNESS_STATION } from '../src/witnessConfrontation.js';
import { IRIS_TRAIL_STATIONS } from '../src/irisTrail.js';
import { JETTY_RETURN_STATIONS } from '../src/jettyReturn.js';

const siteById = new Map(SITES.map((site) => [site.id, site]));
const clueById = new Map(CLUES.map((clue) => [clue.id, clue]));

function reachableInteriorFloor(site, blocksMove) {
  const shape = BUILDING_SHAPES[site.id];
  const step = 0.25;
  const maxI = Math.ceil(shape.halfWidth / step);
  const maxJ = Math.ceil(shape.halfDepth / step);
  const start = [0, Math.floor((shape.halfDepth - PLAYER_RADIUS - 0.25) / step)];
  const key = (i, j) => `${i},${j}`;
  const valid = (i, j) => {
    if (Math.abs(i) > maxI || Math.abs(j) > maxJ) return false;
    const x = site.x + i * step;
    const z = site.z + j * step;
    return isInsideBuilding(site, x, z) && !blocksMove(x, z, PLAYER_RADIUS);
  };
  assert.ok(valid(...start), `${site.id}: front-door entry is obstructed`);
  const queue = [start];
  const seen = new Set([key(...start)]);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [i, j] = queue[cursor];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nj = j + dj;
      const id = key(ni, nj);
      if (seen.has(id) || !valid(ni, nj)) continue;
      seen.add(id);
      queue.push([ni, nj]);
    }
  }
  return queue.map(([i, j]) => ({ x: site.x + i * step, z: site.z + j * step }));
}

function nearestDistance(floor, x, z) {
  return Math.min(...floor.map((point) => Math.hypot(point.x - x, point.z - z)));
}

test('required evidence and puzzle stations remain reachable through the actual room collision floors', () => {
  const scene = new THREE.Scene();
  const lodge = createLodgeScene(scene, () => 30, siteById.get('lodge'));
  const signing = createSigningRoomScene(scene, () => 30, siteById.get('archive'));
  const pump = createPumpInterior(scene, () => 30, siteById.get('pump'));
  const scenes = { lodge, archive: signing, pump };
  const roomFloor = new Map();
  try {
    for (const [id, shape] of Object.entries(BUILDING_SHAPES)) {
      const site = siteById.get(id);
      assert.ok(site && shape, `${id}: room has no matching site`);
      const floor = reachableInteriorFloor(site,
        (x, z, radius) => (id === 'archive' && archiveFurnitureBlocks(site, x, z, radius))
          || (id === 'radio' && radioFurnitureBlocks(site, x, z, radius))
          || (scenes[id]?.blocksMove(x, z, radius) ?? false));
      assert.ok(floor.length > 100, `${id}: no usable floor behind the front door`);
      roomFloor.set(id, floor);
    }

    // An E press can only discover a clue when the player stands inside that
    // room and within the 3.25 m radius used by closestClue in main.js.
    for (const chapter of CHAPTERS) for (const id of chapter.required) {
      const clue = clueById.get(id);
      if (!clue?.room) continue;
      const site = siteById.get(clue.room);
      const distance = nearestDistance(roomFloor.get(clue.room),
        site.x + clue.x, site.z + clue.z);
      assert.ok(distance < 3.25,
        `${id}: required clue is ${distance.toFixed(2)} m from reachable room floor`);
    }

    // The two optional-looking radio ledgers are required inputs to the
    // routing puzzle. Both must remain approachable around the new console.
    const radio = siteById.get('radio');
    for (const id of ['radio_switchboard', 'island_loop_ledger',
      'radio_patch', 'radio_route_verified']) {
      const clue = clueById.get(id);
      const distance = nearestDistance(roomFloor.get('radio'),
        radio.x + clue.x, radio.z + clue.z);
      assert.ok(distance < 1.3,
        `${id}: routed-radio source is ${distance.toFixed(2)} m from reachable floor`);
    }

    // The three mandatory archive source files must be on visible, clear
    // aisle floor; the reconstruction folder is the intentional table prop.
    const archive = siteById.get('archive');
    for (const id of ['official_log', 'captain_statement', 'archive_draft_memo']) {
      const clue = clueById.get(id);
      assert.equal(archiveFurnitureBlocks(archive,
        archive.x + clue.x, archive.z + clue.z), false,
      `${id}: visible source stand intersects an archive shelf or desk`);
    }

    // These stations are additional progression gates that required clue
    // markers alone cannot prove accessible.
    const stations = [
      ...LODGE_STATIONS.map((station) => ({ room: 'lodge', station, radius: 1.55 })),
      ...SIGNING_STATIONS.map((station) => ({ room: 'archive', station, radius: 1.5 })),
      ...TOWER_CIRCUIT_STATIONS.map((station) => ({ room: 'tower', station, radius: 1.35 })),
      { room: 'radio', station: WITNESS_STATION, radius: 1.3 },
      ...IRIS_TRAIL_STATIONS.filter((station) => station.inside)
        .map((station) => ({ room: station.inside, station, radius: 1.8, absolute: true })),
    ];
    for (const { room, station, radius, absolute } of stations) {
      const site = siteById.get(room);
      const x = absolute ? station.x : site.x + station.x;
      const z = absolute ? station.z : site.z + station.z;
      const distance = nearestDistance(roomFloor.get(room), x, z);
      assert.ok(distance < radius,
        `${room}/${station.id}: station is ${distance.toFixed(2)} m from reachable floor`);
    }
  } finally {
    lodge.dispose();
    signing.dispose();
    pump.dispose();
  }
});

test('outdoor chapter evidence and the family return have a collision-free approach', () => {
  const scene = new THREE.Scene();
  const world = createWorld(scene, new THREE.Camera());
  const dressing = createSetDressing(scene, world.terrainHeight);
  const ancillary = ancillaryFootprints(SITES);
  const free = (x, z) => world.isWalkable(x, z)
    && !SITES.some((site) => buildingWallBlocks(site, x, z, PLAYER_RADIUS))
    && !circlesBlock(x, z, PLAYER_RADIUS, world.natureObstacles)
    && !dressing.collides(x, z, PLAYER_RADIUS)
    && !ancillaryBlocksMove(ancillary, x, z, PLAYER_RADIUS);
  const approach = (site, target, reach) => {
    const step = 0.5;
    const limit = 72;
    const at = (i, j) => ({ x: site.x + i * step, z: site.z + j * step });
    const key = (i, j) => `${i},${j}`;
    const queue = [];
    const seen = new Set();
    for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) {
      if (Math.hypot(i, j) > 6 || !free(at(i, j).x, at(i, j).z)) continue;
      queue.push([i, j]);
      seen.add(key(i, j));
    }
    assert.ok(queue.length, `${site.id}: no usable ground at site`);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const [i, j] = queue[cursor];
      const point = at(i, j);
      if (Math.hypot(point.x - target.x, point.z - target.z) < reach) return true;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = i + di, nj = j + dj;
        const id = key(ni, nj);
        if (Math.abs(ni) > limit || Math.abs(nj) > limit || seen.has(id)) continue;
        const next = at(ni, nj);
        if (!free(next.x, next.z)) continue;
        seen.add(id);
        queue.push([ni, nj]);
      }
    }
    return false;
  };
  const siteFor = { headland_view: 'headland_stake', east_ridge_view: 'east_ridge',
    tunnel_signal: 'tunnel', iris_rescued: 'tunnel', iris_handoff: 'tunnel' };
  for (const chapter of CHAPTERS) for (const id of chapter.required) {
    const clue = clueById.get(id);
    if (!clue?.world) continue;
    const site = siteById.get(clue.nearSite ?? siteFor[id]);
    assert.ok(site, `${id}: outdoor objective has no mapped landmark`);
    assert.ok(approach(site, { x: clue.world[0], z: clue.world[1] }, 6),
      `${id}: no reachable ground within the game's 6 m interaction radius`);
  }
  const jetty = siteById.get('north_jetty');
  for (const station of JETTY_RETURN_STATIONS) {
    assert.ok(approach(jetty, station, 2.5),
      `${station.id}: family return station is unreachable from North Inlet Jetty`);
  }
});
