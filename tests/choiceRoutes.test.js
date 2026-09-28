import test from 'node:test';
import assert from 'node:assert/strict';
import { CLUES } from '../src/story.js';
import { DAYBREAK_REPORT_STEPS, getDaybreakReportText } from '../src/daybreakReport.js';
import {
  COMPLETE_PACKET_EVIDENCE, ELIAS_RECORDS_EVIDENCE,
  applyChoiceRouteAction, choiceRouteConsequences, createChoiceRouteState,
  getChoiceRoutePanel, restoreChoiceRouteState, serializeChoiceRouteState,
} from '../src/choiceRoutes.js';

const allFound = new Set(CLUES.map((clue) => clue.id));
const base = {
  foundIds: allFound,
  mainlandConnected: true,
  irisRescued: true,
  reportSubmitted: true,
  inquiryReceipt: false,
};
const act = (state, type, context = base, more = {}) =>
  applyChoiceRouteAction(state, { type, ...more }, context);

test('choice prerequisites refer to reachable physical records', () => {
  const clues = new Map(CLUES.map((clue) => [clue.id, clue]));
  for (const id of [...COMPLETE_PACKET_EVIDENCE, ...ELIAS_RECORDS_EVIDENCE,
    'archive_draft_memo', 'iris_rescued']) {
    assert.ok(clues.has(id), `missing physical record ${id}`);
    assert.ok(clues.get(id).minChapter <= 4, `${id} cannot be found before the inquiry`);
  }
  assert.ok(clues.get('radio_patch').minChapter < clues.get('lamp_strip').minChapter + 1,
    'the player must be able to send a limited alert before collecting all evidence');
  assert.ok(!COMPLETE_PACKET_EVIDENCE.includes('pump_service_order'),
    'the first factual packet must not require an allegation about Elias');
});

test('an early alert survives later discoveries and can be supplemented without delaying rescue', () => {
  const patchOnly = { ...base, foundIds: new Set(['radio_patch']), irisRescued: false, reportSubmitted: false };
  const blank = createChoiceRouteState();
  const firstPanel = getChoiceRoutePanel(blank, 'packet', patchOnly);
  assert.deepEqual(firstPanel.actions.map((entry) => entry.action.type), ['choice.packet.early']);
  const sent = act(blank, 'choice.packet.early', patchOnly);
  assert.equal(sent.status, 'changed');
  assert.equal(sent.event, 'mainland_initial_packet_sent');
  assert.equal(sent.state.initialPacket, 'early');
  assert.equal(sent.consequences.backupReadiness, 'launched_early');
  assert.equal(sent.consequences.eliasHeardBypass, true);
  assert.equal(sent.consequences.rescueBlocked, false);
  assert.deepEqual(blank, createChoiceRouteState(), 'prior state must remain immutable');
  assert.equal(act(sent.state, 'choice.packet.complete', patchOnly).status, 'blocked');

  const completeFound = { ...patchOnly, foundIds: new Set(COMPLETE_PACKET_EVIDENCE) };
  const restored = restoreChoiceRouteState(serializeChoiceRouteState(sent.state), completeFound);
  assert.equal(restored.initialPacket, 'early', 'finding proof later must not rewrite packet history');
  const supplement = act(restored, 'choice.packet.complete', completeFound);
  assert.equal(supplement.event, 'mainland_evidence_supplement_sent');
  assert.equal(supplement.state.initialPacket, 'early');
  assert.equal(supplement.state.supplementSent, true);
  assert.equal(supplement.consequences.mainlandHasFullPacket, true);
  assert.equal(supplement.consequences.backupReadiness, 'launched_early');
  assert.equal(act(supplement.state, 'choice.packet.complete', completeFound).status, 'unchanged');
});

test('waiting for the strip and two photographs produces a stronger first packet but no fail state', () => {
  const available = { ...base, foundIds: new Set(COMPLETE_PACKET_EVIDENCE), irisRescued: false, reportSubmitted: false };
  const panel = getChoiceRoutePanel(createChoiceRouteState(), 'packet', available);
  assert.deepEqual(panel.actions.map((entry) => entry.action.type),
    ['choice.packet.early', 'choice.packet.complete']);
  const full = act(createChoiceRouteState(), 'choice.packet.complete', available);
  assert.equal(full.event, 'mainland_initial_packet_sent');
  assert.equal(full.state.initialPacket, 'complete');
  assert.equal(full.state.supplementSent, false);
  assert.equal(full.consequences.backupReadiness, 'dispatched_with_verified_packet');
  assert.equal(full.consequences.eliasHeardBypass, false);
  assert.equal(full.consequences.rescueBlocked, false);
  assert.equal(act(full.state, 'choice.packet.early', available).status, 'unchanged');
});

test('Elias conversations use what has been found, and follow-up remains possible', () => {
  const patchOnly = { ...base, foundIds: new Set(['radio_patch']), irisRescued: false, reportSubmitted: false };
  const panel = getChoiceRoutePanel(createChoiceRouteState(), 'elias', patchOnly);
  assert.ok(panel.actions.every((entry) => entry.action.type !== 'choice.elias.show_records'));
  assert.equal(act(createChoiceRouteState(), 'choice.elias.show_records', patchOnly).status, 'blocked');
  const asked = act(createChoiceRouteState(), 'choice.elias.ask_account', patchOnly);
  assert.equal(asked.status, 'changed');
  assert.equal(asked.consequences.eliasStatement, 'unsigned_personal_account');
  assert.match(asked.message, /testimony until the physical records/);
  assert.equal(act(asked.state, 'choice.elias.followup_records', patchOnly).status, 'blocked');

  const records = { ...patchOnly, foundIds: new Set(ELIAS_RECORDS_EVIDENCE) };
  const followup = act(asked.state, 'choice.elias.followup_records', records);
  assert.equal(followup.event, 'elias_records_followup');
  assert.equal(followup.consequences.eliasStatement, 'willing_to_sign_limited_facts');
  assert.equal(act(followup.state, 'choice.elias.followup_records', records).status, 'unchanged');

  const shown = act(createChoiceRouteState(), 'choice.elias.show_records', records);
  assert.equal(shown.consequences.eliasStatement, 'willing_to_sign_limited_facts');
  const publicFirst = act(createChoiceRouteState(), 'choice.elias.public_radio', patchOnly);
  const publicFollowup = act(publicFirst.state, 'choice.elias.followup_records', records);
  assert.equal(publicFollowup.consequences.eliasStatement, 'refuses_to_sign');
  assert.equal(publicFollowup.consequences.rescueBlocked, false);
  assert.match(publicFollowup.message, /physical evidence stands without his signature/);
  assert.doesNotMatch([shown.message, asked.message, publicFirst.message, publicFollowup.message].join(' '),
    /intended (the )?wreck|intended Iris to die|murderous/i);
});

test('oral hearing candor varies while the signed correction tells the same truth', () => {
  const notSubmitted = { ...base, reportSubmitted: false };
  assert.equal(getChoiceRoutePanel(createChoiceRouteState(), 'disclosure', notSubmitted).actions.length, 0);
  assert.equal(act(createChoiceRouteState(), 'choice.disclosure.volunteer', notSubmitted).status, 'blocked');

  const volunteer = act(createChoiceRouteState(), 'choice.disclosure.volunteer');
  const prompted = act(createChoiceRouteState(), 'choice.disclosure.answer_when_asked');
  assert.equal(volunteer.state.oralDisclosure, 'volunteer');
  assert.equal(prompted.state.oralDisclosure, 'answer_when_asked');
  assert.match(prompted.message, /written correction already names/);
  assert.match(prompted.message, /notice the delay/);
  assert.equal(volunteer.consequences.rescueBlocked, false);
  assert.equal(prompted.consequences.rescueBlocked, false);

  const written = Object.fromEntries(DAYBREAK_REPORT_STEPS.map((step) => [step.id, step.answer]));
  const report = getDaybreakReportText(written);
  assert.match(report, /I removed that qualification/);
  assert.equal(act(volunteer.state, 'choice.disclosure.answer_when_asked').status, 'unchanged');
});

test('Iris chooses custody; Mara cannot release originals without her decision and a receipt', () => {
  const notRescued = { ...base, irisRescued: false };
  assert.equal(act(createChoiceRouteState(), 'choice.iris.ask', notRescued).status, 'blocked');
  const asked = act(createChoiceRouteState(), 'choice.iris.ask');
  assert.equal(asked.event, 'iris_custody_decided');
  assert.equal(asked.state.irisCustody, 'independent_hold_shared_copies');
  assert.match(asked.message, /Iris keeps the originals/);
  assert.equal(getChoiceRoutePanel(asked.state, 'iris', base).actions.length, 0,
    'player panel cannot offer an original-release action');
  assert.equal(act(asked.state, 'choice.iris.release_after_receipt', { ...base, inquiryReceipt: true }, { actor: 'mara' }).status, 'blocked');
  assert.equal(act(asked.state, 'choice.iris.release_after_receipt', base, { actor: 'iris' }).status, 'blocked');

  const packet = act(asked.state, 'choice.packet.complete');
  const released = act(packet.state, 'choice.iris.release_after_receipt', { ...base, inquiryReceipt: true }, { actor: 'iris' });
  assert.equal(released.event, 'iris_originals_released');
  assert.equal(released.state.irisCustody, 'inquiry_originals_family_copies');
  assert.equal(released.consequences.rescueBlocked, false);
  assert.equal(act(released.state, 'choice.iris.release_after_receipt', { ...base, inquiryReceipt: true }, { actor: 'iris' }).status, 'unchanged');

  const complete = act(createChoiceRouteState(), 'choice.packet.complete');
  const directlyReleased = act(complete.state, 'choice.iris.ask', { ...base, inquiryReceipt: true });
  assert.equal(directlyReleased.state.irisCustody, 'inquiry_originals_family_copies');
});

test('save restoration rejects unavailable evidence, invented values, and old saves safely', () => {
  const blank = createChoiceRouteState();
  assert.deepEqual(restoreChoiceRouteState(null, base), blank);
  assert.deepEqual(restoreChoiceRouteState({ version: 99, initialPacket: 'complete' }, base), blank);
  const forged = {
    ...blank,
    initialPacket: 'complete', supplementSent: true,
    eliasRoute: 'show_records', eliasRecordsShown: true,
    oralDisclosure: 'volunteer', irisAsked: true,
    irisCustody: 'inquiry_originals_family_copies',
  };
  assert.deepEqual(restoreChoiceRouteState(forged, {
    foundIds: new Set(['radio_patch']), mainlandConnected: true,
    irisRescued: false, reportSubmitted: false,
  }), blank);
  assert.deepEqual(serializeChoiceRouteState({
    ...blank, initialPacket: 'invented', eliasRoute: 'ghost',
    oralDisclosure: 'deny', irisAsked: false, irisCustody: 'mara_takes_originals',
  }), blank);
  assert.deepEqual(serializeChoiceRouteState({ ...blank, irisAsked: true, irisCustody: null }), blank,
    'an asked flag without Iris’s actual decision cannot suppress her scene');

  const valid = act(createChoiceRouteState(), 'choice.packet.early').state;
  const roundTrip = JSON.parse(JSON.stringify(serializeChoiceRouteState(valid)));
  assert.deepEqual(restoreChoiceRouteState(roundTrip, base), valid);
  assert.equal(choiceRouteConsequences(valid).mainlandHasFullPacket, false);
});
