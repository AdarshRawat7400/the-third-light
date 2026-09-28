import { radioRoutingMilestones } from './radioRouting.js';
import { SITES } from './story.js';

// A small, saveable performance at the radio-house worktable. The radio
// mechanism establishes the route and choiceRoutes owns Mara's approach to
// Elias; this scene lets the player set his words beside the actual records.
export const WITNESS_CONFRONTATION_VERSION = 1;
export const WITNESS_RADIO_SITE = Object.freeze({ ...SITES.find((site) => site.id === 'radio') });
export const WITNESS_STATION = Object.freeze({
  id: 'witness_table', name: 'Elias’s worktable', x: -1.8, z: 0.1,
});

export const WITNESS_CONFRONTATION_EVIDENCE = Object.freeze([
  'radio_switchboard', 'island_loop_ledger', 'radio_patch',
  'official_log', 'pump_service_order', 'lamp_strip',
]);

const ROUTES = new Set(['ask_account', 'show_records', 'public_radio']);
const FLAGS = Object.freeze([
  'voiceCompared', 'orderCompared', 'relayCompared', 'accountTaken',
  'accountTested', 'findingRecorded', 'irisChecklistPlayed', 'unsentCallReviewed',
]);
const EVIDENCE_NAMES = Object.freeze({
  radio_switchboard: 'switchboard ledger',
  island_loop_ledger: 'island-loop ledger',
  radio_patch: 'disconnected mainland patch',
  official_log: 'typed lamp export',
  pump_service_order: 'wreck-night service order',
  lamp_strip: 'original relay strip',
  radio_iris_recording: 'Iris’s recorded checklist',
  radio_unsent_call: 'unsent distress form',
});

function contextOf(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const ids = source.foundIds instanceof Set ? source.foundIds
    : new Set(Array.isArray(source.foundIds) ? source.foundIds : []);
  const choices = source.choiceRoutes && typeof source.choiceRoutes === 'object'
    ? source.choiceRoutes : {};
  const route = ROUTES.has(choices.eliasRoute) ? choices.eliasRoute : null;
  return {
    found: ids,
    route,
    choices,
    voiceTraced: radioRoutingMilestones(source.radioRouting).voiceTraced,
    atRadioHouse: source.atRadioHouse === true,
    chapter: Number.isInteger(source.chapter) ? source.chapter : 3,
  };
}

const has = (found, ...ids) => ids.every((id) => found.has(id));
const absent = (found, ids) => ids.filter((id) => !found.has(id));
const names = (ids) => ids.map((id) => EVIDENCE_NAMES[id] || id).join(' and ');

export function createWitnessConfrontationState() {
  return {
    version: WITNESS_CONFRONTATION_VERSION,
    voiceCompared: false,
    orderCompared: false,
    relayCompared: false,
    accountTaken: false,
    accountTested: false,
    findingRecorded: false,
    irisChecklistPlayed: false,
    unsentCallReviewed: false,
  };
}

export function serializeWitnessConfrontationState(raw) {
  const state = createWitnessConfrontationState();
  if (!raw || typeof raw !== 'object' || raw.version !== WITNESS_CONFRONTATION_VERSION) return state;
  for (const flag of FLAGS) state[flag] = raw[flag] === true;
  return state;
}

// Each saved beat is retained only while its real source remains in the case
// file. Losing a prerequisite clears dependent beats, never the whole save.
export function restoreWitnessConfrontationState(raw, context = {}) {
  const source = serializeWitnessConfrontationState(raw);
  const state = createWitnessConfrontationState();
  const { found, route, voiceTraced, chapter } = contextOf(context);
  if (chapter < 3 || !route || !voiceTraced) return state;
  state.voiceCompared = source.voiceCompared && has(found,
    'radio_switchboard', 'island_loop_ledger', 'radio_patch');
  state.orderCompared = source.orderCompared && has(found, 'official_log', 'pump_service_order');
  state.relayCompared = source.relayCompared && has(found, 'official_log', 'lamp_strip');
  state.accountTaken = source.accountTaken && state.voiceCompared;
  state.accountTested = source.accountTested && state.voiceCompared
    && state.orderCompared && state.relayCompared && state.accountTaken;
  state.findingRecorded = source.findingRecorded && state.accountTested;
  state.irisChecklistPlayed = source.irisChecklistPlayed && found.has('radio_iris_recording');
  state.unsentCallReviewed = source.unsentCallReviewed && found.has('radio_unsent_call');
  return state;
}

export function witnessConfrontationMilestones(raw, context = {}) {
  const state = restoreWitnessConfrontationState(raw, context);
  return {
    voiceCompared: state.voiceCompared,
    recordsCompared: state.orderCompared && state.relayCompared,
    accountTested: state.accountTested,
    sceneComplete: state.findingRecorded,
  };
}

/** One grounded E-key station, separate from clue collection and daybreak. */
export function nearestWitnessConfrontationStation(x, z, insideId, raw, context = {}, radius = 1.3) {
  const { chapter } = contextOf(context);
  if (insideId !== 'radio' || chapter < 3 || !Number.isFinite(x) || !Number.isFinite(z)
    || !Number.isFinite(radius) || radius <= 0) return null;
  const sx = WITNESS_RADIO_SITE.x + WITNESS_STATION.x;
  const sz = WITNESS_RADIO_SITE.z + WITNESS_STATION.z;
  const distance = Math.hypot(x - sx, z - sz);
  if (distance > radius) return null;
  const complete = witnessConfrontationMilestones(raw, context).sceneComplete;
  return {
    ...WITNESS_STATION, x: sx, z: sz, distance, complete,
    prompt: `${complete ? 'Review' : 'Inspect'} Elias’s worktable`,
  };
}

function result(state, status, message, event = null, choiceAction = null) {
  return { state, status, message, event, choiceAction };
}

function blockedForEvidence(state, found, ids) {
  const need = absent(found, ids);
  return need.length ? result(state, 'blocked', `Bring ${names(need)} to the radio-house table first.`) : null;
}

const ACCOUNT_LINES = Object.freeze({
  ask_account: 'In private, Elias says the main feed was failing and he feared closing the inlet would cut off work and supplies. Mara records this as his explanation, not a proven motive.',
  show_records: 'Elias looks at the service order before speaking: he feared a dark rear light and chose the standby circuit. He will answer for his switch and typed line; his fear remains his account.',
  public_radio: 'After withdrawing from the open channel, Elias answers briefly beside the silent microphone. He says he feared a blackout and the island’s closure. He will not sign the account Mara broadcast; his words remain testimony.',
});

export function applyWitnessConfrontationAction(previous, action, context = {}) {
  const facts = contextOf(context);
  const { found, route, choices, voiceTraced, atRadioHouse, chapter } = facts;
  const state = restoreWitnessConfrontationState(previous, context);
  if (chapter < 3) return result(state, 'blocked', 'The radio-house testimony belongs to the later inquiry.');
  if (!atRadioHouse) return result(state, 'blocked', 'Return to the radio-house worktable to handle the originals with Elias present.');
  if (!voiceTraced) return result(state, 'blocked', 'Trace the local loop, inspect the unplugged shore lead, and locate the microphone first.');
  if (!route) return result(state, 'blocked', 'Choose how Mara first approaches Elias before testing his account against the records.');

  const type = action?.type;
  if (type === 'witness.compareVoice') {
    if (state.voiceCompared) return result(state, 'unchanged', 'The voice has already been compared with the local route.');
    const blocked = blockedForEvidence(state, found, WITNESS_CONFRONTATION_EVIDENCE.slice(0, 3));
    if (blocked) return blocked;
    return result({ ...state, voiceCompared: true }, 'changed',
      'Mara lays the switchboard and transmission ledger under the desk glass, then lifts the loose shore plug. Every claimed mainland call ran through the local microphone. Elias says he spoke them; the physical route stands apart from his admission.',
      'witness_voice_compared');
  }
  if (type === 'witness.compareOrder') {
    if (state.orderCompared) return result(state, 'unchanged', 'The 21:10 service order has already been set beside the typed export.');
    const blocked = blockedForEvidence(state, found, ['official_log', 'pump_service_order']);
    if (blocked) return blocked;
    return result({ ...state, orderCompared: true }, 'changed',
      'Under the lamp, E. Ward’s 21:10 order authorizes manual standby after an unstable main feed. The typed export later says standby disabled. The order identifies who authorized the switch; it records no harbor warning, but cannot rule out every possible call.',
      'witness_order_compared');
  }
  if (type === 'witness.compareRelay') {
    if (state.relayCompared) return result(state, 'unchanged', 'The punched minute and typed line have already been compared.');
    const blocked = blockedForEvidence(state, found, ['official_log', 'lamp_strip']);
    if (blocked) return blocked;
    const stamp = found.has('archive_revision_stamp')
      ? ' The archive stamp places the later reprint through Elias’s account.' : '';
    return result({ ...state, relayCompared: true }, 'changed',
      `Mara holds Iris’s original strip over the typed export. At 21:14 the relay punched both rear circuits active; the export calls standby disabled. The machine marks establish lamp state, not who made the later typed claim.${stamp}`,
      'witness_relay_compared');
  }
  if (type === 'witness.hearAccount') {
    if (state.accountTaken) return result(state, 'unchanged', 'Elias’s account has already been noted as testimony.');
    if (!state.voiceCompared) return result(state, 'blocked', 'Place the local call records first so Elias cannot be treated as mainland control.');
    return result({ ...state, accountTaken: true }, 'changed', ACCOUNT_LINES[route], 'witness_account_heard');
  }
  if (type === 'witness.testAccount') {
    if (state.accountTested) return result(state, 'unchanged', 'His account has already been placed beside the order and original strip.');
    if (!state.accountTaken) return result(state, 'blocked', 'Hear Elias’s account before asking what the records can test.');
    if (!state.orderCompared || !state.relayCompared) return result(state, 'blocked',
      'Compare both the service order and original relay strip with the typed export before putting them to Elias.');
    const message = route === 'public_radio'
      ? 'Mara puts the 21:10 order and 21:14 strip across the table. Elias acknowledges the standby action and changed typed line, but refuses a signed statement after the public exchange. The records do not depend on his signature.'
      : 'Mara puts the 21:10 order and 21:14 strip across the table. Elias acknowledges the standby action and changed typed line. He will sign only these limited actions; his account of fear is still testimony.';
    const choiceAction = choices.eliasRecordsShown ? null : { type: 'choice.elias.followup_records' };
    return result({ ...state, accountTested: true }, 'changed', message,
      'witness_account_tested', choiceAction);
  }
  if (type === 'witness.recordFinding') {
    if (state.findingRecorded) return result(state, 'unchanged', 'The bounded account is already in Mara’s notes.');
    if (!state.accountTested) return result(state, 'blocked', 'Set Elias’s account beside all three classes of physical record first.');
    const claim = action?.claim;
    if (!['bounded', 'intent_proven', 'captain_fault'].includes(claim)) {
      return result(state, 'blocked', 'Choose a conclusion supported by the records on the table.');
    }
    if (claim === 'intent_proven') return result(state, 'mistake',
      'The strip proves the circuits ran; the order records Elias’s authorization. Neither proves he intended a grounding or Iris’s death.');
    if (claim === 'captain_fault') return result(state, 'mistake',
      'The original strip contradicts the typed export. The captain’s reported third light cannot be dismissed by the altered line.');
    return result({ ...state, findingRecorded: true }, 'complete',
      'Mara writes the narrow finding: a local voice misrepresented shore control; Elias authorized standby and changed the typed line; the original relay marked both rear circuits active. His stated fear explains his claim, but does not excuse or prove intent. Iris still needs the pump and a safe launch bearing.',
      'witness_account_compared');
  }
  if (type === 'witness.playIrisChecklist') {
    if (state.irisChecklistPlayed) return result(state, 'unchanged', 'Iris’s checklist has already been played at the table.');
    const blocked = blockedForEvidence(state, found, ['radio_iris_recording']);
    if (blocked) return blocked;
    return result({ ...state, irisChecklistPlayed: true }, 'changed',
      'Iris’s recorded checklist names both survey stakes, a copy of the relay strip, and the pump’s shared bus. Her planning is firsthand evidence of her route, not a substitute for the strip itself.',
      'witness_iris_checklist_played');
  }
  if (type === 'witness.reviewUnsentCall') {
    if (state.unsentCallReviewed) return result(state, 'unchanged', 'The unsent request has already been reviewed.');
    const blocked = blockedForEvidence(state, found, ['radio_unsent_call']);
    if (blocked) return blocked;
    return result({ ...state, unsentCallReviewed: true }, 'changed',
      'The unsigned form requests a launch for a technician locked behind the gate. Elias knew the danger and left the call unsent. It records a second delay, not a prediction of what he hoped would happen.',
      'witness_unsent_call_reviewed');
  }
  return result(state, 'blocked', 'Use a record or conversation available at the radio-house table.');
}

function beat(id, title, source, done, available, missingEvidenceIds = []) {
  return { id, title, source, done, available, missingEvidenceIds };
}

export function getWitnessConfrontationPanel(previous, context = {}) {
  const { found, route, choices, voiceTraced, atRadioHouse, chapter } = contextOf(context);
  const state = restoreWitnessConfrontationState(previous, context);
  const panel = (title, text, actions = [], beats = [], missingEvidenceIds = []) => ({
    title, text, actions, beats, missingEvidenceIds,
    sceneComplete: state.findingRecorded,
    route,
  });
  if (chapter < 3) return panel('The voice on the channel', 'The radio-house witness scene begins in Chapter 4.');
  if (!atRadioHouse) return panel('The radio-house table', 'Return to the radio house to compare these physical records with Elias present.');
  if (!voiceTraced) return panel('First trace the voice', 'Compare the two radio ledgers and the unplugged patch at the switchboard. Establish the local microphone before confronting Elias.');
  if (!route) return panel('Choose the approach', 'Mara must decide whether to ask Elias privately, show the records, or name the island voice on the open channel. The conversation remains available while she gathers more evidence.');

  const needVoice = absent(found, WITNESS_CONFRONTATION_EVIDENCE.slice(0, 3));
  const needOrder = absent(found, ['official_log', 'pump_service_order']);
  const needRelay = absent(found, ['official_log', 'lamp_strip']);
  const beats = [
    beat('voice', 'Trace the apparent mainland voice', 'SWITCHBOARD · LOOP LEDGER · PATCH', state.voiceCompared, !needVoice.length, needVoice),
    beat('order', 'Read the authorization against the export', 'SERVICE ORDER · TYPED EXPORT', state.orderCompared, !needOrder.length, needOrder),
    beat('relay', 'Check the punched minute against the export', 'ORIGINAL RELAY · TYPED EXPORT', state.relayCompared, !needRelay.length, needRelay),
    beat('account', 'Hear Elias’s reason in his own words', 'PERSONAL ACCOUNT', state.accountTaken, state.voiceCompared),
    beat('test', 'Put the records to Elias', 'PHYSICAL RECORDS · PERSONAL ACCOUNT', state.accountTested,
      state.accountTaken && state.orderCompared && state.relayCompared),
  ];
  const actions = [];
  if (!state.voiceCompared && !needVoice.length) actions.push({ label: 'LAY OUT THE RADIO ROUTE', action: { type: 'witness.compareVoice' } });
  if (!state.orderCompared && !needOrder.length) actions.push({ label: 'SET THE SERVICE ORDER BESIDE THE EXPORT', action: { type: 'witness.compareOrder' } });
  if (!state.relayCompared && !needRelay.length) actions.push({ label: 'OVERLAY THE RELAY STRIP', action: { type: 'witness.compareRelay' } });
  if (state.voiceCompared && !state.accountTaken) actions.push({ label: route === 'public_radio'
    ? 'ASK ELIAS IN PERSON AFTER THE BROADCAST' : 'HEAR ELIAS’S ACCOUNT', action: { type: 'witness.hearAccount' } });
  if (state.accountTaken && state.orderCompared && state.relayCompared && !state.accountTested) {
    actions.push({ label: 'PUT THE RECORDS TO ELIAS', action: { type: 'witness.testAccount' } });
  }
  if (state.accountTested && !state.findingRecorded) actions.push(
    { label: 'RECORD ONLY WHAT THE SOURCES ESTABLISH', action: { type: 'witness.recordFinding', claim: 'bounded' } },
    { label: 'CLAIM THE RECORD PROVES HIS INTENT', action: { type: 'witness.recordFinding', claim: 'intent_proven' } },
    { label: 'KEEP THE ORIGINAL CAPTAIN-FAULT FINDING', action: { type: 'witness.recordFinding', claim: 'captain_fault' } },
  );
  if (found.has('radio_iris_recording') && !state.irisChecklistPlayed) actions.push({
    label: 'PLAY IRIS’S RECORDED CHECKLIST', action: { type: 'witness.playIrisChecklist' },
  });
  if (found.has('radio_unsent_call') && !state.unsentCallReviewed) actions.push({
    label: 'READ THE UNSENT DISTRESS FORM', action: { type: 'witness.reviewUnsentCall' },
  });
  const missingEvidenceIds = [...new Set([
    ...(state.orderCompared ? [] : needOrder),
    ...(state.relayCompared ? [] : needRelay),
  ])];
  const approach = route === 'public_radio'
    ? 'The public identification has made Elias unwilling to sign; the physical records remain usable.'
    : route === 'show_records'
      ? 'Mara chose to show records first. His response can now be tested at the table.'
      : 'Mara asked privately. Her notes must keep his explanation separate from what the machines recorded.';
  const alert = choices.initialPacket === 'early'
    ? ' Elias heard the early mainland alert; the launch can still hold offshore while Mara checks the bearing.' : '';
  const text = state.findingRecorded
    ? 'The bounded account is in Mara’s notes. Elias’s signed response depends on how she approached him; the rescue and the required correction remain ahead.'
    : `Rain taps the radio-house window as Mara moves each source under the desk lamp. ${approach}${alert}`;
  return panel(state.findingRecorded ? 'An account with limits' : 'Elias at the worktable',
    text, actions, beats, missingEvidenceIds);
}
