import test from 'node:test';
import assert from 'node:assert/strict';
import { closestFieldClue, selectFieldInteraction } from '../src/fieldInteraction.js';
import { ISLAND_PEOPLE } from '../src/islandPeople.js';
import { CLUES, SITES } from '../src/story.js';

const at = (distance, extras = {}) => ({ distance, ...extras });

test('an unrecorded required clue remains usable beside an optional Iris trace', () => {
  const clue = { id: 'tunnel_signal' };
  const irisStation = at(0.3, { id: 'hatch' });
  const target = selectFieldInteraction({ clue, clueDistance: 1.4,
    requiredClue: true, irisStation });
  assert.equal(target.kind, 'clue');
  assert.equal(target.target, clue);

  const optional = selectFieldInteraction({ clue, clueDistance: 1.4,
    requiredClue: false, irisStation });
  assert.equal(optional.kind, 'irisTrail');
  assert.equal(optional.target, irisStation);
});

test('the tower control panel stays reachable beside its wiring plaque', () => {
  const clue = { id: 'tower_panel' };
  const towerStation = at(0.2, { id: 'wiring' });
  const target = selectFieldInteraction({ clue, clueDistance: 0.4,
    requiredClue: true, towerStation });
  assert.equal(target.kind, 'clue');
  assert.equal(selectFieldInteraction({ clue, clueDistance: 0.4,
    towerStation }).kind, 'tower');
});

test('the shared prompt and E target selection preserves nearby world interactions', () => {
  const person = at(1.1, { id: 'iris' });
  const vehicle = at(1.8, { id: 'sedan' });
  const signingStation = at(0.9, { id: 'desk' });
  assert.equal(selectFieldInteraction({ person, vehicle, signingStation }).kind, 'signing');
  assert.equal(selectFieldInteraction({ person, vehicle }).kind, 'person');
  assert.equal(selectFieldInteraction({ vehicle }).kind, 'vehicle');
  assert.equal(selectFieldInteraction({ person: at(1.5),
    irisStation: at(1.5) }).kind, 'irisTrail', 'stations win exact distance ties');
  assert.equal(selectFieldInteraction({ clue: { id: 'radio_patch' },
    clueDistance: 2.5, irisStation: at(0.8) }).kind, 'irisTrail');
  assert.equal(selectFieldInteraction({}), null);
});

test('the new witness and jetty stations cannot hide an unrecorded chapter clue', () => {
  const clue = { id: 'daybreak_report' };
  const witnessStation = at(0.5, { id: 'witness_table' });
  const jettyStation = at(0.8, { id: 'case' });
  assert.equal(selectFieldInteraction({ clue, clueDistance: 1.5, requiredClue: true,
    witnessStation, jettyStation }).kind, 'clue');
  assert.equal(selectFieldInteraction({ clue, clueDistance: 1.5,
    witnessStation, jettyStation }).kind, 'witness');
  assert.equal(selectFieldInteraction({ jettyStation }).kind, 'jetty');
});

test('ambient prison conversations yield to required evidence and remain reachable', () => {
  const guard = at(0.8, { id: 'gate-guard' });
  const clue = { id: 'prison_intake_ledger' };
  assert.equal(selectFieldInteraction({ prisonPerson: guard }).kind, 'prisonPerson');
  assert.equal(selectFieldInteraction({ prisonPerson: guard,
    clue, clueDistance: 1.6, requiredClue: true }).kind, 'clue');
  assert.equal(selectFieldInteraction({ prisonPerson: guard,
    clue, clueDistance: 1.6 }).kind, 'prisonPerson');
});

test('optional gatehouse chronology yields to a required clue and keeps its own E prompt', () => {
  const chronologyStation = at(0.7, { id: 'chronology', prompt: 'Compare the witness chronology' });
  const clue = { id: 'official_log' };
  assert.equal(selectFieldInteraction({ chronologyStation })?.kind, 'chronology');
  assert.equal(selectFieldInteraction({ chronologyStation,
    clue, clueDistance: 1.1, requiredClue: true })?.kind, 'clue');
});

test('Daybreak custody action is at Iris and wins over her generic conversation', () => {
  const iris = ISLAND_PEOPLE.find((person) => person.id === 'iris');
  const custody = CLUES.find((clue) => clue.id === 'iris_handoff');
  assert.deepEqual(custody.world, iris.arrival);
  const target = selectFieldInteraction({
    clue: custody, clueDistance: 0.8, requiredClue: true,
    person: at(0.8, { id: 'iris', name: 'Iris Hale' }),
  });
  assert.equal(target.kind, 'clue');
  assert.equal(target.target.id, 'iris_handoff');
});

test('Chapter 6 repeater controls remain selectable until the mainland circuit is live', () => {
  const radio = SITES.find((site) => site.id === 'radio');
  const routing = CLUES.find((clue) => clue.id === 'radio_route_verified');
  const terminal = CLUES.find((clue) => clue.id === 'daybreak_report');
  const positionFor = (clue) => ({ x: radio.x + clue.x, z: radio.z + clue.z });
  const atControls = {
    clues: [routing, terminal], chapter: 5, insideId: 'radio',
    x: radio.x + routing.x, z: radio.z + routing.z,
    foundIds: new Set(['radio_route_verified']), mainlandConnected: false,
    positionFor,
  };
  assert.equal(closestFieldClue(atControls)?.id, 'radio_route_verified');
  assert.equal(closestFieldClue({ ...atControls, mainlandConnected: true })?.id,
    'daybreak_report');
  assert.equal(closestFieldClue({ ...atControls,
    x: radio.x + terminal.x, z: radio.z + terminal.z })?.id,
  'daybreak_report', 'the unfinished terminal still works at its own desk');

  const ordinaryReview = { ...atControls, clues: [
    { id: 'previous', minChapter: 0, room: 'radio', x: routing.x, z: routing.z },
    { id: 'new', minChapter: 0, room: 'radio', x: routing.x + 1.5, z: routing.z },
  ], foundIds: new Set(['previous']) };
  assert.equal(closestFieldClue(ordinaryReview)?.id, 'new',
    'unrecorded clues retain their priority over ordinary review clues');
});
