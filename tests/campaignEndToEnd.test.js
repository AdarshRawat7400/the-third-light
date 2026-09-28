import test from 'node:test';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import * as THREE from 'three';
import { CHAPTERS, CLUES } from '../src/story.js';
import { createChapterStart } from '../src/chapterSelect.js';
import { campaignAdvanceStatus } from '../src/campaignProgression.js';
import { createWorld } from '../src/world.js';
import { applyLodgeSequenceAction, getLodgeSequencePanel, restoreLodgeSequenceState } from '../src/lodgeSequence.js';
import { applySigningMemoryAction, getSigningMemoryPanel, restoreSigningMemoryState } from '../src/signingMemory.js';
import { applySigningReconstructionAction, getSigningReconstructionPanel, restoreSigningReconstructionState } from '../src/signingReconstruction.js';
import { applyArchiveCaseAction, getArchiveCasePanel, restoreArchiveCaseState } from '../src/archiveCase.js';
import { beginSurvey, captureSurvey, createSurveyState, evaluateSurveyFrame, serializeSurveyState, stepSurveyHold, SURVEY_STAKES } from '../src/surveyCamera.js';
import { applyTowerCircuitAction, getTowerCircuitPanel, restoreTowerCircuitState } from '../src/towerCircuit.js';
import { applyMechanismAction, getMechanismPanel, mechanismMilestones, restoreMechanismState, tickMechanisms, TUNNEL_DRAIN_SECONDS } from '../src/mechanisms.js';
import { attemptDeduction, createDeductionState, serializeDeductionState } from '../src/deductions.js';
import { applyRadioRoutingAction, getRadioRoutingPanel, radioRoutingMilestones, restoreRadioRoutingState } from '../src/radioRouting.js';
import { applyChoiceRouteAction, choiceRouteConsequences, getChoiceRoutePanel, restoreChoiceRouteState, serializeChoiceRouteState } from '../src/choiceRoutes.js';
import { applyWitnessConfrontationAction, getWitnessConfrontationPanel, restoreWitnessConfrontationState, serializeWitnessConfrontationState } from '../src/witnessConfrontation.js';
import { applyHatchAction, getHatchPanel, restoreHatchState } from '../src/hatchSequence.js';
import { applyRescueAftermathAction, getRescueAftermathPanel, restoreRescueAftermathState } from '../src/rescueAftermath.js';
import { applyDaybreakReportAction, daybreakReportMilestones, getDaybreakReportPanel, restoreDaybreakReportState, serializeDaybreakReportState } from '../src/daybreakReport.js';
import { applyJettyReturnAction, getJettyReturnPanel, restoreJettyReturnState, serializeJettyReturnState } from '../src/jettyReturn.js';
import { applyInquiryAction, getInquiryPanel, inquiryMilestones, restoreInquiryState,
  serializeInquiryState } from '../src/inquirySequence.js';

const clueById = new Map(CLUES.map((clue) => [clue.id, clue]));
const world = createWorld(new THREE.Scene(), new THREE.Camera());
const json = (value) => JSON.parse(JSON.stringify(value));

function context(state) {
  return {
    foundIds: state.found,
    mainlandConnected: radioRoutingMilestones(state.routing).mainlandConnected,
    irisRescued: state.found.has('iris_rescued'),
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    inquiryReceipt: choiceRouteConsequences(state.choices).mainlandHasFullPacket,
  };
}
function witnessContext(state) {
  return { chapter: state.chapter, atRadioHouse: true, foundIds: state.found,
    radioRouting: state.routing, choiceRoutes: state.choices };
}
function jettyContext(state) {
  return { chapter: state.chapter, foundIds: state.found,
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    choiceRoutes: state.choices };
}
function inquiryContext(state) {
  return { foundIds: state.found,
    reportSubmitted: daybreakReportMilestones(state.daybreakReport).submitted,
    irisRescued: state.found.has('iris_rescued'), choiceRoutes: state.choices };
}

// Mirrors the production save's puzzle fields and its evidence-aware hydrate
// order. The test crosses this JSON boundary repeatedly, not just at the end.
function snapshot(state) {
  return {
    version: 7, chapter: state.chapter, ended: state.ended, found: [...state.found],
    deductions: serializeDeductionState(state.deductions),
    lodge: state.lodge, signingMemory: state.signingMemory,
    signing: state.signing, archive: state.archive, towerCircuit: state.towerCircuit,
    mechanisms: state.mechanisms, survey: serializeSurveyState(state.survey),
    radioRouting: state.routing, choiceRoutes: serializeChoiceRouteState(state.choices),
    witnessConfrontation: serializeWitnessConfrontationState(state.witness),
    hatch: state.hatch, rescueAftermath: state.rescueAftermath,
    daybreakReport: serializeDaybreakReportState(state.daybreakReport),
    jettyReturn: serializeJettyReturnState(state.jettyReturn),
    inquiry: serializeInquiryState(state.inquiry),
  };
}
function hydrate(raw) {
  const found = new Set(raw.found);
  const deductions = createDeductionState(raw.deductions, found);
  const daybreakReport = restoreDaybreakReportState(raw.daybreakReport, found, deductions.solvedIds);
  const routing = restoreRadioRoutingState(raw.radioRouting, found);
  const choices = restoreChoiceRouteState(raw.choiceRoutes, {
    foundIds: found, mainlandConnected: radioRoutingMilestones(routing).mainlandConnected,
    irisRescued: found.has('iris_rescued'),
    reportSubmitted: daybreakReportMilestones(daybreakReport).submitted,
  });
  const priorSigning = found.has('archive_signing_finding')
    ? { version: 1, intakeSorted: true, originalChecked: true,
      docketRead: true, decisionReconstructed: true } : null;
  return {
    chapter: raw.chapter, ended: Boolean(raw.ended), found, deductions,
    lodge: restoreLodgeSequenceState(raw.lodge, found),
    signingMemory: restoreSigningMemoryState(raw.signingMemory, found),
    signing: restoreSigningReconstructionState(raw.signing ?? priorSigning, found),
    archive: restoreArchiveCaseState(raw.archive, found),
    towerCircuit: restoreTowerCircuitState(raw.towerCircuit, found),
    mechanisms: restoreMechanismState(raw.mechanisms, found),
    survey: createSurveyState(raw.survey), routing, choices,
    witness: restoreWitnessConfrontationState(raw.witnessConfrontation, {
      chapter: raw.chapter, foundIds: found, radioRouting: routing, choiceRoutes: choices,
    }),
    hatch: restoreHatchState(raw.hatch, found),
    rescueAftermath: restoreRescueAftermathState(raw.rescueAftermath, { foundIds: found }),
    daybreakReport,
    jettyReturn: restoreJettyReturnState(raw.jettyReturn, {
      chapter: raw.chapter, foundIds: found,
      reportSubmitted: daybreakReportMilestones(daybreakReport).submitted,
      choiceRoutes: choices,
    }),
    inquiry: restoreInquiryState(raw.inquiry, { foundIds: found,
      reportSubmitted: daybreakReportMilestones(daybreakReport).submitted,
      irisRescued: found.has('iris_rescued'), choiceRoutes: choices }),
  };
}
function resume(state) {
  const saved = json(snapshot(state));
  const restored = hydrate(saved);
  assert.deepEqual(snapshot(restored), saved, `Chapter ${state.chapter + 1} did not resume faithfully`);
  return restored;
}
function collect(state, id) {
  const clue = clueById.get(id);
  assert.ok(clue, `${id} is missing from the world`);
  assert.ok(clue.minChapter <= state.chapter, `${id} is not available in Chapter ${state.chapter + 1}`);
  assert.equal(clue.special, undefined, `${id} requires its authored interaction`);
  state.found.add(id);
}
function earned(state, id, event, expectedEvent) {
  assert.equal(event, expectedEvent, `${id} was not earned by its puzzle`);
  assert.ok(CHAPTERS[state.chapter].required.includes(id));
  state.found.add(id);
}
function offered(panel, action) {
  assert.ok(panel.actions.some((entry) => isDeepStrictEqual(entry.action, action)),
    `Action ${JSON.stringify(action)} was not offered by ${panel.title}`);
}
function choose(state, field, panel, apply, action, expectedStatus = null) {
  offered(panel, action);
  const previous = state[field];
  const result = apply(previous, action);
  if (expectedStatus) assert.equal(result.status, expectedStatus, JSON.stringify(action));
  else assert.ok(['changed', 'complete'].includes(result.status),
    `${JSON.stringify(action)} returned ${result.status}: ${result.message}`);
  // A wrong harbor draft is intentionally retained so the player can inspect
  // and correct it; other mistakes leave their local state unchanged.
  state[field] = result.state;
  return result;
}
function advance(state, expected) {
  const status = campaignAdvanceStatus(state);
  assert.equal(status.ready, true, `Chapter ${state.chapter + 1} blocked: ${status.reason} ${status.missingIds}`);
  assert.equal(status.nextChapter, expected);
  if (status.finish) state.ended = true;
  else state.chapter = status.nextChapter;
}
function deduce(state, id, wrong = null) {
  const correct = {
    false_light: ['headland_view', 'east_ridge_view', 'tower_panel'],
    altered_log: ['official_log', 'lamp_strip'],
    local_radio_voice: ['radio_patch', 'tunnel_signal'],
    rescue_bearing: ['headland_view', 'east_ridge_view', 'pump_power'],
    responsibility: ['official_log', 'captain_statement', 'lamp_strip'],
  }[id];
  assert.ok(correct);
  if (wrong) {
    const prior = json(state.deductions);
    const failed = attemptDeduction(state.deductions, id, wrong, state.found);
    assert.equal(failed.accepted, false);
    assert.deepEqual(failed.state, prior);
  }
  const result = attemptDeduction(state.deductions, id, correct, state.found);
  assert.equal(result.status, 'solved', id);
  state.deductions = result.state;
}

function playArrival(state) {
  assert.equal(state.chapter, 0);
  for (const id of ['iris_note', 'window_reflection']) collect(state, id);
  assert.deepEqual(campaignAdvanceStatus(state).missingIds, ['lodge_working_carbon']);
  const lodge = (station) => getLodgeSequencePanel(state.lodge, station, state.found);
  const doLodge = (station, answer, status = null) => choose(state, 'lodge', lodge(station),
    (prior, action) => applyLodgeSequenceAction(prior, action, state.found),
    { type: `lodge.${station}`, answer }, status);
  doLodge('lamp', 'cover_harbor', 'mistake');
  doLodge('shutter', 'latch_open');
  doLodge('lamp', 'shade_away');
  doLodge('folder', 'take_carbon');
  earned(state, 'lodge_working_carbon', doLodge('desk', 'qualification_removed').event,
    'lodge_case_compared');
  assert.equal(campaignAdvanceStatus(state).reason, 'signing_memory');
  const memory = () => getSigningMemoryPanel(state.signingMemory, state.found);
  const doMemory = (action, status = null) => choose(state, 'signingMemory', memory(),
    (prior, selected) => applySigningMemoryAction(prior, selected, state.found), action, status);
  for (const cueId of ['sleeve', 'carbon', 'closure']) doMemory({ type: 'memory.inspect', cueId });
  doMemory({ type: 'memory.decision', answer: 'kept_warning' }, 'mistake');
  doMemory({ type: 'memory.decision', answer: 'removed_warning_and_signed' });
  doMemory({ type: 'memory.limit', answer: 'standby_lit' }, 'mistake');
  assert.equal(doMemory({ type: 'memory.limit', answer: 'circuit_unproved' }).event,
    'signing_memory_complete');
  advance(state, 1);
}

function playReport(state) {
  assert.equal(state.chapter, 1);
  for (const id of ['official_log', 'captain_statement', 'archive_chart',
    'archive_draft_memo', 'archive_revision_stamp', 'archive_witness_addendum']) collect(state, id);
  const signing = (station) => getSigningReconstructionPanel(state.signing, station, state.found);
  const doSigning = (station, answer, status = null) => choose(state, 'signing', signing(station),
    (prior, action) => applySigningReconstructionAction(prior, action, state.found),
    { type: `signing.${station}`, answer }, status);
  doSigning('intake', 'conflicting_accounts');
  doSigning('sleeve', 'original_absent');
  doSigning('docket', 'deadline_with_qualification');
  doSigning('desk', 'knew_lamp_lit', 'mistake');
  earned(state, 'archive_signing_finding', doSigning('desk', 'qualification_removed').event,
    'signing_reconstructed');
  const archive = () => getArchiveCasePanel(state.archive, state.found);
  const doArchive = (type, answer, status = null) => choose(state, 'archive', archive(),
    (prior, action) => applyArchiveCaseAction(prior, action, state.found),
    { type: `archive.${type}`, answer }, status);
  doArchive('provenance', 'machine_original', 'mistake');
  doArchive('provenance', 'later_reprint');
  doArchive('testimony', 'after_finding');
  doArchive('editorial', 'uncertainty_removed');
  earned(state, 'archive_reconstruction', doArchive('finding', 'operation_unresolved').event,
    'archive_reconstructed');
  advance(state, 2);
}

function photograph(state, id) {
  const [x, z] = SURVEY_STAKES[id].position;
  const observer = { x, y: world.terrainHeight(x, z) + 1.72, z };
  const view = { stakeId: id, observer, yaw: 0, pitch: 0, fov: 34, aspect: 16 / 9,
    terrainHeight: world.terrainHeight, visibleLights: { front: true, main: true, standby: true } };
  const aiming = evaluateSurveyFrame(view);
  const frame = evaluateSurveyFrame({ ...view, yaw: aiming.targetYaw, pitch: aiming.targetPitch });
  assert.equal(frame.status, 'ready', `${id} has no usable survey view`);
  state.survey = beginSurvey(state.survey, id);
  assert.equal(captureSurvey(state.survey, frame).accepted, false, 'shutter must need a steady hold');
  for (let frameIndex = 0; frameIndex < 9; frameIndex++) {
    state.survey = stepSurveyHold(state.survey, frame, 0.1);
  }
  const captured = captureSurvey(state.survey, frame);
  assert.equal(captured.accepted, true);
  state.survey = captured.state;
  state.found.add(id);
}
function playLights(state) {
  assert.equal(state.chapter, 2);
  photograph(state, 'headland_view');
  photograph(state, 'east_ridge_view');
  collect(state, 'tower_panel');
  const tower = (station) => getTowerCircuitPanel(state.towerCircuit, station, state.found);
  const doTower = (station, detail, status = null) => choose(state, 'towerCircuit', tower(station),
    (prior, action) => applyTowerCircuitAction(prior, action, state.found),
    { type: `tower.${station}`, ...detail }, status);
  doTower('wiring', { answer: 'standby_connected' });
  doTower('test', { answer: 'present_only' });
  doTower('overlay', { stake: 'west', rear: 'main' });
  doTower('overlay', { stake: 'east', rear: 'standby' });
  doTower('chart', { answer: 'standby_deep' }, 'mistake');
  const result = doTower('chart', { answer: 'main_deep' });
  assert.equal(result.event, 'tower_channel_compared');
  const doAlign = (action) => choose(state, 'mechanisms', getMechanismPanel(state.mechanisms, 'alignment'),
    (prior, selected) => applyMechanismAction(prior, selected, state.found), action);
  doAlign({ type: 'alignment.trace', stake: 'west', rear: 'main' });
  doAlign({ type: 'alignment.trace', stake: 'east', rear: 'standby' });
  earned(state, 'alignment_solution', doAlign({ type: 'alignment.confirm', rear: 'main' }).event,
    'alignment_solved');
  assert.equal(campaignAdvanceStatus(state).reason, 'deduction');
  deduce(state, 'false_light', ['iris_note', 'window_reflection', 'tower_panel']);
  advance(state, 3);
}

function playVoice(state) {
  assert.equal(state.chapter, 3);
  for (const id of ['radio_patch', 'radio_switchboard', 'island_loop_ledger',
    'lamp_strip', 'tunnel_signal', 'pump_service_order', 'operator_note']) collect(state, id);
  const routing = () => getRadioRoutingPanel(state.routing, state.found);
  const doRoute = (action) => choose(state, 'routing', routing(),
    (prior, selected) => applyRadioRoutingAction(prior, selected, state.found), action);
  doRoute({ type: 'routing.traceLoop', feed: 'island_loop' });
  doRoute({ type: 'routing.checkMainland', continuity: 'open' });
  earned(state, 'radio_route_verified', doRoute({ type: 'routing.locateVoice',
    source: 'local_microphone' }).event, 'route_verified');
  const elias = { type: 'choice.elias.ask_account' };
  choose(state, 'choices', getChoiceRoutePanel(state.choices, 'elias', context(state)),
    (prior, action) => applyChoiceRouteAction(prior, action, context(state)), elias);
  assert.equal(campaignAdvanceStatus(state).reason, 'witness_finding');
  const witness = () => getWitnessConfrontationPanel(state.witness, witnessContext(state));
  const doWitness = (action, status = null) => {
    const result = choose(state, 'witness', witness(),
      (prior, selected) => applyWitnessConfrontationAction(prior, selected,
        witnessContext(state)), action, status);
    if (result.choiceAction) {
      const followup = applyChoiceRouteAction(state.choices, result.choiceAction, context(state));
      assert.equal(followup.status, 'changed');
      state.choices = followup.state;
    }
    return result;
  };
  doWitness({ type: 'witness.compareVoice' });
  doWitness({ type: 'witness.compareOrder' });
  doWitness({ type: 'witness.compareRelay' });
  doWitness({ type: 'witness.hearAccount' });
  doWitness({ type: 'witness.testAccount' });
  doWitness({ type: 'witness.recordFinding', claim: 'intent_proven' }, 'mistake');
  assert.equal(doWitness({ type: 'witness.recordFinding', claim: 'bounded' }).event,
    'witness_account_compared');
  deduce(state, 'altered_log');
  deduce(state, 'local_radio_voice');
  advance(state, 4);
}

function playRescue(state) {
  assert.equal(state.chapter, 4);
  const mechanism = (puzzle, action, status = null) => choose(state, 'mechanisms',
    getMechanismPanel(state.mechanisms, puzzle),
    (prior, selected) => applyMechanismAction(prior, selected, state.found), action, status);
  for (const type of ['power.inspect', 'power.isolateMains', 'power.warnLaunch',
    'power.openDischarge', 'power.startBackup']) mechanism('power', { type });
  earned(state, 'pump_power', mechanism('power', { type: 'power.startPump' }).event,
    'power_restored');
  assert.equal(campaignAdvanceStatus(state).reason, 'required_clues');
  deduce(state, 'rescue_bearing'); // Required before the harbor radio opens in main.js.
  mechanism('radio', { type: 'radio.inspectChart' });
  mechanism('radio', { type: 'radio.hold' });
  mechanism('radio', { type: 'radio.select', rear: 'standby' }, 'mistake');
  mechanism('radio', { type: 'radio.transmit' }, 'mistake');
  mechanism('radio', { type: 'radio.select', rear: 'main' });
  earned(state, 'launch_guided', mechanism('radio', { type: 'radio.transmit' }).event,
    'launch_guided');
  const hatch = (action, status = null) => choose(state, 'hatch', getHatchPanel(state.hatch, {
    foundIds: state.found, milestones: mechanismMilestones(state.mechanisms),
  }), (prior, selected) => applyHatchAction(prior, selected, {
    foundIds: state.found, milestones: mechanismMilestones(state.mechanisms),
  }), action, status);
  hatch({ type: 'hatch.confirmResponse' });
  hatch({ type: 'hatch.checkSill' }, 'blocked');
  state.mechanisms = tickMechanisms(state.mechanisms, TUNNEL_DRAIN_SECONDS).state;
  for (const type of ['hatch.checkSill', 'hatch.equalize', 'hatch.clearIris',
    'hatch.clearJam', 'hatch.releaseBolt']) hatch({ type });
  earned(state, 'iris_rescued', hatch({ type: 'hatch.openGate' }).event, 'iris_rescued');
  assert.equal(campaignAdvanceStatus(state).reason, 'iris_aftercare');
  const aftercare = () => getRescueAftermathPanel(state.rescueAftermath, { foundIds: state.found });
  const doAftercare = (action, status = null) => choose(state, 'rescueAftermath', aftercare(),
    (prior, selected) => applyRescueAftermathAction(prior, selected,
      { foundIds: state.found }), action, status);
  doAftercare({ type: 'aftercare.medical', answer: 'interview_now' }, 'mistake');
  doAftercare({ type: 'aftercare.medical', answer: 'medical_first' });
  doAftercare({ type: 'aftercare.case', answer: 'keep_with_iris' });
  doAftercare({ type: 'aftercare.account', answer: 'firsthand_only' });
  doAftercare({ type: 'aftercare.rest', answer: 'defer_statement' });
  assert.equal(campaignAdvanceStatus(state).reason, 'deduction');
  deduce(state, 'responsibility');
  advance(state, 5);
}

function playDaybreak(state) {
  assert.equal(state.chapter, 5);
  const iris = { type: 'choice.iris.ask' };
  const handoff = choose(state, 'choices', getChoiceRoutePanel(state.choices,
    'iris', context(state)), (prior, action) => applyChoiceRouteAction(prior, action,
    context(state)), iris);
  earned(state, 'iris_handoff', handoff.event, 'iris_custody_decided');
  const routing = () => getRadioRoutingPanel(state.routing, state.found);
  for (const action of [{ type: 'routing.isolateLoop' },
    { type: 'routing.patch', socket: 'mainland_control' },
    { type: 'routing.verify', reply: 'independent_dispatcher' }]) {
    choose(state, 'routing', routing(),
      (prior, selected) => applyRadioRoutingAction(prior, selected, state.found), action);
  }
  assert.equal(radioRoutingMilestones(state.routing).mainlandConnected, true);
  const fullPacket = choose(state, 'choices', getChoiceRoutePanel(state.choices,
    'packet', context(state)), (prior, action) => applyChoiceRouteAction(prior, action,
    context(state)), { type: 'choice.packet.complete' });
  assert.equal(fullPacket.event, 'mainland_initial_packet_sent');
  // Runtime applies this Iris NPC event when the verified receipt follows her
  // prior independent-custody decision; Mara never gets a release button.
  const release = applyChoiceRouteAction(state.choices,
    { type: 'choice.iris.release_after_receipt', actor: 'iris' }, context(state));
  assert.equal(release.event, 'iris_originals_released');
  state.choices = release.state;
  const report = () => getDaybreakReportPanel(state.daybreakReport,
    state.found, state.deductions.solvedIds);
  const doReport = (action, status = null) => choose(state, 'daybreakReport', report(),
    (prior, selected) => applyDaybreakReportAction(prior, selected, state.found,
      state.deductions.solvedIds), action, status);
  doReport({ type: 'daybreak.lamps', answer: 'captain_chose_reef' }, 'mistake');
  doReport({ type: 'daybreak.lamps', answer: 'both_circuits_active' });
  doReport({ type: 'daybreak.mara', answer: 'removed_uncertainty' });
  doReport({ type: 'daybreak.elias', answer: 'actions_without_invented_motive' });
  earned(state, 'daybreak_report', doReport({ type: 'daybreak.submit' }).event,
    'daybreak_report_submitted');
  assert.equal(campaignAdvanceStatus(state).reason, 'jetty_return');
  const jetty = (station, action, status = null) => choose(state, 'jettyReturn',
    getJettyReturnPanel(state.jettyReturn, station, jettyContext(state)),
    (prior, selected) => applyJettyReturnAction(prior, selected,
      jettyContext(state)), action, status);
  jetty('berth', { type: 'jetty.berth', answer: 'safe_berth_documented' });
  jetty('case', { type: 'jetty.case', answer: 'family_copy_inventory' });
  jetty('family', { type: 'jetty.opening', answer: 'invite_questions' });
  jetty('family', { type: 'jetty.proof', answer: 'photos_prove_deck' }, 'mistake');
  jetty('family', { type: 'jetty.proof', answer: 'mechanism_and_limits' });
  jetty('family', { type: 'jetty.cost', answer: 'no_closure_owed' });
  assert.equal(jetty('receipt', { type: 'jetty.handoff',
    answer: 'iris_direct_family_copy' }).event, 'jetty_return_completed');
  advance(state, null);
  assert.equal(state.ended, true);
  assert.equal(campaignAdvanceStatus(state).reason, 'ended');
}

function playInquiry(state) {
  assert.equal(state.ended, true);
  const panel = () => getInquiryPanel(state.inquiry, inquiryContext(state));
  const doInquiry = (action, expectedStatus = null) => choose(state, 'inquiry', panel(),
    (prior, selected) => applyInquiryAction(prior, selected, inquiryContext(state)),
    action, expectedStatus);
  doInquiry({ type: 'inquiry.provenance', answer: 'relay_proves_motive' }, 'mistake');
  doInquiry({ type: 'inquiry.provenance', answer: 'relay_versus_export' });
  doInquiry({ type: 'inquiry.bearings', answer: 'two_surveyed_lines' });
  assert.equal(doInquiry({ type: 'inquiry.request_disclosure' }, 'handoff').event,
    'inquiry_disclosure_requested');
  choose(state, 'choices', getChoiceRoutePanel(state.choices, 'disclosure', context(state)),
    (prior, action) => applyChoiceRouteAction(prior, action, context(state)),
    { type: 'choice.disclosure.volunteer' });
  doInquiry({ type: 'inquiry.family', answer: 'removed_qualification' });
  doInquiry({ type: 'inquiry.elias', answer: 'actions_not_intent' });
  doInquiry({ type: 'inquiry.iris', answer: 'iris_directs_custody' });
  doInquiry({ type: 'inquiry.closing', answer: 'forgive_and_close' }, 'mistake');
  const amended = doInquiry({ type: 'inquiry.closing', answer: 'family_copy_first' });
  assert.equal(amended.event, 'inquiry_completed');
  assert.equal(inquiryMilestones(state.inquiry).complete, true);
  assert.match(amended.summaryText, /sole error to the captain/);
}

const playChapter = [playArrival, playReport, playLights, playVoice, playRescue, playDaybreak];

test('a fresh main campaign reaches the ending through the offered actions and survives every chapter save', () => {
  let state = hydrate(createChapterStart(0));
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) {
    assert.equal(state.chapter, chapter);
    state = resume(state);
    playChapter[chapter](state);
    state = resume(state);
  }
  playInquiry(state);
  state = resume(state);
  assert.equal(inquiryMilestones(state.inquiry).complete, true);
  assert.equal(state.ended, true);
  assert.equal(state.chapter, 5);
  assert.ok(CHAPTERS.flatMap((chapter) => chapter.required).every((id) => state.found.has(id)));
});

test('each independent chapter slot can earn its next transition or final ending', () => {
  for (let chapter = 0; chapter < CHAPTERS.length; chapter++) {
    let state = hydrate(createChapterStart(chapter));
    assert.equal(campaignAdvanceStatus(state).reason, 'required_clues');
    playChapter[chapter](state);
    if (chapter === CHAPTERS.length - 1) playInquiry(state);
    state = resume(state);
    assert.equal(state.ended, chapter === CHAPTERS.length - 1,
      `Chapter ${chapter + 1} did not retain its transition`);
    assert.equal(state.chapter, Math.min(chapter + 1, CHAPTERS.length - 1));
  }
});
