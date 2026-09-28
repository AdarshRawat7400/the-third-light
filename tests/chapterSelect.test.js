import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, CLUES, SITES } from '../src/story.js';
import { chapterSlotPresentation, createChapterStart } from '../src/chapterSelect.js';
import { archiveCaseMilestones, getArchiveCasePanel, restoreArchiveCaseState } from '../src/archiveCase.js';
import { createDeductionState, serializeDeductionState } from '../src/deductions.js';
import { getMechanismPanel, mechanismMilestones, restoreMechanismState } from '../src/mechanisms.js';
import { getRadioRoutingPanel, radioRoutingMilestones, restoreRadioRoutingState } from '../src/radioRouting.js';
import { hatchMilestones, restoreHatchState } from '../src/hatchSequence.js';
import { getChoiceRoutePanel, restoreChoiceRouteState } from '../src/choiceRoutes.js';
import { restoreWitnessConfrontationState, witnessConfrontationMilestones } from '../src/witnessConfrontation.js';
import { restoreRescueAftermathState, rescueAftermathMilestones } from '../src/rescueAftermath.js';
import { createSurveyState, serializeSurveyState } from '../src/surveyCamera.js';
import { daybreakReportMilestones, restoreDaybreakReportState } from '../src/daybreakReport.js';
import { buildingWallBlocks } from '../src/collision.js';
import { lodgeSequenceMilestones, restoreLodgeSequenceState } from '../src/lodgeSequence.js';
import { SIGNING_MEMORY_CUES, restoreSigningMemoryState, signingMemoryMilestones } from '../src/signingMemory.js';
import { LODGE_STATIONS, nearestLodgeStation } from '../src/lodgeSequence.js';
import { createWorld } from '../src/world.js';
import { createSetDressing } from '../src/setDressing.js';
import { ancillaryFootprints, ancillaryBlocksMove } from '../src/buildingDetails.js';
import { createLodgeScene } from '../src/lodgeScene.js';
import { circlesBlock, PLAYER_RADIUS, isInsideBuilding } from '../src/collision.js';
import { collidesWithIslandPerson } from '../src/islandPeople.js';
import * as THREE from 'three';

function foundFor(chapterIndex) {
  return new Set(CLUES.filter((clue) => clue.minChapter < chapterIndex).map((clue) => clue.id));
}

test('chapter slot labels describe the saved chapter while retaining their starting slot', () => {
  const fresh = chapterSlotPresentation(2);
  assert.equal(fresh.currentIndex, 2);
  assert.equal(fresh.buttonLabel, 'START CHAPTER 3');
  assert.equal(fresh.pickerStatus, 'NEW CHAPTER START');

  const chapterThree = chapterSlotPresentation(2, { chapter: 2, ended: false });
  assert.equal(chapterThree.buttonLabel, 'CONTINUE CHAPTER 3');
  assert.equal(chapterThree.pickerStatus, 'CONTINUE AVAILABLE');

  const advanced = chapterSlotPresentation(2, { chapter: 3, ended: false });
  assert.equal(advanced.currentIndex, 3);
  assert.equal(advanced.buttonLabel, 'CONTINUE CHAPTER 4');
  assert.equal(advanced.pickerStatus, 'CONTINUE IN CHAPTER 4');
  assert.match(advanced.selectionText, /^CHAPTER 3 SLOT · NOW CHAPTER 4 · THE VOICE/);
  assert.ok(advanced.selectionText.includes(CHAPTERS[3].objective));
  assert.equal(advanced.restartLabel, 'RESTART CHAPTER 3 SLOT');

  const otherSlot = chapterSlotPresentation(3);
  assert.equal(otherSlot.buttonLabel, 'START CHAPTER 4');
  assert.equal(otherSlot.pickerStatus, 'NEW CHAPTER START');

  const finished = chapterSlotPresentation(5, { chapter: 5, ended: true });
  assert.equal(finished.buttonLabel, 'VIEW ENDING');
  assert.equal(finished.pickerStatus, 'ENDING AVAILABLE');
  assert.throws(() => chapterSlotPresentation(6), RangeError);
});

test('all six chapter starts collect every earlier clue, including optional records, without completing current tasks', () => {
  assert.equal(CHAPTERS.length, 6);
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) {
    const snapshot = createChapterStart(chapter);
    const expected = foundFor(chapter);
    assert.equal(snapshot.version, 7);
    assert.equal(snapshot.chapter, chapter);
    assert.equal(snapshot.ended, false);
    assert.deepEqual(snapshot.found, [...expected]);
    assert.ok(CLUES.some((clue) => clue.minChapter === chapter), `chapter ${chapter + 1} has no new clue`);
    for (const id of CHAPTERS[chapter].required) {
      assert.ok(!expected.has(id), `chapter ${chapter + 1} starts with current task ${id} completed`);
      assert.ok(CLUES.some((clue) => clue.id === id && clue.minChapter === chapter),
        `current task ${id} is not discoverable in chapter ${chapter + 1}`);
    }
    assert.ok(snapshot.visited.includes('landing'));
    assert.ok(Number.isFinite(snapshot.x) && Number.isFinite(snapshot.z));
    assert.ok(SITES.every((site) => !buildingWallBlocks(site, snapshot.x, snapshot.z)),
      `chapter ${chapter + 1} spawns inside a solid wall`);
  }
  const second = createChapterStart(2);
  assert.ok(second.found.includes('lodge_working_carbon'), 'new Chapter 1 evidence seeds dynamically');
  assert.ok(second.found.includes('archive_witness_addendum'), 'optional records seed dynamically');
  const fourth = createChapterStart(3);
  assert.ok(fourth.visited.includes('headland_stake'),
    'a chapter start after the survey records the actual stake as visited');
});

test('all seeded puzzle states survive their own canonical restore rules', () => {
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) {
    const snapshot = createChapterStart(chapter);
    const found = new Set(snapshot.found);
    const deductions = createDeductionState(snapshot.deductions, found);
    const mechanisms = restoreMechanismState(snapshot.mechanisms, found);
    const route = restoreRadioRoutingState(snapshot.radioRouting, found);
    const choice = restoreChoiceRouteState(snapshot.choiceRoutes, {
      foundIds: found, mainlandConnected: radioRoutingMilestones(route).mainlandConnected,
      irisRescued: found.has('iris_rescued'), reportSubmitted: false,
    });
    const report = restoreDaybreakReportState(snapshot.daybreakReport, found, deductions.solvedIds);
    assert.deepEqual(serializeDeductionState(deductions), snapshot.deductions);
    assert.deepEqual(mechanisms, snapshot.mechanisms);
    assert.deepEqual(restoreArchiveCaseState(snapshot.archive, found), snapshot.archive);
    assert.deepEqual(restoreLodgeSequenceState(snapshot.lodge, found), snapshot.lodge);
    assert.deepEqual(restoreSigningMemoryState(snapshot.signingMemory, found), snapshot.signingMemory);
    assert.deepEqual(route, snapshot.radioRouting);
    assert.deepEqual(restoreHatchState(snapshot.hatch, found), snapshot.hatch);
    assert.deepEqual(choice, snapshot.choiceRoutes);
    assert.deepEqual(restoreWitnessConfrontationState(snapshot.witnessConfrontation, {
      chapter, foundIds: found, radioRouting: route, choiceRoutes: choice,
    }), snapshot.witnessConfrontation);
    assert.deepEqual(restoreRescueAftermathState(snapshot.rescueAftermath,
      { foundIds: found }), snapshot.rescueAftermath);
    assert.deepEqual(serializeSurveyState(createSurveyState(snapshot.survey)), snapshot.survey);
    assert.deepEqual(report, snapshot.daybreakReport);
  }
});

test('prior chapter gates are settled while each new objective remains playable', () => {
  const starts = Array.from({ length: 6 }, (_, chapter) => createChapterStart(chapter));
  const found = starts.map((start) => new Set(start.found));
  assert.equal(lodgeSequenceMilestones(starts[0].lodge, found[0]).completedStations, 0);
  assert.equal(signingMemoryMilestones(starts[0].signingMemory, found[0]).complete, false);
  assert.deepEqual(starts[0].signingMemory.inspectedIds, []);
  for (let chapter = 1; chapter < starts.length; chapter++) {
    assert.equal(lodgeSequenceMilestones(starts[chapter].lodge, found[chapter]).completedStations, 4);
    assert.equal(signingMemoryMilestones(starts[chapter].signingMemory, found[chapter]).complete, true);
    assert.deepEqual(starts[chapter].signingMemory.inspectedIds,
      SIGNING_MEMORY_CUES.map((cue) => cue.id));
    assert.ok(found[chapter].has('iris_note'));
    assert.ok(found[chapter].has('window_reflection'));
    assert.ok(found[chapter].has('lodge_working_carbon'));
  }
  assert.equal(archiveCaseMilestones(starts[1].archive).reconstructed, false);
  const archiveEvidence = new Set(CLUES.filter((clue) => clue.minChapter <= 1).map((clue) => clue.id));
  assert.ok(getArchiveCasePanel(starts[1].archive, archiveEvidence).actions.length > 0);
  for (let chapter = 2; chapter < starts.length; chapter++) {
    assert.equal(archiveCaseMilestones(starts[chapter].archive).reconstructed, true);
  }

  assert.equal(mechanismMilestones(starts[2].mechanisms).alignmentSolved, false);
  assert.ok(getMechanismPanel(starts[2].mechanisms, 'alignment').actions.length > 0);
  assert.equal(mechanismMilestones(starts[3].mechanisms).alignmentSolved, true);
  assert.equal(radioRoutingMilestones(starts[3].radioRouting).voiceTraced, false);
  const radioEvidence = new Set(CLUES.filter((clue) => clue.minChapter <= 3).map((clue) => clue.id));
  assert.ok(getRadioRoutingPanel(starts[3].radioRouting, radioEvidence).actions.length > 0);
  assert.equal(radioRoutingMilestones(starts[4].radioRouting).voiceTraced, true);
  assert.equal(radioRoutingMilestones(starts[4].radioRouting).mainlandConnected, false);
  assert.ok(getMechanismPanel(starts[4].mechanisms, 'power').actions.length > 0);
  assert.equal(mechanismMilestones(starts[4].mechanisms).powerRestored, false);
  assert.deepEqual(starts[4].deductions.solvedIds,
    ['false_light', 'altered_log', 'local_radio_voice']);
  assert.equal(starts[4].choiceRoutes.eliasRoute, 'ask_account');
  assert.equal(witnessConfrontationMilestones(starts[4].witnessConfrontation, {
    chapter: 4, foundIds: found[4], radioRouting: starts[4].radioRouting,
    choiceRoutes: starts[4].choiceRoutes,
  }).sceneComplete, true);
  assert.equal(rescueAftermathMilestones(starts[4].rescueAftermath,
    { foundIds: found[4] }).complete, false);

  const daybreak = starts[5];
  assert.equal(found[5].has('iris_rescued'), true);
  assert.equal(rescueAftermathMilestones(daybreak.rescueAftermath,
    { foundIds: found[5] }).complete, true);
  assert.equal(hatchMilestones(daybreak.hatch, found[5]).irisRescued, true);
  assert.equal(mechanismMilestones(daybreak.mechanisms).launchGuided, true);
  assert.equal(mechanismMilestones(daybreak.mechanisms).tunnelDrained, true);
  assert.equal(radioRoutingMilestones(daybreak.radioRouting).mainlandConnected, false);
  assert.equal(daybreakReportMilestones(daybreak.daybreakReport).submitted, false);
  assert.equal(daybreak.choiceRoutes.irisAsked, false);
  assert.deepEqual(daybreak.deductions.solvedIds,
    ['false_light', 'altered_log', 'local_radio_voice', 'rescue_bearing', 'responsibility']);
  assert.deepEqual(getChoiceRoutePanel(daybreak.choiceRoutes, 'iris', {
    foundIds: found[5], mainlandConnected: false, irisRescued: true,
    reportSubmitted: false,
  }).actions.map(({ action }) => action.type), ['choice.iris.ask']);
  assert.deepEqual(getRadioRoutingPanel(daybreak.radioRouting, found[5]).actions.map(({ action }) => action.type),
    ['routing.isolateLoop']);
});

test('chapter snapshots are independent and reject invalid indexes', () => {
  assert.throws(() => createChapterStart(-1), RangeError);
  assert.throws(() => createChapterStart(6), RangeError);
  assert.throws(() => createChapterStart(1.5), RangeError);
  assert.throws(() => createChapterStart('2'), RangeError);
  const first = createChapterStart(5);
  first.found.push('daybreak_report');
  first.mechanisms.power.pumpOn = false;
  first.signingMemory.inspectedIds.pop();
  const second = createChapterStart(5);
  assert.equal(second.found.includes('daybreak_report'), false);
  assert.equal(second.mechanisms.power.pumpOn, true);
  assert.equal(second.signingMemory.inspectedIds.length, SIGNING_MEMORY_CUES.length);
});

test('all six outdoor starts occupy walkable, unobstructed terrain with a clear first step', () => {
  const scene = new THREE.Scene();
  const world = createWorld(scene, new THREE.Camera());
  const dressing = createSetDressing(scene, world.terrainHeight);
  const footprints = ancillaryFootprints(SITES);
  const lodge = SITES.find((site) => site.id === 'lodge');
  const lodgeScene = createLodgeScene(scene, world.terrainHeight, lodge);
  const free = (x, z, chapter, snapshot) => {
    const onSouthPier = Math.abs(x) < 3.8 && z >= 342 && z <= 357;
    const context = { chapter, foundIds: new Set(snapshot.found), choices: snapshot.choiceRoutes };
    return (world.isWalkable(x, z) || onSouthPier)
      && !SITES.some((site) => buildingWallBlocks(site, x, z, PLAYER_RADIUS))
      && !circlesBlock(x, z, PLAYER_RADIUS, world.natureObstacles)
      && !dressing.collides(x, z, PLAYER_RADIUS)
      && !ancillaryBlocksMove(footprints, x, z, PLAYER_RADIUS)
      && !lodgeScene.blocksMove(x, z, PLAYER_RADIUS)
      && !collidesWithIslandPerson(x, z, PLAYER_RADIUS, context);
  };
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) {
    const start = createChapterStart(chapter);
    const ground = world.terrainHeight(start.x, start.z);
    assert.ok(Number.isFinite(ground) && ground > .15, `Chapter ${chapter + 1} has invalid ground`);
    assert.ok(free(start.x, start.z, chapter, start), `Chapter ${chapter + 1} starts inside an obstacle`);
    assert.ok(SITES.every((site) => !isInsideBuilding(site, start.x, start.z)),
      `Chapter ${chapter + 1} starts inside a building`);
    for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) {
      const x = start.x + dx, z = start.z + dz;
      assert.ok(free(x, z, chapter, start),
        `Chapter ${chapter + 1} has no clear ${dx},${dz} departure`);
      assert.ok(Math.abs(world.terrainHeight(x, z) - ground) < 2,
        `Chapter ${chapter + 1} has a cliff within two metres of spawn`);
    }
  }

  // Follow the same static collision checks from the approach to the four
  // lodge stations. A grid walk proves the E anchors are actually reachable
  // through the authored front-door gap, rather than merely inside the room.
  const arrival = createChapterStart(0);
  const step = .45;
  const queue = [[0, 0]];
  const visited = new Set(['0,0']);
  const reached = new Set();
  for (let index = 0; index < queue.length; index++) {
    const [gx, gz] = queue[index];
    const x = lodge.x + gx * step;
    const z = lodge.z + 6 + gz * step;
    const near = nearestLodgeStation(x, z, 'lodge', arrival.lodge, arrival.found, .8);
    if (near) reached.add(near.id);
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nx = gx + dx, nz = gz + dz;
      if (Math.abs(nx) > 21 || nz < -30 || nz > 3) continue;
      const key = `${nx},${nz}`;
      if (visited.has(key)) continue;
      const px = lodge.x + nx * step, pz = lodge.z + 6 + nz * step;
      if (!free(px, pz, 0, arrival)) continue;
      visited.add(key);
      queue.push([nx, nz]);
    }
  }
  assert.deepEqual([...reached].sort(), LODGE_STATIONS.map((station) => station.id).sort(),
    'one or more lodge interactions cannot be reached through the front door');
  const lodgeFloor = world.terrainHeight(lodge.x, lodge.z);
  for (const station of LODGE_STATIONS) {
    assert.ok(Math.abs(world.terrainHeight(lodge.x + station.x, lodge.z + station.z) - lodgeFloor) < .35,
      `${station.id} is vertically separated from the lodge floor`);
  }
  lodgeScene.dispose();
});
