import { CHAPTERS, CLUES, SITES } from './story.js';
import { ARCHIVE_CASE_STEPS, restoreArchiveCaseState } from './archiveCase.js';
import { DEDUCTIONS, createDeductionState, serializeDeductionState } from './deductions.js';
import { restoreMechanismState } from './mechanisms.js';
import { createRadioRoutingState, restoreRadioRoutingState } from './radioRouting.js';
import { restoreHatchState } from './hatchSequence.js';
import { createChoiceRouteState, restoreChoiceRouteState } from './choiceRoutes.js';
import { createSurveyState, serializeSurveyState } from './surveyCamera.js';
import { createDaybreakReportState, serializeDaybreakReportState } from './daybreakReport.js';
import { createLodgeSequenceState, restoreLodgeSequenceState } from './lodgeSequence.js';
import {
  SIGNING_MEMORY_CUES, createSigningMemoryState, restoreSigningMemoryState,
} from './signingMemory.js';
import { createWitnessConfrontationState, restoreWitnessConfrontationState } from './witnessConfrontation.js';
import { createRescueAftermathState, restoreRescueAftermathState } from './rescueAftermath.js';

// Each start sits outside a building, on the traveled side of its front door
// or on an established trail. Y remains terrain driven by the world runtime.
const STARTS = Object.freeze([
  Object.freeze({ x: 0, z: 338, yaw: 0, pitch: -0.045, site: 'landing' }),
  Object.freeze({ x: -169, z: 75, yaw: 0, pitch: -0.045, site: 'archive' }),
  Object.freeze({ x: -190, z: -28, yaw: 0, pitch: -0.045, site: 'headland' }),
  Object.freeze({ x: 150, z: -32, yaw: 0, pitch: -0.045, site: 'radio' }),
  Object.freeze({ x: 125, z: 141, yaw: 0, pitch: -0.045, site: 'pump' }),
  // Daybreak opens on Iris and the sealed case rather than an empty hillside.
  Object.freeze({ x: 167, z: 163, yaw: -0.98, pitch: -0.045, site: 'tunnel' }),
]);

const FIELD_SITES = Object.freeze({
  headland_view: 'headland_stake', east_ridge_view: 'east_ridge',
  tunnel_signal: 'tunnel', iris_rescued: 'tunnel',
  north_jetty_sounding: 'north_jetty',
});

function priorClueIds(chapterIndex) {
  return CLUES.filter((clue) => clue.minChapter < chapterIndex).map((clue) => clue.id);
}

function priorArchive(foundIds, chapterIndex) {
  if (chapterIndex <= 1) return restoreArchiveCaseState(null, foundIds);
  const answered = Object.fromEntries(ARCHIVE_CASE_STEPS.map((step) => [step.id, step.answer]));
  return restoreArchiveCaseState({ version: 1, ...answered }, foundIds);
}

function priorLodge(foundIds, chapterIndex) {
  if (chapterIndex === 0) return createLodgeSequenceState();
  return restoreLodgeSequenceState({
    version: 1, shutterLatched: true, lampRedirected: true,
    folderRetrieved: true, qualificationCompared: true,
  }, foundIds);
}

function priorSigningMemory(foundIds, chapterIndex) {
  if (chapterIndex === 0) return createSigningMemoryState();
  return restoreSigningMemoryState({
    version: 1,
    inspectedIds: SIGNING_MEMORY_CUES.map((cue) => cue.id),
    decisionAcknowledged: true,
    limitAcknowledged: true,
  }, foundIds);
}

function priorDeductions(foundIds, chapterIndex) {
  const candidate = DEDUCTIONS.filter((deduction) => deduction.minChapter < chapterIndex)
    .map((deduction) => deduction.id);
  return createDeductionState(serializeDeductionState({ solvedIds: candidate }), foundIds);
}

function priorRadio(foundIds, chapterIndex) {
  if (chapterIndex <= 3) return createRadioRoutingState();
  // The local voice has been traced. A true mainland connection remains an
  // explicit player operation at Daybreak and is never silently fabricated.
  return restoreRadioRoutingState({
    version: 1, loopFeed: 'island_loop', mainlandContinuity: 'open',
    voiceSource: 'local_microphone', localLoopIsolated: false,
    patchSocket: null, mainlandVerified: false,
  }, foundIds);
}

function priorChoices(foundIds, chapterIndex) {
  if (chapterIndex <= 3) return createChoiceRouteState();
  // Chapter 4 requires a confrontation to advance. A private initial account
  // is the least assumptive default; records can still be put to Elias later.
  return restoreChoiceRouteState({
    ...createChoiceRouteState(), eliasRoute: 'ask_account',
  }, {
    foundIds, mainlandConnected: false,
    irisRescued: foundIds.has('iris_rescued'), reportSubmitted: false,
  });
}

function priorWitness(foundIds, chapterIndex, radioRouting, choiceRoutes) {
  if (chapterIndex <= 3) return createWitnessConfrontationState();
  return restoreWitnessConfrontationState({
    version: 1, voiceCompared: true, orderCompared: true,
    relayCompared: true, accountTaken: true, accountTested: true,
    findingRecorded: true, irisChecklistPlayed: true,
    unsentCallReviewed: true,
  }, {
    chapter: chapterIndex, foundIds, radioRouting, choiceRoutes,
  });
}

function priorRescueAftermath(foundIds, chapterIndex) {
  if (chapterIndex <= 4) return createRescueAftermathState();
  return restoreRescueAftermathState({ version: 1,
    medical: 'medical_first', case: 'keep_with_iris',
    account: 'firsthand_only', rest: 'defer_statement',
  }, { foundIds });
}

function visitedSites(foundIds, startSite) {
  const sites = new Set(['landing', startSite]);
  for (const clue of CLUES) {
    if (!foundIds.has(clue.id)) continue;
    const site = clue.room || clue.nearSite || FIELD_SITES[clue.id];
    if (site) sites.add(site);
  }
  return SITES.filter((site) => sites.has(site.id)).map((site) => site.id);
}

/** Menu copy for a chapter slot. Its URL and storage key stay tied to the
 * chapter where it began, while the saved chapter can advance normally. */
export function chapterSlotPresentation(slotIndex, progress = null) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= CHAPTERS.length) {
    throw new RangeError(`Invalid chapter slot ${slotIndex}.`);
  }
  const savedChapter = Number(progress?.chapter);
  const currentIndex = progress
    ? Math.min(CHAPTERS.length - 1, Math.max(0, Number.isFinite(savedChapter) ? Math.trunc(savedChapter) : 0))
    : slotIndex;
  const current = CHAPTERS[currentIndex];
  const moved = currentIndex !== slotIndex;
  const slotPrefix = moved
    ? `CHAPTER ${slotIndex + 1} SLOT · NOW CHAPTER ${currentIndex + 1} · ${current.title}`
    : `CHAPTER ${slotIndex + 1} · ${current.title}`;
  return {
    currentIndex,
    selectionText: `${slotPrefix} — ${current.objective} Earlier case evidence is supplied. Your main campaign save stays available.`,
    buttonLabel: !progress ? `START CHAPTER ${slotIndex + 1}`
      : progress.ended ? 'VIEW ENDING' : `CONTINUE CHAPTER ${currentIndex + 1}`,
    pickerStatus: !progress ? 'NEW CHAPTER START'
      : progress.ended ? 'ENDING AVAILABLE'
        : moved ? `CONTINUE IN CHAPTER ${currentIndex + 1}` : 'CONTINUE AVAILABLE',
    restartLabel: `RESTART CHAPTER ${slotIndex + 1} SLOT`,
  };
}

/** A new, independent save slot at the beginning of one of six chapters.
 * Previous evidence is collected, but no required task in the selected
 * chapter is completed. The runtime may add later save fields separately. */
export function createChapterStart(chapterIndex) {
  if (!Number.isInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= CHAPTERS.length
    || !STARTS[chapterIndex]) {
    throw new RangeError(`Chapter index must be between 0 and ${Math.min(CHAPTERS.length, STARTS.length) - 1}.`);
  }
  const spawn = STARTS[chapterIndex];
  const found = priorClueIds(chapterIndex);
  const foundIds = new Set(found);
  const survey = serializeSurveyState(createSurveyState());
  const radioRouting = priorRadio(foundIds, chapterIndex);
  const choiceRoutes = priorChoices(foundIds, chapterIndex);
  return {
    version: 7,
    chapter: chapterIndex,
    found,
    x: spawn.x, z: spawn.z, yaw: spawn.yaw, pitch: spawn.pitch,
    flashlight: false, muted: false, ended: false,
    visited: visitedSites(foundIds, spawn.site),
    deductions: serializeDeductionState(priorDeductions(foundIds, chapterIndex)),
    mechanisms: restoreMechanismState(null, foundIds),
    lodge: priorLodge(foundIds, chapterIndex),
    signingMemory: priorSigningMemory(foundIds, chapterIndex),
    archive: priorArchive(foundIds, chapterIndex),
    radioRouting,
    hatch: restoreHatchState(null, foundIds),
    choiceRoutes,
    witnessConfrontation: priorWitness(foundIds, chapterIndex, radioRouting, choiceRoutes),
    rescueAftermath: priorRescueAftermath(foundIds, chapterIndex),
    survey,
    surveyPhotos: {},
    daybreakReport: serializeDaybreakReportState(createDaybreakReportState()),
    daybreakConnected: false,
  };
}
