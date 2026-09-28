// An optional gatehouse comparison of four existing sources. The player can
// strengthen the provenance of the captain's account without making a witness
// statement stand in for the missing mechanical lamp-command strip.

export const WITNESS_CHRONOLOGY_VERSION = 1;
export const WITNESS_CHRONOLOGY_STATION = Object.freeze({
  id: 'chronology', name: 'Witness chronology board', x: -70.6, z: 100.2,
  prompt: 'Compare the witness chronology',
});

export const WITNESS_CHRONOLOGY_EVIDENCE = Object.freeze([
  'prison_intake_ledger', 'captain_statement',
  'archive_witness_addendum', 'archive_draft_memo',
]);

export const WITNESS_CHRONOLOGY_SUMMARY = 'The captain reported a lower light and two possible upper lights in a dated wreck-morning intake entry before press coverage. His hearing account preserves that core. A deckhand later recalled a second high light, but filed after the finding and after publicity. Mara’s old dismissal outran the evidence available to her; none of these accounts establishes the wreck-night circuit state without the original relay strip.';

const SOURCE_NAMES = Object.freeze({
  prison_intake_ledger: 'the wreck-morning intake ledger',
  captain_statement: 'the captain’s hearing testimony',
  archive_witness_addendum: 'the deckhand’s later addendum',
  archive_draft_memo: 'Mara’s draft finding',
});

export const WITNESS_CHRONOLOGY_BEATS = Object.freeze([
  Object.freeze({ id: 'intake', label: 'WRECK MORNING', source: 'Detention intake ledger', key: 'intakeDated' }),
  Object.freeze({ id: 'captain', label: 'ORIGINAL HEARING', source: 'Captain’s testimony', key: 'captainCompared' }),
  Object.freeze({ id: 'deckhand', label: 'ONE MONTH LATER', source: 'Deckhand’s addendum', key: 'deckhandQualified' }),
  Object.freeze({ id: 'margin', label: 'MARA’S FINDING', source: 'Draft and margin note', key: 'marginRevised' }),
]);

const STEPS = Object.freeze([
  Object.freeze({
    type: 'chronology.intake', key: 'intakeDated', correct: 'before_press',
    title: 'The earliest account',
    text: 'The gatehouse officer wrote a compressed account of a lower light and two possible upper lights. Set its dated page against the hearing transcript and the later press coverage. When did those words first enter the record?',
    choices: Object.freeze([
      Object.freeze({ label: 'ON THE WRECK MORNING, BEFORE PRESS COVERAGE', answer: 'before_press' }),
      Object.freeze({ label: 'ONLY AFTER THE HEARING', answer: 'after_hearing' }),
      Object.freeze({ label: 'WHEN THE RELAY STRIP WAS RECOVERED', answer: 'after_relay' }),
    ]),
    success: 'Mara reads her old margin again. The captain reported two possible upper lights before press coverage, so it was not a detail acquired from a newspaper. The dated entry preserves his report, not the actual lamp state.',
    mistake: 'Check the dated intake line. It records what the captain said that morning, before the hearing and before press coverage.',
  }),
  Object.freeze({
    type: 'chronology.captain', key: 'captainCompared', correct: 'same_core',
    title: 'The captain’s later words',
    text: 'Place the hearing transcript beside the intake page. The transcript has more detail than the hurried gatehouse line. What changed in the central claim?',
    choices: Object.freeze([
      Object.freeze({ label: 'THE CORE TWO-UPPER-LIGHT REPORT IS CONSISTENT', answer: 'same_core' }),
      Object.freeze({ label: 'THE CAPTAIN FIRST INVENTED A SECOND HIGH LIGHT AT THE HEARING', answer: 'invented_later' }),
      Object.freeze({ label: 'THE TWO ACCOUNTS PROVE BOTH REAR LAMPS WERE ON', answer: 'lamps_proven' }),
    ]),
    success: 'The morning and hearing records preserve the same core sighting. His later detail does not transform testimony into a circuit record.',
    mistake: 'Both documents mention the lower light and two possible upper lights. Their consistency supports when the captain made the claim, not whether both circuits ran.',
  }),
  Object.freeze({
    type: 'chronology.deckhand', key: 'deckhandQualified', correct: 'later_support',
    title: 'A late second witness',
    text: 'The deckhand wrote a month after Mara signed. In the meantime, the newspapers had carried the story. How much weight can his account of a second high light bear?',
    choices: Object.freeze([
      Object.freeze({ label: 'A SECOND ACCOUNT, FILED LATE AND AFTER PUBLICITY', answer: 'later_support' }),
      Object.freeze({ label: 'CONTEMPORANEOUS PROOF THAT MARA IGNORED', answer: 'contemporaneous' }),
      Object.freeze({ label: 'A SUBSTITUTE FOR THE ORIGINAL RELAY STRIP', answer: 'relay_substitute' }),
    ]),
    success: 'Another witness recalls a second high light. His addendum corroborates the sighting but arrived too late for Mara’s original decision and after possible press influence.',
    mistake: 'The date matters: this account was filed after the finding and after press coverage. It cannot replace the relay original or be blamed on Mara’s signing-day choice.',
  }),
  Object.freeze({
    type: 'chronology.margin', key: 'marginRevised', correct: 'bounded_revision',
    title: 'The crossed-out warning',
    text: 'Mara’s old margin called the captain uncorroborated. Her draft separately asked for the missing relay original. What can she responsibly write beside that old dismissal now?',
    choices: Object.freeze([
      Object.freeze({ label: 'EARLY REPORT CONFIRMED; LATER SUPPORT; LAMP STATE STILL OPEN', answer: 'bounded_revision' }),
      Object.freeze({ label: 'THE CAPTAIN WAS WRONG BECAUSE THE TYPED EXPORT SAID SO', answer: 'export_final' }),
      Object.freeze({ label: 'THE WITNESSES ALONE PROVE THE STANDBY WAS LIVE', answer: 'witness_proof' }),
    ]),
    success: 'Mara writes a narrow amendment: the captain’s two-upper-light report predates publicity; a later witness supports it with a timing caveat. Her earlier certainty was unwarranted. Only the original relay can settle which circuits ran.',
    mistake: 'A dated account rebuts the idea of a late invention, but no witness can read the old circuit. The later addendum also cannot be retroactively placed on Mara’s desk at signing.',
  }),
]);

function foundSet(foundIds) {
  return foundIds instanceof Set ? foundIds : new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createWitnessChronologyState() {
  return { version: WITNESS_CHRONOLOGY_VERSION, intakeDated: false,
    captainCompared: false, deckhandQualified: false, marginRevised: false };
}

// Restore only the longest valid prefix that the saved evidence can support.
// Older saves simply start this optional scene from its first comparison.
export function restoreWitnessChronologyState(raw, foundIds = []) {
  const state = createWitnessChronologyState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || raw.version !== WITNESS_CHRONOLOGY_VERSION) return state;
  const found = foundSet(foundIds);
  if (!found.has('prison_intake_ledger') || raw.intakeDated !== true) return state;
  state.intakeDated = true;
  if (!found.has('captain_statement') || raw.captainCompared !== true) return state;
  state.captainCompared = true;
  if (!found.has('archive_witness_addendum') || raw.deckhandQualified !== true) return state;
  state.deckhandQualified = true;
  if (!found.has('archive_draft_memo') || raw.marginRevised !== true) return state;
  state.marginRevised = true;
  return state;
}

export function witnessChronologyMilestones(raw, foundIds = []) {
  const state = restoreWitnessChronologyState(raw, foundIds);
  const completedBeats = WITNESS_CHRONOLOGY_BEATS.filter((beat) => state[beat.key]).length;
  return { completedBeats, complete: state.marginRevised };
}

export function nearestWitnessChronologyStation(x, z, chapter, radius = 3.2) {
  if (!Number.isFinite(x) || !Number.isFinite(z) || chapter < 1
    || !Number.isFinite(radius) || radius <= 0) return null;
  const station = WITNESS_CHRONOLOGY_STATION;
  const distance = Math.hypot(x - station.x, z - station.z);
  return distance <= radius ? { ...station, distance } : null;
}

export function getWitnessChronologyPanel(raw, foundIds = [], chapter = 1) {
  const found = foundSet(foundIds);
  const state = restoreWitnessChronologyState(raw, found);
  const beats = WITNESS_CHRONOLOGY_BEATS.map((beat) => ({
    id: beat.id, label: beat.label, source: beat.source, done: state[beat.key],
  }));
  if (chapter < 1) return { title: 'Witness chronology',
    text: 'The gatehouse comparison begins in Chapter 2.', actions: [], beats,
    missingEvidenceIds: [], complete: false };
  const step = STEPS.find((item) => !state[item.key]);
  if (!step) return { title: 'An account with a date',
    text: 'The chronology is in Mara’s field journal. It strengthens the provenance of the captain’s early sighting while leaving the old lamp state to the mechanical strip.',
    actions: [], beats, missingEvidenceIds: [], complete: true };
  const missingEvidenceIds = WITNESS_CHRONOLOGY_EVIDENCE.filter((id) => !found.has(id));
  if (missingEvidenceIds.length) return { title: 'Four sources, different dates',
    text: `The board has spaces for ${missingEvidenceIds.map((id) => SOURCE_NAMES[id]).join(', ')}. Inspect the physical sources in the gatehouse and archive, then return to compare their timing.`,
    actions: [], beats, missingEvidenceIds, complete: false };
  return { title: step.title, text: step.text,
    actions: step.choices.map(({ label, answer }) => ({ label,
      action: { type: step.type, answer } })),
    beats, missingEvidenceIds: [], complete: false };
}

export function applyWitnessChronologyAction(raw, action, foundIds = [], chapter = 1) {
  const found = foundSet(foundIds);
  const state = restoreWitnessChronologyState(raw, found);
  const same = (status, message, event = null) => ({ state, status, message, event });
  if (chapter < 1) return same('blocked', 'The comparison begins in Chapter 2.');
  const step = STEPS.find((item) => !state[item.key]);
  if (!step) return same('unchanged', 'The dated comparison is already in the field journal.');
  if (WITNESS_CHRONOLOGY_EVIDENCE.some((id) => !found.has(id))) {
    return same('blocked', 'Inspect the gatehouse ledger, captain’s testimony, late addendum, and Mara’s draft first.');
  }
  if (action?.type !== step.type || !step.choices.some((choice) => choice.answer === action.answer)) {
    return same('blocked', 'Use the next dated source on the board.');
  }
  if (action.answer !== step.correct) return same('mistake', step.mistake);
  const next = { ...state, [step.key]: true };
  return { state: next, status: step.key === 'marginRevised' ? 'complete' : 'changed',
    message: step.success,
    event: step.key === 'marginRevised' ? 'witness_chronology_complete' : `witness_${step.key}` };
}
