// The reopened inquiry is an evidence exercise, not a verdict on unproven
// motives. All transitions are pure and wrong answers can be corrected.

export const DAYBREAK_REPORT_VERSION = 1;

export const DAYBREAK_REPORT_STEPS = Object.freeze([
  Object.freeze({
    id: 'lampStatus',
    title: '1 / The lamps at 21:14',
    prompt: 'The typed export and the relay strip describe the same minute. What can the corrected finding say about the rear circuits?',
    evidenceIds: Object.freeze(['official_log', 'lamp_strip']),
    deductionIds: Object.freeze(['altered_log']),
    actionType: 'daybreak.lamps',
    answer: 'both_circuits_active',
    choices: Object.freeze([
      Object.freeze({ label: 'The typed export proves the standby circuit was off', answer: 'standby_disabled', mistake: 'The typed line conflicts with the independent marks punched by the relay at 21:14.' }),
      Object.freeze({ label: 'The relay recorded both rear circuits active; the typed export is false', answer: 'both_circuits_active' }),
      Object.freeze({ label: 'The strip proves the captain deliberately followed the wrong pair', answer: 'captain_chose_reef', mistake: 'The strip records circuit state. It cannot establish a person’s intention aboard the vessel.' }),
    ]),
    success: 'The physical relay recorded both rear circuits active. The later typed export reported the standby circuit off at the same minute.',
    report: 'At 21:14 the mechanical relay recorded both rear-lamp circuits active. The typed export reports the standby circuit disabled at that minute and is contradicted by the physical record.',
  }),
  Object.freeze({
    id: 'maraResponsibility',
    title: '2 / The analyst’s signature',
    prompt: 'Mara’s draft, marginal note, and signed finding show a choice made before the relay original was found. How should she describe it?',
    evidenceIds: Object.freeze(['archive_draft_memo', 'official_log', 'captain_statement']),
    deductionIds: Object.freeze(['responsibility']),
    actionType: 'daybreak.mara',
    answer: 'removed_uncertainty',
    choices: Object.freeze([
      Object.freeze({ label: 'I altered the lamp log and caused the wreck', answer: 'mara_forged', mistake: 'Mara signed and overstated the finding; the records do not place her at the light circuit or show that she altered the export.' }),
      Object.freeze({ label: 'I removed a valid uncertainty, trusted the export, and dismissed the captain', answer: 'removed_uncertainty' }),
      Object.freeze({ label: 'I had no responsibility because the later addendum was unavailable', answer: 'no_responsibility', mistake: 'The addendum arrived later, but Mara’s own draft already identified the missing relay original before she signed.' }),
    ]),
    success: 'Mara can name the error precisely: she removed her own qualification, accepted the typed export without the relay original, and marked the captain’s account uncorroborated.',
    report: 'I had marked lamp status unresolved in my draft and requested the original relay record. I removed that qualification, accepted the typed export, marked the captain’s account uncorroborated, and signed the finding. That professional error helped preserve an unsupported conclusion. I did not operate the lights or alter the export.',
  }),
  Object.freeze({
    id: 'eliasConduct',
    title: '3 / Conduct and intent',
    prompt: 'The service order, later export, operator’s note, island radio, and Iris’s account establish actions across two nights. What limits must the report keep?',
    evidenceIds: Object.freeze(['pump_service_order', 'archive_revision_stamp', 'operator_note', 'radio_patch', 'tunnel_signal']),
    deductionIds: Object.freeze(['local_radio_voice']),
    actionType: 'daybreak.elias',
    answer: 'actions_without_invented_motive',
    choices: Object.freeze([
      Object.freeze({ label: 'Elias planned the wreck and intended Iris to drown', answer: 'murderous_plan', mistake: 'The records establish the standby action, concealment, and confinement. They do not prove he intended either death or the grounding.' }),
      Object.freeze({ label: 'Elias acted on the standby circuit, altered the record, and confined Iris; his worst intentions remain unproven', answer: 'actions_without_invented_motive' }),
      Object.freeze({ label: 'The export was an innocent reprint and Iris entered the tunnel voluntarily', answer: 'innocent_reprint', mistake: 'The relay contradicts the export, the operator’s note acknowledges the changed line, and Iris heard Elias at the gate before the bolt moved. She could not leave through that gate.' }),
    ]),
    success: 'The report can state Elias’s documented actions without inventing an intent to wreck the ship or kill Iris.',
    report: 'Elias Ward authorized the standby feed before the wreck. The later export from his operator account conflicts with the relay strip, and his note acknowledges changing a line. He later used the island radio while presenting himself as shore control and confined Iris behind the service gate. These actions require investigation and accountability. This evidence does not establish that he intended the vessel to ground or Iris to drown.',
  }),
]);

const EVIDENCE_NAMES = Object.freeze({
  official_log: 'the official accident log',
  lamp_strip: 'the mechanical lamp-command strip',
  archive_draft_memo: 'Mara’s draft finding',
  captain_statement: 'the captain’s testimony',
  pump_service_order: 'the wreck-night service order',
  archive_revision_stamp: 'the export revision stamp',
  operator_note: 'the operator’s notebook',
  radio_patch: 'the disconnected mainland patch',
  tunnel_signal: 'Iris’s account at the service hatch',
});

const DEDUCTION_NAMES = Object.freeze({
  altered_log: 'the official account',
  responsibility: 'the finding Mara signed',
  local_radio_voice: 'the voice on the radio',
});

function idSet(ids) {
  if (ids instanceof Set) return ids;
  if (Array.isArray(ids)) return new Set(ids);
  if (Array.isArray(ids?.solvedIds)) return new Set(ids.solvedIds);
  return new Set();
}

export function createDaybreakReportState() {
  return {
    version: DAYBREAK_REPORT_VERSION,
    lampStatus: null,
    maraResponsibility: null,
    eliasConduct: null,
    submitted: false,
  };
}

// A saved answer counts only if all earlier decisions and its actual source
// records and deductions are still present. Collection alone never solves it.
export function restoreDaybreakReportState(raw, foundIds = [], solvedDeductionIds = []) {
  const state = createDaybreakReportState();
  if (!raw || typeof raw !== 'object' || (raw.version !== undefined && raw.version !== DAYBREAK_REPORT_VERSION)) return state;
  const found = idSet(foundIds);
  const solved = idSet(solvedDeductionIds);
  for (const step of DAYBREAK_REPORT_STEPS) {
    if (raw[step.id] !== step.answer) break;
    if (!step.evidenceIds.every((id) => found.has(id))) break;
    if (!step.deductionIds.every((id) => solved.has(id))) break;
    state[step.id] = step.answer;
  }
  state.submitted = DAYBREAK_REPORT_STEPS.every((step) => state[step.id] === step.answer) && raw.submitted === true;
  return state;
}

export function daybreakReportMilestones(raw) {
  const state = raw && typeof raw === 'object' ? raw : createDaybreakReportState();
  let completedStatements = 0;
  for (const step of DAYBREAK_REPORT_STEPS) {
    if (state[step.id] !== step.answer) break;
    completedStatements += 1;
  }
  const readyToSubmit = completedStatements === DAYBREAK_REPORT_STEPS.length;
  return { completedStatements, readyToSubmit, submitted: readyToSubmit && state.submitted === true };
}

export function getDaybreakReportText(raw) {
  if (!daybreakReportMilestones(raw).readyToSubmit) return null;
  return [
    'CORRECTION TO THE GREYWAKE ACCIDENT FINDING',
    ...DAYBREAK_REPORT_STEPS.map((step) => step.report),
    'I request that the finding assigning sole error to the captain be withdrawn, that the original relay record and both surveyed bearings be preserved, and that the captain’s family receive the corrected evidence. The loss and the years under the false finding cannot be undone.',
    'Mara Vale, survey analyst',
  ].join('\n\n');
}

// Persist only canonical choices. On load, restoreDaybreakReportState checks
// those choices against the discovered records and solved propositions.
export function serializeDaybreakReportState(raw) {
  const state = createDaybreakReportState();
  for (const step of DAYBREAK_REPORT_STEPS) {
    if (raw?.[step.id] !== step.answer) break;
    state[step.id] = step.answer;
  }
  state.submitted = daybreakReportMilestones(state).readyToSubmit && raw?.submitted === true;
  return state;
}

export function applyDaybreakReportAction(previous, action, foundIds = [], solvedDeductionIds = []) {
  const state = restoreDaybreakReportState(previous, foundIds, solvedDeductionIds);
  const result = (status, message, next = state, event = null) => ({
    state: next, status, message, event, reportText: getDaybreakReportText(next),
  });
  if (state.submitted) {
    // The report is saved just before its journal clue. If a browser closes
    // between those writes, let the player finish that interrupted handoff.
    if (action?.type === 'daybreak.record_submitted' && !idSet(foundIds).has('daybreak_report')) {
      return result('complete', 'Mara places the signed correction and its source records into the case file.',
        state, 'daybreak_report_submitted');
    }
    return result('unchanged', 'The corrected report has already been signed and submitted.');
  }

  const step = DAYBREAK_REPORT_STEPS.find((candidate) => state[candidate.id] !== candidate.answer);
  if (!step) {
    if (action?.type !== 'daybreak.submit') return result('blocked', 'Review the assembled report before signing it.');
    const next = { ...state, submitted: true };
    return result('complete', 'Mara signs the correction and submits the evidence for the reopened inquiry.', next, 'daybreak_report_submitted');
  }
  if (action?.type !== step.actionType) return result('blocked', 'Complete the current finding before moving to the next part of the report.');
  const found = idSet(foundIds);
  const solved = idSet(solvedDeductionIds);
  const missingEvidenceIds = step.evidenceIds.filter((id) => !found.has(id));
  if (missingEvidenceIds.length) return result('blocked', `Inspect ${missingEvidenceIds.map((id) => EVIDENCE_NAMES[id]).join(' and ')} before making this finding.`);
  const missingDeductionIds = step.deductionIds.filter((id) => !solved.has(id));
  if (missingDeductionIds.length) return result('blocked', `Settle ${missingDeductionIds.map((id) => `“${DEDUCTION_NAMES[id]}”`).join(' and ')} on the case board first.`);
  const choice = step.choices.find((candidate) => candidate.answer === action?.answer);
  if (!choice) return result('blocked', 'Choose a statement from the report form.');
  if (choice.answer !== step.answer) return result('mistake', choice.mistake);
  const next = { ...state, [step.id]: step.answer };
  return result('changed', step.success, next, 'daybreak_statement_recorded');
}

export function getDaybreakReportPanel(previous, foundIds = [], solvedDeductionIds = []) {
  const state = restoreDaybreakReportState(previous, foundIds, solvedDeductionIds);
  const stepIndex = DAYBREAK_REPORT_STEPS.findIndex((candidate) => state[candidate.id] !== candidate.answer);
  if (stepIndex === -1) {
    const submitted = state.submitted;
    const recordPending = submitted && !idSet(foundIds).has('daybreak_report');
    return {
      step: DAYBREAK_REPORT_STEPS.length,
      title: recordPending ? 'Enter the signed correction' : submitted ? 'Correction submitted' : 'Read before signing',
      text: submitted
        ? recordPending
          ? 'Mara has signed the correction. Place the signed page and its sources into the case file so the return to the family can continue.'
          : 'The old finding is reopened. The inquiry receives a correction limited to what the evidence supports; Iris decides how to hand over her original records.'
        : 'These are the three findings Mara will put on the record. Read them together, then sign the correction.',
      actions: recordPending
        ? [{ label: 'Enter signed correction', action: { type: 'daybreak.record_submitted' } }]
        : submitted ? [] : [{ label: 'Sign and submit correction', action: { type: 'daybreak.submit' } }],
      missingEvidenceIds: [],
      missingDeductionIds: [],
      reportText: getDaybreakReportText(state),
    };
  }
  const step = DAYBREAK_REPORT_STEPS[stepIndex];
  const found = idSet(foundIds);
  const solved = idSet(solvedDeductionIds);
  const missingEvidenceIds = step.evidenceIds.filter((id) => !found.has(id));
  const missingDeductionIds = step.deductionIds.filter((id) => !solved.has(id));
  const missing = [
    ...missingEvidenceIds.map((id) => EVIDENCE_NAMES[id]),
    ...missingDeductionIds.map((id) => `the case-board conclusion “${DEDUCTION_NAMES[id]}”`),
  ];
  return {
    step: stepIndex,
    title: step.title,
    text: missing.length ? `Before recording this finding, revisit ${missing.join(' and ')}.` : step.prompt,
    actions: missing.length ? [] : step.choices.map(({ label, answer }) => ({
      label, action: { type: step.actionType, answer },
    })),
    missingEvidenceIds,
    missingDeductionIds,
    reportText: null,
  };
}
