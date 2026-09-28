import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES } from '../src/story.js';
import { DEDUCTIONS } from '../src/deductions.js';
import {
  DAYBREAK_REPORT_STEPS,
  createDaybreakReportState,
  restoreDaybreakReportState,
  serializeDaybreakReportState,
  applyDaybreakReportAction,
  getDaybreakReportPanel,
  getDaybreakReportText,
  daybreakReportMilestones,
} from '../src/daybreakReport.js';

const found = new Set(DAYBREAK_REPORT_STEPS.flatMap((step) => step.evidenceIds));
const solved = new Set(DAYBREAK_REPORT_STEPS.flatMap((step) => step.deductionIds));

function choose(state, type, answer, evidence = found, deductions = solved) {
  return applyDaybreakReportAction(state, { type, answer }, evidence, deductions);
}

test('each final statement is supported by a discoverable record and explicit deduction', () => {
  const clues = new Map(CLUES.map((clue) => [clue.id, clue]));
  const deductions = new Set(DEDUCTIONS.map((deduction) => deduction.id));
  for (const step of DAYBREAK_REPORT_STEPS) {
    for (const id of step.evidenceIds) {
      assert.ok(clues.has(id), `${step.id} needs a missing clue: ${id}`);
      assert.ok(clues.get(id).minChapter <= 4, `${id} is not discoverable by daybreak`);
    }
    for (const id of step.deductionIds) assert.ok(deductions.has(id), `${step.id} needs a missing deduction: ${id}`);
    assert.ok(step.choices.some((choice) => choice.answer === step.answer));
  }
});

test('the three findings require player decisions; unsupported claims are recoverable', () => {
  let state = createDaybreakReportState();
  const original = structuredClone(state);
  assert.equal(getDaybreakReportPanel(state, found, solved).step, 0);
  assert.equal(choose(state, 'daybreak.submit').status, 'blocked');

  const wrongLamp = choose(state, 'daybreak.lamps', 'captain_chose_reef');
  assert.equal(wrongLamp.status, 'mistake');
  assert.equal(wrongLamp.event, null);
  assert.deepEqual(wrongLamp.state, original);
  state = choose(state, 'daybreak.lamps', 'both_circuits_active').state;
  assert.equal(getDaybreakReportPanel(state, found, solved).step, 1);

  const wrongMara = choose(state, 'daybreak.mara', 'no_responsibility');
  assert.equal(wrongMara.status, 'mistake');
  assert.deepEqual(wrongMara.state, state);
  state = choose(state, 'daybreak.mara', 'removed_uncertainty').state;
  const wrongElias = choose(state, 'daybreak.elias', 'murderous_plan');
  assert.equal(wrongElias.status, 'mistake');
  assert.match(wrongElias.message, /do not prove/);
  assert.deepEqual(wrongElias.state, state);

  const third = choose(state, 'daybreak.elias', 'actions_without_invented_motive');
  state = third.state;
  assert.equal(third.status, 'changed');
  assert.equal(third.event, 'daybreak_statement_recorded');
  assert.equal(daybreakReportMilestones(state).readyToSubmit, true);
  assert.equal(daybreakReportMilestones(state).submitted, false);
  assert.equal(getDaybreakReportPanel(state, found, solved).actions[0].action.type, 'daybreak.submit');
  assert.ok(third.reportText.includes('CORRECTION TO THE GREYWAKE ACCIDENT FINDING'));

  const submitted = choose(state, 'daybreak.submit');
  assert.equal(submitted.status, 'complete');
  assert.equal(submitted.event, 'daybreak_report_submitted');
  assert.equal(daybreakReportMilestones(submitted.state).submitted, true);
  assert.equal(getDaybreakReportPanel(submitted.state, new Set([...found, 'daybreak_report']), solved).actions.length, 0);
  assert.equal(choose(submitted.state, 'daybreak.submit', new Set([...found, 'daybreak_report'])).event,
    null, 'submission event must only fire once');
  assert.deepEqual(original, createDaybreakReportState(), 'actions must not mutate their previous state');
});

test('a submitted report saved before its journal clue can finish that interrupted handoff once', () => {
  let state = createDaybreakReportState();
  for (const step of DAYBREAK_REPORT_STEPS) {
    state = choose(state, step.actionType, step.answer).state;
  }
  state = choose(state, 'daybreak.submit').state;
  const saved = JSON.parse(JSON.stringify(serializeDaybreakReportState(state)));
  const restored = restoreDaybreakReportState(saved, found, solved);
  assert.equal(daybreakReportMilestones(restored).submitted, true);
  const panel = getDaybreakReportPanel(restored, found, solved);
  assert.deepEqual(panel.actions.map(({ action }) => action.type), ['daybreak.record_submitted']);

  const recovered = choose(restored, 'daybreak.record_submitted');
  assert.equal(recovered.status, 'complete');
  assert.equal(recovered.event, 'daybreak_report_submitted');
  assert.deepEqual(recovered.state, restored, 'the signed decision is not repeated or changed');

  const filed = new Set([...found, 'daybreak_report']);
  assert.equal(getDaybreakReportPanel(recovered.state, filed, solved).actions.length, 0);
  assert.equal(choose(recovered.state, 'daybreak.record_submitted', undefined, filed).event, null,
    'the handoff event cannot repeat after the clue has been filed');
});

test('unread records and unsolved deductions block individual statements', () => {
  const blank = createDaybreakReportState();
  const noStrip = new Set(['official_log']);
  assert.deepEqual(getDaybreakReportPanel(blank, noStrip, solved).missingEvidenceIds, ['lamp_strip']);
  assert.equal(getDaybreakReportPanel(blank, noStrip, solved).actions.length, 0);
  assert.equal(choose(blank, 'daybreak.lamps', 'both_circuits_active', noStrip).status, 'blocked');
  assert.deepEqual(getDaybreakReportPanel(blank, found, []).missingDeductionIds, ['altered_log']);
  assert.equal(choose(blank, 'daybreak.lamps', 'both_circuits_active', found, []).status, 'blocked');
  assert.equal(choose(blank, 'daybreak.lamps', 'invented_answer').status, 'blocked');

  const first = choose(blank, 'daybreak.lamps', 'both_circuits_active').state;
  const noDraft = new Set([...found].filter((id) => id !== 'archive_draft_memo'));
  assert.equal(choose(first, 'daybreak.mara', 'removed_uncertainty', noDraft).status, 'blocked');
  assert.deepEqual(getDaybreakReportPanel(first, noDraft, solved).missingEvidenceIds, ['archive_draft_memo']);
});

test('saved report restores only contiguous choices with available proof', () => {
  let state = createDaybreakReportState();
  state = choose(state, 'daybreak.lamps', 'both_circuits_active').state;
  state = choose(state, 'daybreak.mara', 'removed_uncertainty').state;
  const saved = JSON.parse(JSON.stringify(serializeDaybreakReportState(state)));
  assert.deepEqual(restoreDaybreakReportState(saved, found, solved), state);
  assert.equal(getDaybreakReportPanel(saved, found, solved).step, 2);

  const forged = { ...state, eliasConduct: 'actions_without_invented_motive', submitted: true };
  assert.deepEqual(restoreDaybreakReportState(forged, ['official_log'], solved), createDaybreakReportState());
  assert.deepEqual(restoreDaybreakReportState({ ...forged, maraResponsibility: null }, found, solved),
    { ...createDaybreakReportState(), lampStatus: 'both_circuits_active' });
  assert.deepEqual(restoreDaybreakReportState({ ...forged, version: 99 }, found, solved), createDaybreakReportState());
  assert.deepEqual(restoreDaybreakReportState(forged, found, ['altered_log']),
    { ...createDaybreakReportState(), lampStatus: 'both_circuits_active' });
  assert.equal(serializeDaybreakReportState({ ...forged, maraResponsibility: null }).submitted, false);
});

test('assembled text states proven actions and keeps intent limits explicit', () => {
  let state = createDaybreakReportState();
  assert.equal(getDaybreakReportText(state), null);
  state = choose(state, 'daybreak.lamps', 'both_circuits_active').state;
  state = choose(state, 'daybreak.mara', 'removed_uncertainty').state;
  state = choose(state, 'daybreak.elias', 'actions_without_invented_motive').state;
  const report = getDaybreakReportText(state);
  assert.match(report, /both rear-lamp circuits active/);
  assert.match(report, /I removed that qualification/);
  assert.match(report, /does not establish that he intended/);
  assert.match(report, /captain’s family/);
  assert.equal(report.split('\n\n').length, 6, 'title, three selected findings, request, and signature');
  assert.doesNotMatch(report, /murder|hallucination|supernatural/i);
});
