import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHOTO_RECKONING_EVIDENCE, createPhotoReckoningState,
  restorePhotoReckoningState, serializePhotoReckoningState,
  photoReckoningReady, photoReckoningMilestones, photoReckoningSummary,
  getPhotoReckoningPanel, applyPhotoReckoningAction,
} from '../src/photoReckoning.js';
import { createTowerCircuitState } from '../src/towerCircuit.js';
import { createChapterStart } from '../src/chapterSelect.js';

const found = new Set([...PHOTO_RECKONING_EVIDENCE, 'archive_chart']);
const towerCircuit = { ...createTowerCircuitState(), wiringTraced: true,
  testQualified: true, westTraced: true, eastTraced: true };
const context = { chapter: 2, foundIds: found, towerCircuit, atTower: true };
const act = (state, type, answer, options = context) =>
  applyPhotoReckoningAction(state, { type, answer }, options);

test('photo reckoning only opens at the pinned tower rail with its real source records', () => {
  assert.equal(photoReckoningReady(context), true);
  assert.equal(photoReckoningReady({ ...context, chapter: 1 }), false);
  assert.equal(photoReckoningReady({ ...context,
    foundIds: new Set([...found].filter((id) => id !== 'captain_statement')) }), false);
  assert.equal(photoReckoningReady({ ...context,
    towerCircuit: { ...towerCircuit, eastTraced: false } }), false);
  assert.equal(act(createPhotoReckoningState(), 'photo.observation', 'fixed_bearings',
    { ...context, atTower: false }).status, 'blocked');
  const waiting = getPhotoReckoningPanel(null, { ...context, chapter: 1 });
  assert.equal(waiting.actions.length, 0);
  assert.match(waiting.text, /pin both survey photographs/);
  const later = createChapterStart(3);
  const legacy = { ...context, chapter: 3, foundIds: new Set(later.found),
    towerCircuit: null };
  assert.equal(photoReckoningReady(legacy), true,
    'a later chapter slot with a valid alignment can review the optional scene');
});

test('fixed viewpoint, honest annotation, and historical limit form a recoverable scene', () => {
  const initial = createPhotoReckoningState();
  assert.equal(getPhotoReckoningPanel(initial, context).actions.length, 3);
  assert.equal(act(initial, 'photo.annotation', 'dated_file_note').status, 'blocked');
  assert.equal(act(initial, 'photo.observation', 'wreck_night_lit').status, 'mistake');
  assert.equal(act(initial, 'photo.observation', 'window_at_sea').status, 'mistake');
  let result = act(initial, 'photo.observation', 'fixed_bearings');
  assert.equal(result.status, 'changed');
  assert.equal(result.event, 'photo_reckoning_beat');
  assert.equal(photoReckoningMilestones(result.state, context).completedBeats, 1);
  assert.equal(act(result.state, 'photo.annotation', 'erase_original').status, 'mistake');
  assert.equal(act(result.state, 'photo.annotation', 'invent_deck_view').status, 'mistake');
  result = act(result.state, 'photo.annotation', 'dated_file_note');
  assert.equal(result.status, 'changed');
  assert.equal(photoReckoningMilestones(result.state, context).completedBeats, 2);
  assert.equal(act(result.state, 'photo.limit', 'photos_record_old_switch').status, 'mistake');
  assert.equal(act(result.state, 'photo.limit', 'captain_intent').status, 'mistake');
  result = act(result.state, 'photo.limit', 'wreck_night_unresolved');
  assert.equal(result.status, 'complete');
  assert.equal(result.event, 'photo_reckoning_completed');
  assert.equal(photoReckoningMilestones(result.state, context).complete, true);
  assert.equal(act(result.state, 'photo.limit', 'wreck_night_unresolved').status, 'unchanged');
  const summary = photoReckoningSummary(result.state, context);
  assert.match(summary, /original wording/);
  assert.match(summary, /do not show which circuit ran at 21:14/);
  assert.match(summary, /captain’s view from open water/);
  assert.deepEqual(initial, createPhotoReckoningState(), 'transitions do not mutate the prior state');
});

test('both honest annotation routes finish with the same factual limit', () => {
  let state = act(null, 'photo.observation', 'fixed_bearings').state;
  state = act(state, 'photo.annotation', 'field_journal_admission').state;
  state = act(state, 'photo.limit', 'wreck_night_unresolved').state;
  assert.equal(photoReckoningMilestones(state, context).complete, true);
  assert.match(photoReckoningSummary(state, context), /dictated the admission/);
  assert.doesNotMatch(photoReckoningSummary(state, context), /actually operated on the wreck night/);
});

test('serialization and hydration accept only an evidence-backed ordered prefix', () => {
  let state = act(null, 'photo.observation', 'fixed_bearings').state;
  state = act(state, 'photo.annotation', 'field_journal_admission').state;
  const serialized = serializePhotoReckoningState(state);
  assert.deepEqual(restorePhotoReckoningState(JSON.parse(JSON.stringify(serialized)), context), state);
  assert.equal(restorePhotoReckoningState({ ...state, limit: 'wreck_night_unresolved' },
    { ...context, foundIds: new Set([...found].filter((id) => id !== 'headland_view')) }).limit, null);
  assert.deepEqual(restorePhotoReckoningState({ ...state, observation: null,
    limit: 'wreck_night_unresolved' }, context), createPhotoReckoningState());
  assert.deepEqual(restorePhotoReckoningState({ ...state, version: 99 }, context),
    createPhotoReckoningState());
  assert.deepEqual(serializePhotoReckoningState({ ...state, observation: null,
    limit: 'wreck_night_unresolved' }), createPhotoReckoningState());
});
