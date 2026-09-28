import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES } from '../src/story.js';
import {
  DEDUCTIONS,
  createDeductionState,
  serializeDeductionState,
  attemptDeduction,
  getAvailableDeductions,
  isDeductionSolved,
} from '../src/deductions.js';

const allEvidence = new Set(CLUES.map((clue) => clue.id));
const byId = Object.fromEntries(DEDUCTIONS.map((deduction) => [deduction.id, deduction]));

test('five grounded propositions reference existing evidence and valid dependencies', () => {
  assert.equal(DEDUCTIONS.length, 5);
  assert.equal(new Set(DEDUCTIONS.map((deduction) => deduction.id)).size, DEDUCTIONS.length);
  const preceding = new Set();
  for (const deduction of DEDUCTIONS) {
    assert.ok(deduction.evidenceIds.length >= 2, deduction.id);
    assert.ok(deduction.conclusion && deduction.explanation && deduction.wrongEvidenceMessage);
    for (const id of deduction.evidenceIds) assert.ok(allEvidence.has(id), `${deduction.id}: ${id}`);
    for (const id of deduction.requiresIds) assert.ok(preceding.has(id), `${deduction.id}: missing prerequisite ${id}`);
    preceding.add(deduction.id);
  }
});

test('collecting every clue does not automatically solve a deduction', () => {
  const state = createDeductionState(null, allEvidence);
  assert.deepEqual(state, { solvedIds: [] });
  const available = getAvailableDeductions(state, allEvidence, 4);
  assert.equal(available.length, DEDUCTIONS.length);
  assert.equal(available.filter((entry) => entry.solved).length, 0);
  assert.equal(available.find((entry) => entry.id === 'false_light').ready, true);
  assert.equal(available.find((entry) => entry.id === 'rescue_bearing').ready, false);
});

test('only the exact inspected evidence set solves a proposition; selection order does not matter', () => {
  const original = createDeductionState();
  const result = attemptDeduction(original, 'false_light',
    ['tower_panel', 'east_ridge_view', 'headland_view'], allEvidence);
  assert.equal(result.status, 'solved');
  assert.equal(result.accepted, true);
  assert.deepEqual(original.solvedIds, [], 'attempt must not mutate caller state');
  assert.deepEqual(result.state.solvedIds, ['false_light']);
  assert.match(result.message, /western main/i);
  assert.match(result.message, /reef/i);
  assert.equal(isDeductionSolved(result.state, 'false_light'), true);
  assert.equal(attemptDeduction(result.state, 'false_light', [], allEvidence).status, 'already-solved');
});

test('failed attempts explain absence, bad links, excess cards, and uninspected cards', () => {
  const original = createDeductionState();
  const cases = [
    { selection: [], found: allEvidence, status: 'no-evidence' },
    { selection: ['official_log'], found: allEvidence, status: 'insufficient-evidence' },
    { selection: ['official_log', 'lamp_strip', 'captain_statement'], found: allEvidence, status: 'excess-evidence' },
    { selection: ['official_log', 'captain_statement'], found: allEvidence, status: 'wrong-evidence' },
    { selection: ['official_log', 'lamp_strip'], found: new Set(['official_log']), status: 'undiscovered-evidence' },
    { selection: ['official_log', 'does_not_exist'], found: allEvidence, status: 'invalid-selection' },
    { selection: null, found: allEvidence, status: 'invalid-selection' },
  ];
  for (const { selection, found, status } of cases) {
    const result = attemptDeduction(original, 'altered_log', selection, found);
    assert.equal(result.status, status);
    assert.equal(result.accepted, false);
    assert.ok(result.message.length >= 20, status);
    assert.deepEqual(result.state.solvedIds, []);
  }
  assert.equal(attemptDeduction(original, 'not_a_case', [], allEvidence).status, 'unknown-deduction');
});

test('later rescue and responsibility deductions require earlier player inferences', () => {
  let state = createDeductionState();
  for (const [id, evidence] of [
    ['rescue_bearing', byId.rescue_bearing.evidenceIds],
    ['responsibility', byId.responsibility.evidenceIds],
  ]) {
    const result = attemptDeduction(state, id, evidence, allEvidence);
    assert.equal(result.status, 'missing-prerequisite');
    assert.equal(result.accepted, false);
  }
  state = attemptDeduction(state, 'false_light', byId.false_light.evidenceIds, allEvidence).state;
  state = attemptDeduction(state, 'altered_log', byId.altered_log.evidenceIds, allEvidence).state;
  assert.equal(attemptDeduction(state, 'rescue_bearing', byId.rescue_bearing.evidenceIds, allEvidence).status, 'solved');
  assert.equal(attemptDeduction(state, 'responsibility', byId.responsibility.evidenceIds, allEvidence).status, 'solved');
});

test('solved state survives JSON save and rejects stale or forged entries on load', () => {
  let state = createDeductionState();
  for (const deduction of DEDUCTIONS) {
    const result = attemptDeduction(state, deduction.id, deduction.evidenceIds, allEvidence);
    assert.equal(result.status, 'solved', deduction.id);
    state = result.state;
  }
  const saved = JSON.parse(JSON.stringify(serializeDeductionState(state)));
  assert.deepEqual(createDeductionState(saved, allEvidence), state);
  assert.deepEqual(createDeductionState(null, allEvidence), { solvedIds: [] }, 'old saves stay unsolved');
  const tampered = { version: 1, solvedIds: ['rescue_bearing', 'unknown_case', 'false_light', 'false_light'] };
  assert.deepEqual(createDeductionState(tampered, allEvidence), { solvedIds: ['false_light', 'rescue_bearing'] });
  assert.deepEqual(createDeductionState(saved, ['official_log']), { solvedIds: [] }, 'missing underlying evidence invalidates solution');
  assert.deepEqual(createDeductionState({ version: 100, solvedIds: state.solvedIds }, allEvidence), { solvedIds: [] });
});

test('case board visibility follows chapter and evidence discovery', () => {
  const state = createDeductionState();
  assert.deepEqual(getAvailableDeductions(state, [], 0), []);
  assert.deepEqual(getAvailableDeductions(state, [], 1).map((entry) => entry.id), ['altered_log']);
  const options = getAvailableDeductions(state, ['official_log'], 1);
  assert.equal(options[0].discoveredCount, 1);
  assert.equal(options[0].ready, false);
  assert.equal(getAvailableDeductions(state, allEvidence, 2).length, 2);
});
