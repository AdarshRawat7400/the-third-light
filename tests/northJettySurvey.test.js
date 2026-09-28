import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { NAV_LIGHTS } from '../src/story.js';
import { createNorthJettySurvey, JETTY_SOUNDING_FLOATS } from '../src/northJettySurvey.js';

test('jetty floats mark the present safe line and western shallow shelf', () => {
  const scene = new THREE.Scene();
  const survey = createNorthJettySurvey(scene, () => 1.5, () => 0.25);
  assert.equal(JETTY_SOUNDING_FLOATS.length, 3);
  for (const marker of JETTY_SOUNDING_FLOATS) {
    const lineX = NAV_LIGHTS.front.x + (marker.z - NAV_LIGHTS.front.z)
      * (NAV_LIGHTS.main.x - NAV_LIGHTS.front.x)
      / (NAV_LIGHTS.main.z - NAV_LIGHTS.front.z);
    assert.ok(Math.abs(marker.x - lineX) < 1e-8);
  }
  assert.ok(survey.shelf.position.x < JETTY_SOUNDING_FLOATS[0].x - 35,
    'warning float stands outside the deep approach');
  const staff = survey.group.getObjectByName('White numbered depth staff');
  assert.ok(staff);
  assert.ok(staff.position.x > -62.1 && staff.position.y > 1.3,
    'the depth scale is visible above the walking deck');
  const boards = survey.group.getObjectByName('Separated crosswise wet timber planks');
  assert.equal(boards.isInstancedMesh, true);
  assert.equal(boards.count, 22, 'individual crosswise boards share one draw call');
  assert.equal(survey.group.children.filter((child) => child.name === 'Pier-side vertical fender').length, 6);
  assert.ok(survey.group.getObjectByName('Shadowed seams between pier planks'));

  survey.update(2, new THREE.Vector3(-65, 2, -315));
  assert.equal(survey.group.visible, true);
  for (const [index, marker] of [...survey.floats, survey.shelf].entries()) {
    assert.ok(Math.abs(marker.position.y - (0.25 + 0.24
      + Math.sin(2 * 1.8 + index * 0.63) * 0.07)) < 1e-8);
  }
  survey.update(4, new THREE.Vector3(300, 2, 300));
  assert.equal(survey.group.visible, false, 'distant detail is culled as a group');
  survey.dispose();
  assert.ok(!scene.children.includes(survey.group));
});
