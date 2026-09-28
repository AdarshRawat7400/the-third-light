import test from 'node:test';
import assert from 'node:assert/strict';
import { SITES } from '../src/story.js';
import { ancillaryFootprints, ancillaryBlocksMove } from '../src/buildingDetails.js';
import { BUILDING_SHAPES } from '../src/collision.js';

test('service buildings occupy clear ground beside, not inside, their parent buildings', () => {
  const footprints = ancillaryFootprints(SITES);
  assert.equal(footprints.length, 2);
  for (const house of footprints) {
    const parent = SITES.find((site) => site.id === house.near);
    const parentShape = BUILDING_SHAPES[parent.id];
    assert.ok(Math.abs(house.x-parent.x) > parentShape.halfWidth + house.halfWidth + 1);
    assert.ok(Math.hypot(house.x-parent.x,house.z-parent.z)
      + Math.hypot(house.halfWidth,house.halfDepth)
      < Math.max(...parent.scale)*.55+8);
  }
});

test('closed outbuilding walls block approach but leave adjacent paths usable', () => {
  const houses = ancillaryFootprints(SITES);
  for (const house of houses) {
    assert.equal(ancillaryBlocksMove(houses,house.x,house.z),true);
    assert.equal(ancillaryBlocksMove(houses,house.x+house.halfWidth+.31,house.z),true);
    assert.equal(ancillaryBlocksMove(houses,house.x+house.halfWidth+1,house.z),false);
  }
});
