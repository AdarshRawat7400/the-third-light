// The archive is a provenance exercise. Its early records can show that the
// finding was overstated; the physical relay strip found later establishes
// what the lamps actually did. This module contains only serializable rules.

export const ARCHIVE_CASE_VERSION = 1;

export const ARCHIVE_CASE_STEPS = Object.freeze([
  Object.freeze({
    id: 'provenance',
    title: 'Identify the export',
    prompt: 'The status line is typed, and a stamp is on the back. What kind of source is this copy?',
    evidenceIds: Object.freeze(['official_log', 'archive_revision_stamp']),
    actionType: 'archive.provenance',
    answer: 'later_reprint',
    choices: Object.freeze([
      Object.freeze({ label: 'Original machine record', answer: 'machine_original' }),
      Object.freeze({ label: 'Later operator reprint', answer: 'later_reprint' }),
      Object.freeze({ label: 'Undated witness note', answer: 'witness_note' }),
    ]),
    success: 'The typed page was reprinted through Elias Ward’s operator account two days later. The stamp establishes custody of this copy, not whether its value was changed.',
    mistake: 'Separate the source that generated a lamp reading from the person who later printed this page. A later reprint alone does not prove forgery.',
  }),
  Object.freeze({
    id: 'testimony',
    title: 'Place the testimony',
    prompt: 'Place the deckhand’s addendum against the captain’s original statement and Mara’s signed finding.',
    evidenceIds: Object.freeze(['captain_statement', 'archive_witness_addendum']),
    actionType: 'archive.testimony',
    answer: 'after_finding',
    choices: Object.freeze([
      Object.freeze({ label: 'Both were before the finding', answer: 'both_before' }),
      Object.freeze({ label: 'Deckhand wrote after the finding', answer: 'after_finding' }),
      Object.freeze({ label: 'Deckhand spoke at the wreck', answer: 'at_wreck' }),
    ]),
    success: 'The captain’s account was in the original case. The deckhand corroborated two high lights a month after the finding, under a different case number. Mara could not have used that addendum when she signed.',
    mistake: 'Check when each account entered the case. Later corroboration can change the case now without rewriting what Mara knew then.',
  }),
  Object.freeze({
    id: 'editorial',
    title: 'Compare draft and signed report',
    prompt: 'What changed between Mara’s draft finding and the signed conclusion?',
    evidenceIds: Object.freeze(['archive_draft_memo', 'official_log']),
    actionType: 'archive.editorial',
    answer: 'uncertainty_removed',
    choices: Object.freeze([
      Object.freeze({ label: 'She kept the lamp status unresolved', answer: 'uncertainty_kept' }),
      Object.freeze({ label: 'She removed the unresolved status', answer: 'uncertainty_removed' }),
      Object.freeze({ label: 'She verified the original relay strip', answer: 'strip_verified' }),
    ]),
    success: 'Mara wrote “lamp status unresolved; obtain relay original” in her draft. She removed that qualification, accepted the typed export, and signed the conclusion without the original.',
    mistake: 'Read the draft’s request for the relay original beside the signed page. Which qualification survived?',
  }),
  Object.freeze({
    id: 'finding',
    title: 'Reconstruct the finding',
    prompt: 'The chart shows where a standby lamp was planned. With these archive records alone, what can the inquiry honestly conclude?',
    evidenceIds: Object.freeze(['archive_chart', 'official_log', 'captain_statement']),
    actionType: 'archive.finding',
    answer: 'operation_unresolved',
    choices: Object.freeze([
      Object.freeze({ label: 'The standby lamp definitely operated', answer: 'standby_proven_lit' }),
      Object.freeze({ label: 'The original finding is fully proven', answer: 'official_finding_proven' }),
      Object.freeze({ label: 'Lamp operation remains unresolved', answer: 'operation_unresolved' }),
    ]),
    success: 'The finding treated a later typed export as decisive while setting aside the captain’s account. The chart proves a second alignment was possible, not that the lamp was lit. Find the relay’s physical strip before accusing anyone of altering the status.',
    mistake: 'A planned lamp position, a later reprint, and testimony do not independently establish whether that circuit was live. Identify what physical source is still missing.',
  }),
]);

const EVIDENCE_NAMES = Object.freeze({
  official_log: 'official accident log',
  archive_revision_stamp: 'export revision stamp',
  captain_statement: 'captain’s testimony',
  archive_witness_addendum: 'deckhand’s late addendum',
  archive_draft_memo: 'Mara’s draft finding',
  archive_chart: 'harbor survey chart',
});

function foundSet(foundIds) {
  if (foundIds instanceof Set) return foundIds;
  return new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createArchiveCaseState() {
  return { version: ARCHIVE_CASE_VERSION, provenance: null, testimony: null, editorial: null, finding: null };
}

/** Restore only a valid, evidence-backed sequence. Never infer a solve from
 * mere collection: the player must make each comparison explicitly. */
export function restoreArchiveCaseState(raw, foundIds = []) {
  const state = createArchiveCaseState();
  const found = foundSet(foundIds);
  if (!raw || typeof raw !== 'object' || (raw.version !== undefined && raw.version !== ARCHIVE_CASE_VERSION)) return state;
  for (const step of ARCHIVE_CASE_STEPS) {
    if (raw[step.id] !== step.answer || !step.evidenceIds.every((id) => found.has(id))) break;
    state[step.id] = step.answer;
  }
  return state;
}

export function archiveCaseMilestones(raw) {
  const state = raw && typeof raw === 'object' ? raw : createArchiveCaseState();
  let completedSteps = 0;
  for (const step of ARCHIVE_CASE_STEPS) {
    if (state[step.id] !== step.answer) break;
    completedSteps += 1;
  }
  return {
    completedSteps,
    reconstructed: completedSteps === ARCHIVE_CASE_STEPS.length,
  };
}

/** Same result contract as the tower and pump mechanisms. Wrong answers never
 * alter state, and the completion event fires on the first successful solve. */
export function applyArchiveCaseAction(previous, action, foundIds = []) {
  const state = restoreArchiveCaseState(previous, foundIds);
  const found = foundSet(foundIds);
  const step = ARCHIVE_CASE_STEPS.find((candidate) => state[candidate.id] !== candidate.answer);
  const result = (status, message, next = state, event = null) => ({ state: next, status, message, event });
  if (!step) return result('unchanged', 'The archive reconstruction is already recorded.');
  if (action?.type !== step.actionType) {
    return result('blocked', 'Work through the archive sources in order; compare the current records first.');
  }
  const missing = step.evidenceIds.filter((id) => !found.has(id));
  if (missing.length) return result('blocked', `Inspect ${missing.map((id) => EVIDENCE_NAMES[id]).join(' and ')} before resolving this comparison.`);
  if (!step.choices.some((choice) => choice.answer === action?.answer)) {
    return result('blocked', 'Choose one of the conclusions supported or challenged by the records.');
  }
  if (action.answer !== step.answer) return result('mistake', step.mistake);
  const next = { ...state, [step.id]: step.answer };
  const complete = step.id === 'finding';
  return result(complete ? 'complete' : 'changed', step.success, next, complete ? 'archive_reconstructed' : 'archive_step_solved');
}

/** A view model for the game's existing action-button modal. It shows only
 * evidence already found, so the panel does not spoil undiscovered props. */
export function getArchiveCasePanel(previous, foundIds = []) {
  const state = restoreArchiveCaseState(previous, foundIds);
  const found = foundSet(foundIds);
  const stepIndex = ARCHIVE_CASE_STEPS.findIndex((candidate) => state[candidate.id] !== candidate.answer);
  if (stepIndex === -1) {
    return {
      step: ARCHIVE_CASE_STEPS.length,
      title: 'Archive reconstruction recorded',
      text: 'The signed report suppressed an unresolved source question. Archive testimony and the chart justify reopening it, while the physical relay strip is still needed to establish which lamps actually operated.',
      actions: [],
      missingEvidenceIds: [],
    };
  }
  const step = ARCHIVE_CASE_STEPS[stepIndex];
  const missingEvidenceIds = step.evidenceIds.filter((id) => !found.has(id));
  return {
    step: stepIndex,
    title: step.title,
    text: missingEvidenceIds.length
      ? `Locate and read ${missingEvidenceIds.map((id) => EVIDENCE_NAMES[id]).join(' and ')} in the survey archive before comparing these sources.`
      : step.prompt,
    actions: missingEvidenceIds.length ? [] : step.choices.map(({ label, answer }) => ({
      label,
      action: { type: step.actionType, answer },
    })),
    missingEvidenceIds,
  };
}
