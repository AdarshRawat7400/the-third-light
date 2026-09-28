// The reopened inquiry is played as a sequence of questions after Mara has
// submitted her correction. It does not replace the signed report or let a
// persuasive answer turn an unproven motive into a fact.

import { choiceRouteConsequences, serializeChoiceRouteState } from './choiceRoutes.js';

export const INQUIRY_VERSION = 1;

export const INQUIRY_STEPS = Object.freeze([
  Object.freeze({
    id: 'provenance',
    title: '1 / Which record was made by the lamps?',
    text: 'The chair places the typed accident export beside the narrow strip Iris preserved. Identify the source and the limit of each record.',
    evidenceIds: Object.freeze(['official_log', 'lamp_strip']),
    actionType: 'inquiry.provenance',
    answers: Object.freeze(['relay_versus_export']),
    choices: Object.freeze([
      Object.freeze({ answer: 'export_is_original', label: 'The typed export is the original because it carries the official signature', mistake: 'A signature authenticates the finding Mara signed. It does not turn a later typed export into the relay’s original marks.' }),
      Object.freeze({ answer: 'relay_versus_export', label: 'The relay punched both rear circuits active at 21:14; the later typed export says one was off' }),
      Object.freeze({ answer: 'relay_proves_motive', label: 'The strip proves Elias deliberately wrecked the ship', mistake: 'Circuit marks establish lamp state. They do not record anyone’s intention aboard either shore or vessel.' }),
    ]),
    success: 'The clerk marks the physical strip as the source for circuit state and the typed export as a conflicting later account.',
  }),
  Object.freeze({
    id: 'bearings',
    title: '2 / Which pair led where?',
    text: 'The family asks why the third light matters. Put the two survey photographs on the same chart without claiming to see through the captain’s eyes.',
    evidenceIds: Object.freeze(['headland_view', 'east_ridge_view', 'captain_statement']),
    actionType: 'inquiry.bearings',
    answers: Object.freeze(['two_surveyed_lines']),
    choices: Object.freeze([
      Object.freeze({ answer: 'window_explains_sea', label: 'The lodge window reflection explains the captain’s sighting at sea', mistake: 'The window made a false light inside the lodge. It cannot account for the physical standby circuit or a view from the vessel.' }),
      Object.freeze({ answer: 'two_surveyed_lines', label: 'The western main pair marks deep water; the eastern standby pair leads toward the reef' }),
      Object.freeze({ answer: 'photos_show_deck', label: 'The survey photographs prove exactly what the captain saw and chose on deck', mistake: 'The photographs establish land bearings. The captain’s account remains testimony about his view from the ship.' }),
    ]),
    success: 'The two bearings can be checked again from fixed stakes. The chair keeps the captain’s perception as testimony, not a camera measurement.',
  }),
  Object.freeze({
    id: 'family',
    title: '3 / The question left for Mara',
    text: 'The captain’s daughter asks: “You wrote that the relay original was missing. What did you do with that warning before you signed?”',
    evidenceIds: Object.freeze(['archive_draft_memo', 'captain_statement', 'official_log']),
    actionType: 'inquiry.family',
    answers: Object.freeze(['removed_qualification']),
    choices: Object.freeze([
      Object.freeze({ answer: 'no_warning', label: 'There was no warning in my draft; the relay turned up seventeen years later', mistake: 'Mara’s own draft requested the relay original and marked lamp status unresolved before she signed.' }),
      Object.freeze({ answer: 'removed_qualification', label: 'I removed that qualification, accepted the export, and called your father’s account uncorroborated' }),
      Object.freeze({ answer: 'mara_caused_wreck', label: 'I altered the lights and caused the grounding', mistake: 'That would replace a documented professional error with actions the evidence does not place Mara near.' }),
    ]),
    success: 'Mara names what she removed and does not ask the family to forgive her. The daughter asks for the draft and the signed page to be placed together on the hearing table.',
  }),
  Object.freeze({
    id: 'elias',
    title: '4 / Elias’s limited account',
    text: 'The chair asks which part of Elias’s explanation can stand beside the records, regardless of whether he signed a statement.',
    evidenceIds: Object.freeze(['pump_service_order', 'operator_note', 'radio_patch', 'tunnel_signal', 'lamp_strip']),
    actionType: 'inquiry.elias',
    answers: Object.freeze(['actions_not_intent']),
    choices: Object.freeze([
      Object.freeze({ answer: 'fear_erases_actions', label: 'He says he was afraid, so the changed line and locked gate no longer matter', mistake: 'Fear is his explanation. It does not erase the recorded standby action, altered line, false radio voice, or Iris’s confinement.' }),
      Object.freeze({ answer: 'actions_not_intent', label: 'The records establish his actions; his explanation does not prove or disprove an intent to ground the ship or kill Iris' }),
      Object.freeze({ answer: 'planned_killing', label: 'The unsent distress call proves he planned to kill Iris', mistake: 'His failure to send help matters, but a drafted, unsent call cannot establish that he planned her death.' }),
    ]),
    success: 'The chair keeps Elias’s account separate from the service order, altered line, island-loop call, and locked gate. Responsibility remains open to investigation.',
  }),
  Object.freeze({
    id: 'iris',
    title: '5 / Who holds the originals?',
    text: 'After the documented family handoff at the jetty, Iris brings the sealed original case into the hearing. The chair asks Mara who is authorized to transfer the original strip and chart.',
    evidenceIds: Object.freeze(['iris_rescued', 'lamp_strip', 'headland_view', 'east_ridge_view']),
    actionType: 'inquiry.iris',
    answers: Object.freeze(['iris_directs_custody']),
    choices: Object.freeze([
      Object.freeze({ answer: 'mara_takes_originals', label: 'Mara takes Iris’s originals because she signed the correction', mistake: 'The signature does not give Mara custody of evidence Iris found and protected. Iris decides the handoff.' }),
      Object.freeze({ answer: 'iris_directs_custody', label: 'Iris decides custody; the family and inquiry receive authenticated records under her documented handoff' }),
      Object.freeze({ answer: 'seize_for_inquiry', label: 'The inquiry can take the originals before Iris verifies its receipt', mistake: 'Iris has not authorized an unreceipted transfer. Copies keep the record available while custody is documented.' }),
    ]),
    success: 'Mara steps back. Iris confirms the family received its authenticated packet at the jetty, then states her own decision about the originals.',
  }),
  Object.freeze({
    id: 'closing',
    title: '6 / What goes on the final page?',
    text: 'The chair can amend the finding today. The family already has its authenticated packet from the jetty. Mara can ask how that receipt and the correction enter the public record.',
    evidenceIds: Object.freeze(['official_log', 'lamp_strip', 'headland_view', 'east_ridge_view']),
    actionType: 'inquiry.closing',
    answers: Object.freeze(['family_copy_first', 'read_into_record']),
    choices: Object.freeze([
      Object.freeze({ answer: 'forgive_and_close', label: 'Record that the family forgave Mara and the matter is closed', mistake: 'The family has made no such promise. A corrected finding cannot return seventeen years or settle every person’s accountability.' }),
      Object.freeze({ answer: 'family_copy_first', label: 'Enter the family’s jetty receipt first; remain available for their questions' }),
      Object.freeze({ answer: 'read_into_record', label: 'Read the correction into the public record, then attach the family’s earlier receipt' }),
    ]),
    success: 'The old sole-error finding is withdrawn. The correction and the family’s prior receipt enter the record without a demand for closure.',
  }),
]);

const VALID_CUSTODY = new Set(['independent_hold_shared_copies', 'inquiry_originals_family_copies']);
const EVIDENCE_NAME = Object.freeze({
  official_log: 'the typed accident log', lamp_strip: 'the original relay strip',
  headland_view: 'the west survey photograph', east_ridge_view: 'the east survey photograph',
  captain_statement: 'the captain’s statement', archive_draft_memo: 'Mara’s original draft',
  pump_service_order: 'the service order', operator_note: 'the operator’s notebook',
  radio_patch: 'the island-loop radio patch', tunnel_signal: 'Iris’s account from the hatch',
  iris_rescued: 'Iris’s rescue record',
});

function contextOf(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const found = source.foundIds instanceof Set ? source.foundIds
    : new Set(Array.isArray(source.foundIds) ? source.foundIds : []);
  const routes = serializeChoiceRouteState(source.choiceRoutes);
  return {
    found,
    reportSubmitted: source.reportSubmitted === true,
    irisRescued: source.irisRescued === true,
    routes,
    consequences: choiceRouteConsequences(routes),
  };
}

function routeReady(step, context) {
  if (step.id === 'family') return Boolean(context.routes.oralDisclosure);
  if (step.id === 'iris') return context.routes.irisAsked && VALID_CUSTODY.has(context.routes.irisCustody);
  return true;
}

export function createInquiryState() {
  return {
    version: INQUIRY_VERSION,
    provenance: null,
    bearings: null,
    family: null,
    elias: null,
    iris: null,
    closing: null,
  };
}

export function serializeInquiryState(raw) {
  const state = createInquiryState();
  if (!raw || typeof raw !== 'object' || raw.version !== INQUIRY_VERSION) return state;
  for (const step of INQUIRY_STEPS) {
    if (!step.answers.includes(raw[step.id])) break;
    state[step.id] = raw[step.id];
  }
  return state;
}

// A saved later answer cannot skip a prior hearing question or survive when
// its evidence, signed correction, rescue, or Iris's own decision is absent.
export function restoreInquiryState(raw, context = {}) {
  const state = createInquiryState();
  const source = serializeInquiryState(raw);
  const contextData = contextOf(context);
  if (!contextData.reportSubmitted || !contextData.irisRescued) return state;
  for (const step of INQUIRY_STEPS) {
    if (!step.answers.includes(source[step.id])) break;
    if (!step.evidenceIds.every((id) => contextData.found.has(id)) || !routeReady(step, contextData)) break;
    state[step.id] = source[step.id];
  }
  return state;
}

export function inquiryMilestones(raw) {
  const state = serializeInquiryState(raw);
  const completedQuestions = INQUIRY_STEPS.findIndex((step) => !step.answers.includes(state[step.id]));
  const count = completedQuestions < 0 ? INQUIRY_STEPS.length : completedQuestions;
  return { completedQuestions: count, complete: count === INQUIRY_STEPS.length };
}

export function getInquirySummaryText(raw, context = {}) {
  const state = restoreInquiryState(raw, context);
  if (!inquiryMilestones(state).complete) return null;
  const { routes, consequences } = contextOf(context);
  const arrival = consequences.backupReadiness === 'launched_early'
    ? 'The narrow first alert began the rescue response before the full packet arrived; the verified records followed.'
    : 'The checked record packet went to mainland before the response. The pilot still held offshore until the safe bearing was confirmed.';
  const disclosure = routes.oralDisclosure === 'volunteer'
    ? 'Mara named her removed qualification before the family asked.'
    : 'Mara answered only after the family asked about her draft. They noticed that delay.';
  const elias = consequences.eliasStatement === 'willing_to_sign_limited_facts'
    ? 'Elias signed a limited account of his standby action and changed line.'
    : consequences.eliasStatement === 'refuses_to_sign'
      ? 'Elias refused a signed account after the public exchange. The physical records did not depend on his signature.'
      : consequences.eliasStatement === 'unsigned_personal_account'
        ? 'Elias’s personal account remained unsigned. The physical records did not depend on it.'
        : 'Elias gave no account at the hearing. The physical records did not depend on one.';
  const custody = routes.irisCustody === 'inquiry_originals_family_copies'
    ? 'After checking the inquiry receipt herself, Iris released sealed originals to the inquiry. She had already given authenticated copies directly to the family at the jetty.'
    : 'Iris kept the sealed originals in independent custody pending a verified receipt. The inquiry received authenticated copies, and Iris had given the family its own packet at the jetty.';
  const close = state.closing === 'family_copy_first'
    ? 'At Mara’s request, the clerk entered the family’s jetty receipt before reading the amended finding. Mara offered to answer questions without asking the family for absolution.'
    : 'At Mara’s request, the chair read the correction into the public record, then attached the earlier jetty delivery receipt.';
  return [
    'REOPENED GREYWAKE INQUIRY',
    'The original relay strip recorded both rear-lamp circuits active at 21:14. The later typed export contradicted it. Independent photographs from both fixed survey stations show the true pair over deep water and the standby pair toward the reef. They do not prove exactly what the captain perceived aboard the ship.',
    `${disclosure} Mara had flagged the missing original in her draft, then removed that qualification and called the captain’s account uncorroborated. The inquiry withdrew the finding assigning sole error to the captain. The amended record does not erase the years his family lived under it.`,
    `${elias} The service order, altered line, island-loop call, and Iris’s account of the locked gate remain subject to investigation. Neither his explanation nor those records establish an intent to ground the ship or kill Iris.`,
    custody,
    arrival,
    close,
  ].join('\n\n');
}

function outcome(state, status, message, context, event = null) {
  return { state, status, message, event, summaryText: getInquirySummaryText(state, context) };
}

export function applyInquiryAction(previous, action, context = {}) {
  const state = restoreInquiryState(previous, context);
  const data = contextOf(context);
  if (!data.reportSubmitted || !data.irisRescued) {
    return outcome(state, 'blocked', 'Finish the signed correction and bring Iris safely home before the reopened inquiry.', context);
  }
  const step = INQUIRY_STEPS.find((candidate) => !candidate.answers.includes(state[candidate.id]));
  if (!step) return outcome(state, 'unchanged', 'The inquiry has amended the finding. Its record is available to read again.', context);
  if (step.id === 'family' && !data.routes.oralDisclosure && action?.type === 'inquiry.request_disclosure') {
    return outcome(state, 'handoff', 'Mara must decide when to speak her removed qualification aloud.', context, 'inquiry_disclosure_requested');
  }
  if (step.id === 'iris' && !data.routes.irisAsked && action?.type === 'inquiry.ask_iris') {
    return outcome(state, 'handoff', 'Ask Iris how she wants to document the custody of her originals.', context, 'inquiry_iris_handoff_requested');
  }
  if (action?.type !== step.actionType) {
    return outcome(state, 'blocked', 'Answer the current inquiry question before moving on.', context);
  }
  const missingEvidenceIds = step.evidenceIds.filter((id) => !data.found.has(id));
  if (missingEvidenceIds.length) {
    return outcome(state, 'blocked', `Bring ${missingEvidenceIds.map((id) => EVIDENCE_NAME[id]).join(' and ')} into the record first.`, context);
  }
  if (!routeReady(step, data)) {
    return outcome(state, 'blocked', step.id === 'family'
      ? 'Mara must speak about her removed qualification before this question can be recorded.'
      : 'Iris must state her own custody decision before Mara answers for it.', context);
  }
  const choice = step.choices.find((candidate) => candidate.answer === action?.answer);
  if (!choice) return outcome(state, 'blocked', 'Choose one of the statements offered at this question.', context);
  if (!step.answers.includes(choice.answer)) return outcome(state, 'mistake', choice.mistake, context);
  const next = { ...state, [step.id]: choice.answer };
  const complete = inquiryMilestones(next).complete;
  return outcome(next, complete ? 'complete' : 'changed', step.success, context,
    complete ? 'inquiry_completed' : 'inquiry_question_recorded');
}

export function getInquiryPanel(previous, context = {}) {
  const state = restoreInquiryState(previous, context);
  const data = contextOf(context);
  const stepIndex = INQUIRY_STEPS.findIndex((step) => !step.answers.includes(state[step.id]));
  if (!data.reportSubmitted || !data.irisRescued) return {
    step: 0, title: 'The reopened inquiry',
    text: 'The hearing can begin after Iris is safe and Mara’s signed correction reaches mainland control.',
    actions: [], missingEvidenceIds: [], summaryText: null,
  };
  if (stepIndex < 0) return {
    step: INQUIRY_STEPS.length, title: 'The amended record',
    text: 'The sole-error finding has been withdrawn. The inquiry continues its work on individual accountability; the family has the corrected sources.',
    actions: [], missingEvidenceIds: [], summaryText: getInquirySummaryText(state, context),
  };
  const step = INQUIRY_STEPS[stepIndex];
  const missingEvidenceIds = step.evidenceIds.filter((id) => !data.found.has(id));
  const routeAction = step.id === 'family' && !data.routes.oralDisclosure
    ? { label: 'Decide when Mara speaks', action: { type: 'inquiry.request_disclosure' } }
    : step.id === 'iris' && !data.routes.irisAsked
      ? { label: 'Ask Iris about the originals', action: { type: 'inquiry.ask_iris' } }
      : null;
  const text = missingEvidenceIds.length
    ? `The clerk needs ${missingEvidenceIds.map((id) => EVIDENCE_NAME[id]).join(' and ')} before this question can be answered.`
    : routeAction ? `${step.text} ${step.id === 'family' ? 'Mara must first decide when to say the correction aloud.' : 'Ask Iris to make her own custody decision first.'}`
      : step.text;
  return {
    step: stepIndex, title: step.title, text,
    actions: missingEvidenceIds.length ? [] : routeAction ? [routeAction]
      : step.choices.map(({ label, answer }) => ({ label, action: { type: step.actionType, answer } })),
    missingEvidenceIds, summaryText: null,
  };
}
