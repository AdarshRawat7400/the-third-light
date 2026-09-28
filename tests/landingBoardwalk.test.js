import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld } from '../src/world.js';
import {
  LANDING_BOARDWALK, landingBoardwalkSections, landingBoardwalkTopAt,
} from '../src/landingBoardwalk.js';

test('the south ramp timber stays above the rendered cove terrain across its full usable width', () => {
  const world = createWorld(new THREE.Scene(), new THREE.Camera());
  const sections = landingBoardwalkSections(world.terrainHeight);
  assert.equal(sections[0].startZ, LANDING_BOARDWALK.startZ);
  assert.equal(sections.at(-1).endZ, LANDING_BOARDWALK.endZ);
  for (let index = 1; index < sections.length; index++) {
    assert.equal(sections[index].startZ, sections[index - 1].endZ,
      'the pitched timber sections must join without a gap');
  }
  // The first two metres meet the natural trail bank. Thereafter the deck
  // should remain visibly over the rendered triangles, including the former
  // slab at z=335–337 and both walking lanes near its edges.
  for (let z = 270; z <= LANDING_BOARDWALK.endZ; z += 0.25) {
    const top = landingBoardwalkTopAt(sections, z);
    for (let x = -3.25; x <= 3.25; x += 0.25) {
      assert.ok(top - world.renderedTerrainHeight(x, z) >= 0.05,
        `terrain covers timber at ${x.toFixed(2)}, ${z.toFixed(2)}`);
    }
  }
  // The last plank approaches the pier deck, whose upper face is y=0.49.
  assert.ok(Math.abs(landingBoardwalkTopAt(sections, 343) - 0.49) < 0.2);
});
