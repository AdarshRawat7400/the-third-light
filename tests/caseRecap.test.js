import test from 'node:test';
import assert from 'node:assert/strict';
import { caseRecap } from '../src/caseRecap.js';

test('returning-player recap reveals only recorded sources and keeps perception bounded', () => {
  const fresh = caseRecap([]);
  assert.equal(fresh.length, 1);
  assert.match(fresh[0].text, /No case observation/);
  assert.doesNotMatch(JSON.stringify(fresh), /relay strip records|local island loop/);

  const crossing = caseRecap([], { arrivalNotes: ['first', 'second'] });
  assert.equal(crossing.length, 1);
  assert.equal(crossing[0].source, 'CROSSING NOTES');
  assert.match(crossing[0].text, /2 of 4 observations/);
  assert.doesNotMatch(crossing[0].text, /safe present-day bearing|relay strip/);

  const first = caseRecap(['iris_note', 'window_reflection', 'lodge_working_carbon']);
  assert.equal(first.length, 3);
  assert.match(first[0].text, /claim/);
  assert.match(first[1].text, /not what the captain saw/);
  assert.doesNotMatch(JSON.stringify(first), /both rear lamp circuits active|intercepted calls/);

  const remembered = caseRecap(['lodge_working_carbon'], { signingMemoryComplete: true });
  assert.match(remembered[0].text, /remembers striking/);
  assert.match(remembered[0].text, /not the wreck-night circuit state/);
});

test('later recap distinguishes field geometry, original relay proof, and intent', () => {
  const beats = caseRecap(new Set([
    'headland_view', 'east_ridge_view', 'alignment_solution',
    'radio_route_verified', 'lamp_strip', 'iris_rescued', 'daybreak_report',
  ]));
  const combined = beats.map((beat) => beat.text).join(' ');
  assert.match(combined, /present-day leading-light lines/);
  assert.match(combined, /both rear lamp circuits active at 21:14/);
  assert.match(combined, /not who changed the later typed account or what anyone intended/);
  assert.ok(beats.every((beat) => beat.title && beat.source && beat.text));
});
