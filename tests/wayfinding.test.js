import test from 'node:test';
import assert from 'node:assert/strict';
import { availableMapSites, describeWaypoint, restoreWaypointId, suggestMapLead } from '../src/wayfinding.js';
import { createChapterStart } from '../src/chapterSelect.js';
import { campaignAdvanceStatus } from '../src/campaignProgression.js';
import { CLUES } from '../src/story.js';

test('saved map marks restore only to known sites and reveal the tunnel after a grounded clue', () => {
  assert.equal(restoreWaypointId('lodge'), 'lodge');
  assert.equal(restoreWaypointId('headland'), 'headland',
    'an existing saved West Headland mark must remain valid');
  assert.equal(restoreWaypointId('headland_stake', { chapter: 1 }), null,
    'the survey stake is only marked once the survey chapter begins');
  assert.equal(restoreWaypointId('headland_stake', { chapter: 2 }), 'headland_stake');
  assert.equal(restoreWaypointId('tunnel', { chapter: 3 }), null);
  assert.equal(restoreWaypointId('tunnel', {
    chapter: 3, foundIds: ['radio_route_verified'],
  }), 'tunnel');
  assert.equal(restoreWaypointId('../../secret'), null);
  assert.ok(!availableMapSites().some((site) => site.id === 'tunnel'));
});

test('field-map bearings use island north and state only straight-line distance', () => {
  const tower = availableMapSites().find((site) => site.id === 'tower');
  const north = describeWaypoint('tower', tower.x, tower.z + 100);
  assert.deepEqual([north.direction, north.bearingDegrees, north.distanceMeters], ['N', 0, 100]);
  const east = describeWaypoint('tower', tower.x - 100, tower.z);
  assert.deepEqual([east.direction, east.bearingDegrees, east.distanceMeters], ['E', 90, 100]);
  assert.equal(describeWaypoint('tower', tower.x - 36, tower.z + 100).direction, 'NNE');
  assert.equal(describeWaypoint('lodge', Number.NaN, 0), null);
});

test('next-lead map marks follow earned chapter tasks without revealing the tunnel early', () => {
  const starts = [
    ['lodge', 0], ['archive', 1], ['headland_stake', 2],
    ['radio', 3], ['pump', 4], ['tunnel', 5],
  ];
  for (const [expectedSite, chapter] of starts) {
    const state = createChapterStart(chapter);
    const context = { chapter, foundIds: state.found };
    assert.equal(suggestMapLead(campaignAdvanceStatus(state), context)?.site.id,
      expectedSite, `chapter ${chapter + 1} first lead`);
  }

  const survey = createChapterStart(2);
  survey.found.push('headland_view');
  assert.equal(suggestMapLead(campaignAdvanceStatus(survey),
    { chapter: 2, foundIds: survey.found })?.site.id, 'east_ridge');

  const hiddenTunnel = { chapter: 3, foundIds: [] };
  const missingSignal = { ready: false, reason: 'required_clues', missingIds: ['tunnel_signal'] };
  assert.equal(suggestMapLead(missingSignal, hiddenTunnel), null);
  assert.equal(suggestMapLead(missingSignal, { chapter: 3,
    foundIds: ['radio_route_verified'] })?.site.id, 'tunnel');
  assert.equal(suggestMapLead({ ready: false, reason: 'deduction' }, hiddenTunnel), null,
    'case-board work has no false geographic lead');
  assert.equal(suggestMapLead({ ready: true }, hiddenTunnel), null);
});

test('the witness comparison points back to the Pump House while its service order is missing', () => {
  const witness = { ready: false, reason: 'witness_finding' };
  const incomplete = { chapter: 3, foundIds: new Set(['radio_route_verified', 'lamp_strip', 'tunnel_signal']) };
  assert.deepEqual(
    [suggestMapLead(witness, incomplete)?.site.id, suggestMapLead(witness, incomplete)?.clueId],
    ['pump', 'pump_service_order'],
  );
  incomplete.foundIds.add('pump_service_order');
  assert.deepEqual(
    [suggestMapLead(witness, incomplete)?.site.id, suggestMapLead(witness, incomplete)?.clueId],
    ['radio', null],
  );
});

test('Chapter 3 suggested and saved survey-stake marks resolve at the actual E prompt', () => {
  const survey = createChapterStart(2);
  const context = { chapter: 2, foundIds: survey.found };
  const stake = CLUES.find((clue) => clue.id === 'headland_view');
  const suggested = suggestMapLead(campaignAdvanceStatus(survey), context);
  assert.equal(suggested.clueId, stake.id);
  assert.equal(suggested.site.id, 'headland_stake');
  assert.deepEqual([suggested.site.x, suggested.site.z], stake.world);
  assert.equal(describeWaypoint(suggested.site.id, ...stake.world, context).distanceMeters, 0);

  const savedId = restoreWaypointId(suggested.site.id, context);
  assert.equal(describeWaypoint(savedId, ...stake.world, context).distanceMeters, 0,
    'circling the next lead and restoring the saved mark must still point to the stake');
  assert.equal(describeWaypoint('headland', ...stake.world, context).distanceMeters, 24,
    'West Headland remains a distinct landmark 24 m from the survey stake');
});
