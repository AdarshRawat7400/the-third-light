import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCHIVE_CASE_STEPS,
  createArchiveCaseState,
  restoreArchiveCaseState,
  applyArchiveCaseAction,
  getArchiveCasePanel,
  archiveCaseMilestones,
} from '../src/archiveCase.js';
import { CLUES } from '../src/story.js';

const found = new Set([
  'official_log', 'archive_revision_stamp', 'captain_statement',
  'archive_witness_addendum', 'archive_draft_memo', 'archive_chart',
]);

function choose(state, type, answer, discovered = found) {
  return applyArchiveCaseAction(state, { type, answer }, discovered);
}

test('archive reconstruction needs only evidence available in the report chapter', () => {
  const byId = new Map(CLUES.map((clue) => [clue.id, clue]));
  for (const step of ARCHIVE_CASE_STEPS) {
    for (const id of step.evidenceIds) {
      assert.ok(byId.has(id), `missing story clue: ${id}`);
      assert.ok(byId.get(id).minChapter <= 1, `${id} arrives after the report chapter`);
      assert.equal(byId.get(id).room, 'archive', `${id} is not inside the survey archive`);
    }
  }
  assert.ok(![...found].includes('lamp_strip'), 'the later relay original must not be required for the early finding');
});

test('player compares provenance, timing, editorial decision, then evidential limit', () => {
  let state = createArchiveCaseState();
  const initial = structuredClone(state);
  assert.equal(getArchiveCasePanel(state, found).step, 0);
  assert.equal(choose(state, 'archive.finding', 'operation_unresolved').status, 'blocked', 'later steps cannot be skipped');

  const original = choose(state, 'archive.provenance', 'machine_original');
  assert.equal(original.status, 'mistake');
  assert.equal(original.event, null);
  assert.deepEqual(original.state, state);
  const reprint = choose(state, 'archive.provenance', 'later_reprint');
  assert.equal(reprint.status, 'changed');
  assert.equal(reprint.event, 'archive_step_solved');
  assert.match(reprint.message, /not whether its value was changed/);
  state = reprint.state;

  const premature = choose(state, 'archive.testimony', 'both_before');
  assert.equal(premature.status, 'mistake');
  assert.deepEqual(premature.state, state);
  state = choose(state, 'archive.testimony', 'after_finding').state;
  assert.equal(getArchiveCasePanel(state, found).step, 2);

  const tooCertain = choose(state, 'archive.editorial', 'strip_verified');
  assert.equal(tooCertain.status, 'mistake');
  state = choose(state, 'archive.editorial', 'uncertainty_removed').state;
  assert.equal(choose(state, 'archive.finding', 'standby_proven_lit').status, 'mistake');
  const completed = choose(state, 'archive.finding', 'operation_unresolved');
  assert.equal(completed.status, 'complete');
  assert.equal(completed.event, 'archive_reconstructed');
  assert.equal(archiveCaseMilestones(completed.state).reconstructed, true);
  assert.equal(archiveCaseMilestones(completed.state).completedSteps, 4);
  assert.equal(getArchiveCasePanel(completed.state, found).actions.length, 0);
  assert.equal(choose(completed.state, 'archive.finding', 'operation_unresolved').event, null, 'completion must fire once');
  assert.deepEqual(initial, createArchiveCaseState(), 'transitions must not mutate the old state');
});

test('missing or invalid evidence cannot silently finish an archive step', () => {
  const state = createArchiveCaseState();
  const noStamp = new Set(['official_log']);
  const panel = getArchiveCasePanel(state, noStamp);
  assert.deepEqual(panel.missingEvidenceIds, ['archive_revision_stamp']);
  assert.equal(panel.actions.length, 0);
  assert.equal(choose(state, 'archive.provenance', 'later_reprint', noStamp).status, 'blocked');
  assert.equal(choose(state, 'archive.provenance', 'not_a_choice').status, 'blocked');

  const reprint = choose(state, 'archive.provenance', 'later_reprint').state;
  const noAddendum = new Set(['official_log', 'archive_revision_stamp', 'captain_statement']);
  assert.equal(choose(reprint, 'archive.testimony', 'after_finding', noAddendum).status, 'blocked');
  assert.deepEqual(getArchiveCasePanel(reprint, noAddendum).missingEvidenceIds, ['archive_witness_addendum']);
});

test('partial save resumes safely; fabricated or stale completion is discarded', () => {
  let state = createArchiveCaseState();
  state = choose(state, 'archive.provenance', 'later_reprint').state;
  state = choose(state, 'archive.testimony', 'after_finding').state;
  const restored = restoreArchiveCaseState(JSON.parse(JSON.stringify(state)), found);
  assert.deepEqual(restored, state);
  assert.equal(getArchiveCasePanel(restored, found).step, 2);

  const forged = { version: 1, provenance: 'later_reprint', testimony: 'after_finding', editorial: 'uncertainty_removed', finding: 'operation_unresolved' };
  assert.deepEqual(restoreArchiveCaseState(forged, ['official_log']), createArchiveCaseState(),
    'a save cannot claim a solve when the required records are undiscovered');
  assert.deepEqual(restoreArchiveCaseState({ ...forged, testimony: null }, found),
    { version: 1, provenance: 'later_reprint', testimony: null, editorial: null, finding: null },
    'steps cannot be skipped by editing a save');
  assert.equal(archiveCaseMilestones({ ...forged, testimony: null }).completedSteps, 1,
    'a later flag cannot count toward a skipped step');
  assert.deepEqual(restoreArchiveCaseState({ ...forged, version: 99 }, found), createArchiveCaseState());
});
