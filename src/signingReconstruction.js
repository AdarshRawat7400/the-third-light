// A reconstruction of the moment Mara signed, not a flashback that rewrites
// what occurred. Every conclusion is tied to a physical record available in
// Chapter 2. The later relay strip is deliberately absent from this exercise.

export const SIGNING_RECONSTRUCTION_VERSION = 1;

// Metres relative to the survey archive at (-170, 60). The desk anchor is on
// the clear player side of the existing central table and its collision area.
export const SIGNING_STATIONS = Object.freeze([
  Object.freeze({ id: 'intake', name: 'Case intake tray', x: -5.1, z: -0.1,
    key: 'intakeSorted', actionType: 'signing.intake', correct: 'conflicting_accounts',
    evidenceIds: Object.freeze(['official_log', 'captain_statement']) }),
  Object.freeze({ id: 'sleeve', name: 'Empty original-record sleeve', x: 5.1, z: -0.1,
    key: 'originalChecked', actionType: 'signing.sleeve', correct: 'original_absent',
    evidenceIds: Object.freeze(['official_log', 'archive_draft_memo']) }),
  Object.freeze({ id: 'docket', name: 'Office closure docket', x: -3.8, z: 3.2,
    key: 'docketRead', actionType: 'signing.docket', correct: 'deadline_with_qualification',
    evidenceIds: Object.freeze(['archive_draft_memo']) }),
  Object.freeze({ id: 'desk', name: 'Signing table', x: 0, z: 0.05,
    key: 'decisionReconstructed', actionType: 'signing.desk', correct: 'qualification_removed',
    evidenceIds: Object.freeze(['lodge_working_carbon', 'official_log', 'captain_statement', 'archive_draft_memo']) }),
]);

const BY_ID = Object.freeze(Object.fromEntries(SIGNING_STATIONS.map((station) => [station.id, station])));
const REQUIRED_BEFORE_DESK = Object.freeze(['intake', 'sleeve', 'docket']);
const EVIDENCE_NAMES = Object.freeze({
  lodge_working_carbon: 'the working carbon from the keeper’s lodge',
  official_log: 'the typed accident log',
  captain_statement: 'the captain’s original testimony and margin note',
  archive_draft_memo: 'Mara’s draft finding',
});

function foundSet(foundIds) {
  return foundIds instanceof Set ? foundIds : new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createSigningReconstructionState() {
  return { version: SIGNING_RECONSTRUCTION_VERSION,
    intakeSorted: false, originalChecked: false, docketRead: false,
    decisionReconstructed: false };
}

/** Save flags are accepted only when the records needed for that observation
 * are still in the journal. A desk solve cannot survive without all three
 * observations, the carbon copy, and the original Chapter 2 case materials. */
export function restoreSigningReconstructionState(raw, foundIds = []) {
  const state = createSigningReconstructionState();
  if (!raw || typeof raw !== 'object'
    || (raw.version !== undefined && raw.version !== SIGNING_RECONSTRUCTION_VERSION)) return state;
  const found = foundSet(foundIds);
  for (const station of SIGNING_STATIONS) {
    if (station.id === 'desk') continue;
    state[station.key] = raw[station.key] === true && station.evidenceIds.every((id) => found.has(id));
  }
  const desk = BY_ID.desk;
  state.decisionReconstructed = raw.decisionReconstructed === true
    && REQUIRED_BEFORE_DESK.every((id) => state[BY_ID[id].key])
    && desk.evidenceIds.every((id) => found.has(id));
  return state;
}

export function signingReconstructionMilestones(raw, foundIds = []) {
  const state = restoreSigningReconstructionState(raw, foundIds);
  return {
    intakeSorted: state.intakeSorted,
    originalChecked: state.originalChecked,
    docketRead: state.docketRead,
    decisionReconstructed: state.decisionReconstructed,
    completedStations: SIGNING_STATIONS.filter((station) => state[station.key]).length,
  };
}

/** Return the nearest station only if the player is physically inside the
 * archive. The caller may compare its distance with existing clue markers. */
export function nearestSigningStation(x, z, insideId, raw, foundIds = [], radius = 1.5) {
  if (insideId !== 'archive' || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  const state = restoreSigningReconstructionState(raw, foundIds);
  let best = null;
  for (const station of SIGNING_STATIONS) {
    const sx = -170 + station.x, sz = 60 + station.z;
    const distance = Math.hypot(x - sx, z - sz);
    if (distance > radius || (best && distance >= best.distance)) continue;
    const complete = state[station.key];
    best = { id: station.id, name: station.name, x: sx, z: sz,
      distance, complete, prompt: `${complete ? 'Review' : 'Inspect'} ${station.name.toLowerCase()}` };
  }
  return best;
}

function missingFor(station, state, found) {
  return {
    evidenceIds: station.evidenceIds.filter((id) => !found.has(id)),
    stationIds: station.id === 'desk'
      ? REQUIRED_BEFORE_DESK.filter((id) => !state[BY_ID[id].key]) : [],
  };
}

const PANELS = Object.freeze({
  intake: Object.freeze({
    prompt: 'Put the pages Mara had before signing on the tray. The typed export says the standby lamp was disabled; the captain describes a second upper light. What did the case contain at that moment?',
    review: 'Mara had a typed status page and the captain’s conflicting firsthand account. She did not have the deckhand’s later addendum or the original relay strip in this folder.',
    choices: Object.freeze([
      Object.freeze({ label: 'TYPED STATUS AND CONFLICTING CAPTAIN ACCOUNT', answer: 'conflicting_accounts' }),
      Object.freeze({ label: 'TYPED STATUS AND MACHINE ORIGINAL AGREED', answer: 'machine_agreed' }),
      Object.freeze({ label: 'DECKHAND HAD ALREADY CORROBORATED THE CAPTAIN', answer: 'deckhand_present' }),
    ]),
    success: 'The captain’s account was already in Mara’s file. The typed status conflicted with it. The deckhand’s later addendum could strengthen the case now, but was not available to her then.',
    mistake: 'Check what entered the original file before Mara signed. The captain spoke then; the deckhand wrote later, and the machine original is absent.',
    event: 'signing_intake_sorted',
  }),
  sleeve: Object.freeze({
    prompt: 'The sleeve labelled ORIGINAL RELAY COLUMN is empty. The draft asks to obtain that source; the binder contains a typed status line instead. What can the sleeve establish?',
    review: 'The original relay column was not in the material Mara signed from. The empty sleeve does not prove who removed it, when it went missing, or what it would have shown.',
    choices: Object.freeze([
      Object.freeze({ label: 'THE RELAY ORIGINAL WAS NOT CHECKED', answer: 'original_absent' }),
      Object.freeze({ label: 'THE TYPED EXPORT COUNTS AS THE ORIGINAL', answer: 'typed_is_original' }),
      Object.freeze({ label: 'ELIAS DESTROYED THE RELAY ORIGINAL', answer: 'elias_destroyed' }),
    ]),
    success: 'Mara recognized the missing primary source in her own draft. A typed export could be used provisionally, but it could not remove the need to qualify an unresolved lamp status.',
    mistake: 'An empty original sleeve and a later typed page do not identify who handled the original or what it recorded. They show that Mara lacked it.',
    event: 'signing_original_checked',
  }),
  docket: Object.freeze({
    prompt: 'The office routing slip places this finding in the day’s closure stack before the south ferry. It allows unresolved source questions to be listed as qualifications. Beside it, Mara wrote: “Typed export accepted as primary. Do not delay closure.” What did the deadline require?',
    review: 'The office deadline was real; the routing slip still allowed an explicit qualification. No document here says a supervisor ordered Mara to remove her warning.',
    choices: Object.freeze([
      Object.freeze({ label: 'FILE ON TIME, KEEP THE UNRESOLVED QUALIFICATION', answer: 'deadline_with_qualification' }),
      Object.freeze({ label: 'SUPERVISOR ORDERED THE WARNING ERASED', answer: 'supervisor_ordered' }),
      Object.freeze({ label: 'THERE WAS NO CLOSURE PRESSURE', answer: 'no_pressure' }),
    ]),
    success: 'Pressure explains the setting, not the whole decision. The routing slip preserved a way to report uncertainty; Mara chose to cross it out.',
    mistake: 'Separate the office deadline from the wording Mara chose. The slip does not order an unqualified finding.',
    event: 'signing_docket_read',
  }),
  desk: Object.freeze({
    prompt: 'Lay out the lodge carbon, archive draft, typed status, and captain’s margin note. State what Mara knew, what she chose, and what these records cannot prove.',
    review: 'Mara knew the original was missing and the captain’s account conflicted with the typed status. Under closure pressure, she accepted the export, removed “lamp status unresolved,” and marginalised his testimony. These papers do not establish whether the standby lamp was actually lit.',
    choices: Object.freeze([
      Object.freeze({ label: 'I REMOVED A QUALIFICATION I KNEW WAS NEEDED', answer: 'qualification_removed' }),
      Object.freeze({ label: 'I KNEW THE STANDBY LAMP WAS LIT', answer: 'knew_lamp_lit' }),
      Object.freeze({ label: 'THE OFFICE ERASED MY WARNING WITHOUT MY CHOICE', answer: 'office_erased' }),
      Object.freeze({ label: 'THE CAPTAIN WAS PROVED WRONG BY THE TYPED LINE', answer: 'captain_disproved' }),
    ]),
    success: 'You did not invent the conflict, and you could not know the relay state from this file. You did know the primary source was absent. You chose to remove the warning and treated the captain’s account as confusion. That documented choice is yours to correct.',
    mistake: 'Do not grant these records a certainty they lack. Identify Mara’s own edit and margin note while leaving the old circuit state unresolved.',
    event: 'signing_reconstructed',
  }),
});

function optionalContext(found, stationId) {
  const notes = [];
  if (stationId === 'intake' && found.has('archive_witness_addendum')) {
    notes.push('The deckhand’s addendum corroborates two high lights now, but arrived a month after this finding.');
  }
  if (stationId === 'intake' && found.has('prison_intake_ledger')) {
    notes.push('The detention intake preserves the captain’s early account before press coverage; it does not establish which circuit operated.');
  }
  if (stationId === 'sleeve' && found.has('archive_revision_stamp')) {
    notes.push('The later operator reprint shows custody of this typed copy, not the absent machine original.');
  }
  return notes.length ? ` ${notes.join(' ')}` : '';
}

export function getSigningReconstructionPanel(raw, stationId, foundIds = []) {
  const state = restoreSigningReconstructionState(raw, foundIds);
  const found = foundSet(foundIds);
  const station = BY_ID[stationId];
  if (!station) return { stationId: null, title: 'No signing station',
    text: 'Move closer to the archive records.', actions: [],
    missingEvidenceIds: [], missingStationIds: [], complete: false };
  const panel = PANELS[stationId];
  const missing = missingFor(station, state, found);
  const complete = state[station.key];
  const missingNames = [
    ...missing.stationIds.map((id) => BY_ID[id].name.toLowerCase()),
    ...missing.evidenceIds.map((id) => EVIDENCE_NAMES[id]),
  ];
  return {
    stationId, title: station.name, complete,
    missingEvidenceIds: missing.evidenceIds,
    missingStationIds: missing.stationIds,
    text: complete ? panel.review + optionalContext(found, stationId)
      : missingNames.length
        ? `First inspect ${missingNames.join(', ')}. The signing-room finding must be based on records you have read.`
        : panel.prompt + optionalContext(found, stationId),
    actions: complete || missingNames.length ? [] : panel.choices.map(({ label, answer }) => ({
      label, action: { type: station.actionType, answer },
    })),
  };
}

export function applySigningReconstructionAction(previous, action, foundIds = []) {
  const state = restoreSigningReconstructionState(previous, foundIds);
  const found = foundSet(foundIds);
  const result = (status, message, next = state, event = null) => ({ state: next, status, message, event });
  const station = SIGNING_STATIONS.find((item) => item.actionType === action?.type);
  if (!station) return result('blocked', 'Inspect a physical station in the survey archive first.');
  if (state[station.key]) return result('unchanged', 'That part of the reconstruction is already documented.');
  const missing = missingFor(station, state, found);
  if (missing.stationIds.length || missing.evidenceIds.length) {
    return result('blocked', 'Read the named records and inspect the other signing-room stations before making this conclusion.');
  }
  const panel = PANELS[station.id];
  if (!panel.choices.some((choice) => choice.answer === action.answer)) {
    return result('blocked', 'Choose one of the interpretations shown at this station.');
  }
  if (action.answer !== station.correct) return result('mistake', panel.mistake);
  const next = { ...state, [station.key]: true };
  return result(station.id === 'desk' ? 'complete' : 'changed', panel.success, next, panel.event);
}
