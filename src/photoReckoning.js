import { towerCircuitMilestones } from './towerCircuit.js';

// A Chapter 3 pause at the tower plotting rail. The photographs show what two
// fixed land stations see today. They can challenge Mara's old dismissal of
// the captain without supplying the missing wreck-night relay original.
export const PHOTO_RECKONING_VERSION = 1;
export const PHOTO_RECKONING_EVIDENCE = Object.freeze([
  'window_reflection', 'captain_statement', 'headland_view', 'east_ridge_view',
  'tower_panel',
]);

const ANNOTATIONS = Object.freeze([
  'dated_file_note', 'field_journal_admission',
]);

function foundSet(value) {
  return value instanceof Set ? value : new Set(Array.isArray(value) ? value : []);
}

function contextOf(context = {}) {
  const chapter = Number.isInteger(context.chapter) ? context.chapter : -1;
  const found = foundSet(context.foundIds);
  const tower = towerCircuitMilestones(context.towerCircuit, found);
  return { chapter, found, tower, atTower: context.atTower === true };
}

export function photoReckoningReady(context = {}) {
  const { chapter, found, tower } = contextOf(context);
  return chapter >= 2 && PHOTO_RECKONING_EVIDENCE.every((id) => found.has(id))
    && tower.westTraced && tower.eastTraced;
}

export function createPhotoReckoningState() {
  return {
    version: PHOTO_RECKONING_VERSION,
    observation: null,
    annotation: null,
    limit: null,
  };
}

// Saves contain an ordered prefix only. Missing source evidence or an unpinned
// photograph removes the scene state without changing the main case record.
export function restorePhotoReckoningState(raw, context = {}) {
  const state = createPhotoReckoningState();
  if (!photoReckoningReady(context) || !raw || typeof raw !== 'object'
    || Array.isArray(raw) || raw.version !== PHOTO_RECKONING_VERSION) return state;
  if (raw.observation !== 'fixed_bearings') return state;
  state.observation = raw.observation;
  if (!ANNOTATIONS.includes(raw.annotation)) return state;
  state.annotation = raw.annotation;
  if (raw.limit === 'wreck_night_unresolved') state.limit = raw.limit;
  return state;
}

export function serializePhotoReckoningState(raw) {
  const state = createPhotoReckoningState();
  if (!raw || raw.version !== PHOTO_RECKONING_VERSION) return state;
  if (raw.observation !== 'fixed_bearings') return state;
  state.observation = raw.observation;
  if (!ANNOTATIONS.includes(raw.annotation)) return state;
  state.annotation = raw.annotation;
  if (raw.limit === 'wreck_night_unresolved') state.limit = raw.limit;
  return state;
}

export function photoReckoningMilestones(raw, context = {}) {
  const state = restorePhotoReckoningState(raw, context);
  const completedBeats = [state.observation, state.annotation, state.limit].filter(Boolean).length;
  return { completedBeats, complete: completedBeats === 3 };
}

export function photoReckoningSummary(raw, context = {}) {
  const state = restorePhotoReckoningState(raw, context);
  if (state.limit !== 'wreck_night_unresolved') return null;
  const placement = state.annotation === 'dated_file_note'
    ? 'Mara appended a dated annotation beside her old margin, preserving the original wording.'
    : 'Mara dictated the admission into her field journal for the reopened file, preserving the original margin.';
  return [
    'TOWER PLOTTING RAIL · MARA’S FIELD RECKONING',
    'The wet lodge window produced a reflection that shifted with Mara’s position. The west and east photographs came from fixed, surveyed bolts and each put a different rear lamp above the lower front lamp. That makes a second seaward line physically plausible; a window reflection cannot explain a captain’s view from open water.',
    `${placement} She had called the captain’s second high light stress confusion when the evidence she held did not justify that certainty. His exact deck view remains his testimony, not a new observation by Mara.`,
    'The photographs describe geometry today. They do not show which circuit ran at 21:14 on the wreck night. The original relay record is still required.',
  ].join('\n\n');
}

const button = (label, type, answer) => ({ label, action: { type, answer } });

export function getPhotoReckoningPanel(raw, context = {}) {
  const state = restorePhotoReckoningState(raw, context);
  if (!photoReckoningReady(context)) return {
    title: 'Two pictures, one old sentence',
    text: 'Read the captain’s statement and lodge reflection, then pin both survey photographs at the tower plotting rail.',
    actions: [], complete: false, summaryText: null,
  };
  if (!state.observation) return {
    title: 'A mark that stays put',
    text: 'Mara lays the two prints beneath her old margin: “second high light—stress confusion.” The wet lodge glass once doubled a lamp, but its image moved when she moved. What distinguishes the survey photographs?',
    actions: [
      button('Their fixed bolts give two reproducible bearings; the lodge reflection shifted', 'photo.observation', 'fixed_bearings'),
      button('Both prints prove the lamp was live at 21:14 seventeen years ago', 'photo.observation', 'wreck_night_lit'),
      button('The lodge reflection explains what a captain saw from open water', 'photo.observation', 'window_at_sea'),
    ], complete: false, summaryText: null,
  };
  if (!state.annotation) return {
    title: 'Do not erase the margin',
    text: 'The old sentence stays visible. Mara remembers how quickly she wrote it. The new photographs make a second line plausible, while the captain’s actual sighting remains his own account. Where should Mara put her correction to that dismissal?',
    actions: [
      button('Append a dated file note beside the original margin', 'photo.annotation', 'dated_file_note'),
      button('Dictate an admission for the reopened file in the field journal', 'photo.annotation', 'field_journal_admission'),
      button('Scratch out the old margin so nobody can see it', 'photo.annotation', 'erase_original'),
      button('Write that Mara herself saw the wreck from the captain’s deck', 'photo.annotation', 'invent_deck_view'),
    ], complete: false, summaryText: null,
  };
  if (!state.limit) return {
    title: 'What the prints cannot remember',
    text: state.annotation === 'dated_file_note'
      ? 'The dated note names the overconfident dismissal. Now Mara must leave one line open in the case file.'
      : 'The recording names the overconfident dismissal. Now Mara must leave one line open in the case file.',
    actions: [
      button('Leave the wreck-night circuit state open until the relay original is found', 'photo.limit', 'wreck_night_unresolved'),
      button('Treat the new photos as a recording of the old switch state', 'photo.limit', 'photos_record_old_switch'),
      button('Conclude the captain intended to choose the reef', 'photo.limit', 'captain_intent'),
    ], complete: false, summaryText: null,
  };
  return {
    title: 'The sentence beneath the photographs',
    text: 'Mara has marked her dismissal as unsupported without revising the historical page. Both seaward lines exist in today’s survey. The missing relay original must answer which rear circuits operated on the wreck night.',
    actions: [], complete: true, summaryText: photoReckoningSummary(state, context),
  };
}

function result(state, status, message, event = null) {
  return { state, status, message, event };
}

export function applyPhotoReckoningAction(previous, action, context = {}) {
  const state = restorePhotoReckoningState(previous, context);
  if (!photoReckoningReady(context)) return result(state, 'blocked',
    'Pin both field photographs and inspect the captain’s old account and lodge reflection first.');
  if (contextOf(context).atTower !== true) return result(state, 'blocked',
    'Return to the tower plotting rail to compare the original margin with the photographs.');
  if (state.limit) return result(state, 'unchanged', 'Mara’s dated reckoning is already in the field journal.');
  if (!state.observation) {
    if (action?.type !== 'photo.observation') return result(state, 'blocked', 'Compare the physical viewpoints first.');
    if (action.answer === 'wreck_night_lit') return result(state, 'mistake',
      'A present-day photograph records a bearing, not the wreck-night circuit state.');
    if (action.answer === 'window_at_sea') return result(state, 'mistake',
      'The rain-window image shifted with the observer inside the lodge. The captain reported lights from open water.');
    if (action.answer !== 'fixed_bearings') return result(state, 'blocked', 'Choose an observation shown by the fixed survey bolts.');
    return result({ ...state, observation: action.answer }, 'changed',
      'The two fixed stakes reproduce two different seaward lines. Mara holds the prints against her old dismissal.', 'photo_reckoning_beat');
  }
  if (!state.annotation) {
    if (action?.type !== 'photo.annotation') return result(state, 'blocked', 'Decide how to annotate the historical margin.');
    if (action.answer === 'erase_original') return result(state, 'mistake',
      'Erasing the old margin would hide the professional decision that needs explaining. Preserve it with a dated correction.');
    if (action.answer === 'invent_deck_view') return result(state, 'mistake',
      'Mara photographed fixed points on land. The captain’s view from his deck remains his own testimony.');
    if (!ANNOTATIONS.includes(action.answer)) return result(state, 'blocked', 'Choose an available, source-bound annotation.');
    return result({ ...state, annotation: action.answer }, 'changed',
      'Mara names the unsupported “stress confusion” label beside the original record. She does not replace the old page.', 'photo_reckoning_beat');
  }
  if (action?.type !== 'photo.limit') return result(state, 'blocked', 'State the photographs’ limit before filing the note.');
  if (action.answer === 'photos_record_old_switch') return result(state, 'mistake',
    'These prints were made today. Only a source from the wreck night can establish the old circuit state.');
  if (action.answer === 'captain_intent') return result(state, 'mistake',
    'A sightline does not reveal what the captain intended; it shows where a pair would lead.');
  if (action.answer !== 'wreck_night_unresolved') return result(state, 'blocked', 'Choose an available evidentiary limit.');
  return result({ ...state, limit: action.answer }, 'complete',
    'The field note separates Mara’s withdrawn dismissal, the two present-day bearings, and the old circuit question that still needs an original record.', 'photo_reckoning_completed');
}
