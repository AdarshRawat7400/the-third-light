import { CHAPTERS } from './story.js';
import { isDeductionSolved } from './deductions.js';
import { signingMemoryMilestones } from './signingMemory.js';
import { witnessConfrontationMilestones } from './witnessConfrontation.js';
import { rescueAftermathMilestones } from './rescueAftermath.js';
import { daybreakReportMilestones } from './daybreakReport.js';
import { jettyReturnMilestones } from './jettyReturn.js';

const DEDUCTION_GATES = Object.freeze({
  2: Object.freeze(['false_light']),
  3: Object.freeze(['altered_log', 'local_radio_voice']),
  4: Object.freeze(['responsibility']),
});

const HINTS = Object.freeze({
  signing_memory: 'THE WORKING CARBON OPENS A MEMORY · RETURN TO THE LODGE DESK',
  elias_account: 'THE ISLAND VOICE NEEDS AN ACCOUNT · RETURN TO THE RADIO HOUSE',
  witness_finding: 'SET ELIAS’S ACCOUNT BESIDE THE PHYSICAL RECORDS AT THE RADIO HOUSE',
  iris_aftercare: 'GIVE IRIS A MOMENT TO GET CLEAR OF THE HATCH, THEN SPEAK WITH HER',
  deduction: 'THE EVIDENCE NEEDS A CONCLUSION · OPEN THE CASE BOARD (B)',
  jetty_return: 'THE CORRECTION IS SENT · RETURN TO THE NORTH INLET JETTY',
});

function blocked(reason, missingIds = []) {
  return { ready: false, finish: false, nextChapter: null,
    reason, missingIds, hint: HINTS[reason] ?? null };
}

/** The same eligibility decision used when a clue or puzzle event calls
 * checkChapter(). It is read-only and works with the runtime's state shape. */
export function campaignAdvanceStatus(state) {
  if (state?.ended) return blocked('ended');
  const chapter = state?.chapter;
  if (!Number.isInteger(chapter) || chapter < 0 || chapter >= CHAPTERS.length) {
    return blocked('invalid_chapter');
  }
  const found = state.found instanceof Set ? state.found
    : new Set(Array.isArray(state.found) ? state.found : []);
  const missingClues = CHAPTERS[chapter].required.filter((id) => !found.has(id));
  if (missingClues.length) return blocked('required_clues', missingClues);

  if (chapter === 0 && !signingMemoryMilestones(state.signingMemory, found).complete) {
    return blocked('signing_memory');
  }
  if (chapter === 3 && !state.choices?.eliasRoute) return blocked('elias_account');
  if (chapter === 3 && !witnessConfrontationMilestones(state.witness, {
    chapter, foundIds: found, radioRouting: state.routing,
    choiceRoutes: state.choices,
  }).sceneComplete) return blocked('witness_finding');
  if (chapter === 4 && !rescueAftermathMilestones(state.rescueAftermath,
    { foundIds: found }).complete) return blocked('iris_aftercare');

  const missingDeductions = (DEDUCTION_GATES[chapter] ?? [])
    .filter((id) => !isDeductionSolved(state.deductions, id));
  if (missingDeductions.length) return blocked('deduction', missingDeductions);

  if (chapter === CHAPTERS.length - 1 && !jettyReturnMilestones(state.jettyReturn, {
    chapter, foundIds: found,
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    choiceRoutes: state.choices,
  }).complete) return blocked('jetty_return');

  return { ready: true, finish: chapter === CHAPTERS.length - 1,
    nextChapter: chapter === CHAPTERS.length - 1 ? null : chapter + 1,
    reason: null, missingIds: [], hint: null };
}
