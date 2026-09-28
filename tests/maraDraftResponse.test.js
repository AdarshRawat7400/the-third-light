import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARA_DRAFT_RESPONSE_EVIDENCE, createMaraDraftResponseState,
  restoreMaraDraftResponseState, serializeMaraDraftResponseState,
  maraDraftResponseReady, maraDraftResponseMilestones,
  maraHeldStatementText, maraDraftResponseSummary, maraDraftResponseEcho,
  getMaraDraftResponsePanel, applyMaraDraftResponseAction,
} from '../src/maraDraftResponse.js';
import { createChapterStart } from '../src/chapterSelect.js';
import { getJettyReturnPanel } from '../src/jettyReturn.js';

const found = new Set(MARA_DRAFT_RESPONSE_EVIDENCE);
const context = { chapter: 1, foundIds: found, atArchive: true };
const act = (state, type, answer, ctx = context) =>
  applyMaraDraftResponseAction(state, { type, answer }, ctx);

test('the held statement starts only after existing archive records are compared', () => {
  assert.equal(maraDraftResponseReady(context), true);
  assert.equal(maraDraftResponseReady({ ...context, chapter: 0 }), false);
  assert.equal(maraDraftResponseReady({ ...context,
    foundIds: new Set([...found].filter((id) => id !== 'archive_reconstruction')) }), false);
  assert.equal(act(null, 'draft.pageOrder', 'draft_first',
    { ...context, atArchive: false }).status, 'blocked');
  assert.equal(getMaraDraftResponsePanel(null, { ...context, chapter: 0 }).actions.length, 0);
  assert.equal(MARA_DRAFT_RESPONSE_EVIDENCE.includes('lamp_strip'), false,
    'Chapter 2 response never requires or silently supplies the later relay record');
  const later = createChapterStart(2);
  const laterContext = { chapter: 2, foundIds: new Set(later.found), atArchive: true };
  assert.equal(maraDraftResponseReady(laterContext), true);
  assert.equal(maraDraftResponseMilestones(later.maraDraftResponse, laterContext).completedBeats, 0,
    'a later chapter slot keeps earlier evidence but does not invent this optional response');
});

test('Mara can begin with either old page, then must name her own edit without changing it', () => {
  const initial = createMaraDraftResponseState();
  assert.equal(getMaraDraftResponsePanel(initial, context).actions.length, 2);
  assert.equal(act(initial, 'draft.admission', 'own_removed_warning').status, 'blocked');
  const first = act(initial, 'draft.pageOrder', 'captain_first');
  assert.equal(first.status, 'changed');
  assert.match(getMaraDraftResponsePanel(first.state, context).text, /Uncorroborated/);
  assert.equal(act(first.state, 'draft.admission', 'office_forced').status, 'mistake');
  assert.equal(act(first.state, 'draft.admission', 'original_checked').status, 'mistake');
  const admitted = act(first.state, 'draft.admission', 'own_removed_warning');
  assert.equal(admitted.status, 'changed');
  assert.match(maraHeldStatementText(admitted.state, context), /I removed/);
  assert.match(maraHeldStatementText(admitted.state, context), /original was absent/);
  assert.deepEqual(initial, createMaraDraftResponseState(), 'scene transitions never mutate the prior state');
});

test('a provisional working statement is source-bound, unsent, and allows two future intentions', () => {
  for (const futureAddress of ['leave_family_space', 'offer_account_later']) {
    let state = act(null, 'draft.pageOrder', 'draft_first').state;
    state = act(state, 'draft.admission', 'own_removed_warning').state;
    assert.equal(act(state, 'draft.limit', 'standby_proven_lit').status, 'mistake');
    assert.equal(act(state, 'draft.limit', 'standby_proven_off').status, 'mistake');
    state = act(state, 'draft.limit', 'old_circuit_unresolved').state;
    assert.equal(act(state, 'draft.futureAddress', 'demand_closure').status, 'mistake');
    state = act(state, 'draft.futureAddress', futureAddress).state;
    assert.equal(act(state, 'draft.placement', 'send_final_now').status, 'mistake');
    const completed = act(state, 'draft.placement', 'field_journal');
    assert.equal(completed.status, 'complete');
    assert.equal(completed.event, 'mara_draft_response_complete');
    assert.equal(maraDraftResponseMilestones(completed.state, context).complete, true);
    assert.match(maraHeldStatementText(completed.state, context), /Provisional, held; not sent/);
    assert.match(maraDraftResponseSummary(completed.state, context), /not been sent/);
    assert.match(maraDraftResponseEcho(completed.state, context), /never sent in place/);
    assert.equal(act(completed.state, 'draft.placement', 'working_case_folder').status, 'unchanged');
  }
});

test('the alternative page order and placement affect the account, not the physical finding', () => {
  let state = act(null, 'draft.pageOrder', 'captain_first').state;
  state = act(state, 'draft.admission', 'own_removed_warning').state;
  state = act(state, 'draft.limit', 'old_circuit_unresolved').state;
  state = act(state, 'draft.futureAddress', 'offer_account_later').state;
  state = act(state, 'draft.placement', 'working_case_folder').state;
  const summary = maraDraftResponseSummary(state, context);
  assert.match(summary, /captain’s account/);
  assert.match(summary, /working case folder/);
  assert.match(summary, /do not establish the wreck-night lamp state/);
  assert.doesNotMatch(summary, /Mara altered the lamp log|captain caused the wreck/);
  assert.match(getMaraDraftResponsePanel(state, context).text, /original record/);
});

test('save hydration removes forged later beats and missing source support', () => {
  let state = act(null, 'draft.pageOrder', 'draft_first').state;
  state = act(state, 'draft.admission', 'own_removed_warning').state;
  state = act(state, 'draft.limit', 'old_circuit_unresolved').state;
  assert.deepEqual(restoreMaraDraftResponseState(
    JSON.parse(JSON.stringify(serializeMaraDraftResponseState(state))), context), state);
  const forged = { ...state, placement: 'working_case_folder' };
  assert.equal(restoreMaraDraftResponseState(forged, context).placement, null,
    'a missing family-facing intention cannot be skipped');
  assert.deepEqual(restoreMaraDraftResponseState({ ...forged, version: 99 }, context),
    createMaraDraftResponseState());
  assert.deepEqual(restoreMaraDraftResponseState(forged, { ...context,
    foundIds: new Set([...found].filter((id) => id !== 'captain_statement')) }),
  createMaraDraftResponseState());
  assert.deepEqual(serializeMaraDraftResponseState({ ...forged, admission: 'invented' }),
    { ...createMaraDraftResponseState(), pageOrder: 'draft_first' });
});

test('the later family meeting echoes only a completed, source-backed private statement', () => {
  let response = act(null, 'draft.pageOrder', 'captain_first').state;
  response = act(response, 'draft.admission', 'own_removed_warning').state;
  response = act(response, 'draft.limit', 'old_circuit_unresolved').state;
  response = act(response, 'draft.futureAddress', 'offer_account_later').state;
  response = act(response, 'draft.placement', 'working_case_folder').state;
  const jettyFound = new Set([...found, 'launch_guided', 'iris_rescued', 'iris_handoff',
    'daybreak_report', 'lamp_strip', 'headland_view', 'east_ridge_view']);
  const jettyContext = {
    chapter: 5, foundIds: jettyFound, reportSubmitted: true,
    choiceRoutes: { version: 1, irisAsked: true,
      irisCustody: 'independent_hold_shared_copies' },
  };
  const jettyState = { version: 1, berth: 'safe_berth_documented',
    case: 'family_copy_inventory', opening: null, proof: null, cost: null, handoff: null };
  const without = getJettyReturnPanel(jettyState, 'family', jettyContext).text;
  assert.doesNotMatch(without, /held statement/);
  const withEcho = getJettyReturnPanel(jettyState, 'family', {
    ...jettyContext, maraDraftResponse: response,
  }).text;
  assert.match(withEcho, /held statement/);
  assert.match(withEcho, /never sent in place of a corrected finding/);
  assert.match(withEcho, /without asking for forgiveness/);
  const missingSupport = getJettyReturnPanel(jettyState, 'family', {
    ...jettyContext,
    foundIds: new Set([...jettyFound].filter((id) => id !== 'archive_reconstruction')),
    maraDraftResponse: response,
  }).text;
  assert.equal(missingSupport, without);
});
