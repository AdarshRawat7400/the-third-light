import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHAPTERS, CLUES, SITES } from '../src/story.js';
import {
  PLAYER_RADIUS, RADIO_FURNITURE, buildingWallBlocks, isInsideBuilding,
  radioFurnitureBlocks, radioFurnitureBlocksMoveFrom,
} from '../src/collision.js';
import { selectFieldInteraction } from '../src/fieldInteraction.js';
import { nearestIrisTrailStation } from '../src/irisTrail.js';
import { nearestWitnessConfrontationStation } from '../src/witnessConfrontation.js';
import { createWorld } from '../src/world.js';

const radio = SITES.find((site) => site.id === 'radio');
const radioClues = CLUES.filter((clue) => clue.room === 'radio' && clue.minChapter <= 3);
const at = (x, z) => ({ x: radio.x + x, z: radio.z + z });

test('modeled radio console and witness table block bodies but leave the south door and side aisles clear', () => {
  assert.deepEqual(RADIO_FURNITURE.map(({ id, x, z, halfWidth, halfDepth }) =>
    [id, x, z, halfWidth, halfDepth]), [
    ['receiver_console', 0, -1.5, 2.8, .575],
    ['witness_worktable', -1.8, .1, .775, .44],
  ]);
  for (const [x, z] of [[0, -1.5], [-1.8, .1]]) {
    assert.equal(radioFurnitureBlocks(radio, radio.x + x, radio.z + z), true);
  }
  for (const [x, z] of [[0, 3.5], [0, 1.3], [-3.5, -1.5], [3.5, -1.5],
    [-4.75, 2.6], [4.75, 2.75], [-4.3, -1.8], [-.4, 2.8], [-1.8, 1.1]]) {
    const point = at(x, z);
    assert.equal(isInsideBuilding(radio, point.x, point.z), true, `${x},${z} is inside`);
    assert.equal(buildingWallBlocks(radio, point.x, point.z, PLAYER_RADIUS), false);
    assert.equal(radioFurnitureBlocks(radio, point.x, point.z), false,
      `${x},${z} is clear of both bodies`);
  }
  assert.equal(radioFurnitureBlocks(SITES.find((site) => site.id === 'tower'),
    radio.x, radio.z - 1.5), false, 'radio footprints do not affect another room');
});

test('old saves inside either radio fixture can move outward but not deeper or into the other', () => {
  for (const [x, z] of [[0, -1.5], [-1.8, .1]]) {
    const from = at(x, z);
    const outward = at(x, z + .08);
    assert.equal(radioFurnitureBlocksMoveFrom(radio,
      from.x, from.z, outward.x, outward.z), false);
    assert.equal(radioFurnitureBlocksMoveFrom(radio,
      outward.x, outward.z, from.x, from.z), true);
  }
  const tableSide = at(-1.8, .7);
  const otherBody = at(-1.8, -.8);
  assert.equal(radioFurnitureBlocksMoveFrom(radio,
    tableSide.x, tableSide.z, otherBody.x, otherBody.z), true);
  const clear = at(-4, 0);
  assert.equal(radioFurnitureBlocksMoveFrom(radio,
    radio.x, radio.z - 1.5, clear.x, clear.z), false);
});

test('radio records and later worktable station win E from reachable floor', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  const base = new Set(CHAPTERS.slice(0, 3).flatMap((chapter) => chapter.required));
  const cases = [
    ['radio_switchboard', -4.75, 2.6, base],
    ['island_loop_ledger', 4.75, 2.75, base],
    ['radio_patch', -4.3, -1.8, new Set([...base, 'radio_switchboard', 'island_loop_ledger'])],
    ['radio_route_verified', -.4, 2.8,
      new Set([...base, 'radio_switchboard', 'island_loop_ledger', 'radio_patch'])],
  ];
  const closest = (x, z, found) => {
    let winner = null;
    let score = Infinity;
    for (const clue of radioClues) {
      const distance = Math.hypot(x - (radio.x + clue.x), z - (radio.z + clue.z));
      const candidateScore = distance + (found.has(clue.id) ? 20 : 0);
      if (distance < 3.25 && candidateScore < score) {
        winner = { clue, distance };
        score = candidateScore;
      }
    }
    return winner;
  };
  const pick = (x, z, found) => {
    const nearest = closest(x, z, found);
    return selectFieldInteraction({ clue: nearest?.clue, clueDistance: nearest?.distance,
      requiredClue: Boolean(nearest && !found.has(nearest.clue.id)
        && CHAPTERS[3].required.includes(nearest.clue.id)),
      irisStation: nearestIrisTrailStation(x, z, 'radio', null,
        { chapter: 3, foundIds: found }),
      witnessStation: nearestWitnessConfrontationStation(x, z, 'radio', null,
        { chapter: 3, foundIds: found }),
    });
  };
  for (const [id, lx, lz, found] of cases) {
    const { x, z } = at(lx, lz);
    assert.equal(isInsideBuilding(radio, x, z), true, id);
    assert.equal(world.isWalkable(x, z), true, id);
    assert.equal(radioFurnitureBlocks(radio, x, z), false, id);
    const interaction = pick(x, z, found);
    assert.equal(interaction?.kind, 'clue', id);
    assert.equal(interaction.target.id, id);
  }
  // The witness station anchor is inside its table, so the player approaches
  // the near side; the recorded routing clue may still be in interaction range.
  const witnessPoint = at(-1.8, 1.1);
  const found = new Set([...base, ...cases.map(([id]) => id)]);
  assert.equal(radioFurnitureBlocks(radio, witnessPoint.x, witnessPoint.z), false);
  assert.equal(world.isWalkable(witnessPoint.x, witnessPoint.z), true);
  const interaction = pick(witnessPoint.x, witnessPoint.z, found);
  assert.equal(interaction?.kind, 'witness');
  assert.equal(interaction.target.id, 'witness_table');
});
