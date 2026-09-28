// Physical radio routing. The UI owns
// modal buttons, audio, and saves; this module owns only serializable rules.
// A local voice can be identified and the genuine mainland circuit restored
// in Chapter 4, while an early request for backup can still help Iris.

export const RADIO_ROUTING_VERSION = 1;

export const RADIO_ROUTING_EVIDENCE = Object.freeze([
  'radio_switchboard', 'radio_patch', 'island_loop_ledger',
]);

const NAMES = Object.freeze({
  radio_switchboard: 'the switchboard ledger',
  radio_patch: 'the unplugged mainland patch',
  island_loop_ledger: 'the island-loop transmission ledger',
});

const LOOP_CHOICES = Object.freeze([
  Object.freeze({ label: 'ISLAND LOOP · local microphone to repeater', feed: 'island_loop' }),
  Object.freeze({ label: 'MAINLAND TRUNK · shore control to repeater', feed: 'mainland_trunk' }),
  Object.freeze({ label: 'NO TRACEABLE FEED', feed: 'untraced' }),
]);
const CONTINUITY_CHOICES = Object.freeze([
  Object.freeze({ label: 'OPEN · the shore lead is unplugged', continuity: 'open' }),
  Object.freeze({ label: 'CLOSED · the shore lead carried the calls', continuity: 'closed' }),
]);
const SOURCE_CHOICES = Object.freeze([
  Object.freeze({ label: 'The local microphone beside the repeater', source: 'local_microphone' }),
  Object.freeze({ label: 'The mainland shore-control microphone', source: 'mainland_microphone' }),
]);
const SOCKET_CHOICES = Object.freeze([
  Object.freeze({ label: 'MAINLAND CONTROL · isolated shore socket', socket: 'mainland_control' }),
  Object.freeze({ label: 'ISLAND LOOP · the former local return', socket: 'island_loop' }),
]);
const REPLY_CHOICES = Object.freeze([
  Object.freeze({ label: 'A separate dispatcher answers the call', reply: 'independent_dispatcher' }),
  Object.freeze({ label: 'My own words return from the island repeater', reply: 'island_echo' }),
]);

function idSet(ids) {
  if (ids instanceof Set) return ids;
  if (Array.isArray(ids)) return new Set(ids);
  return new Set();
}

function missing(found, ids) {
  return ids.filter((id) => !found.has(id));
}

function listNames(ids) {
  return ids.map((id) => NAMES[id] || id).join(' and ');
}

function result(state, status, message, event = null) {
  return { state, status, message, event };
}

function actionChoices(choices, type, field) {
  return choices.map((choice) => ({
    label: choice.label,
    action: { type, [field]: choice[field] },
  }));
}

export function createRadioRoutingState() {
  return {
    version: RADIO_ROUTING_VERSION,
    loopFeed: null,
    mainlandContinuity: null,
    voiceSource: null,
    localLoopIsolated: false,
    patchSocket: null,
    mainlandVerified: false,
    migratedFromLegacy: false,
  };
}

/** Restore only a contiguous path backed by records still in the case file.
 * `legacyDaybreakConnected` migrates the former one-click reconnection, which
 * predates the added loop ledger. */
export function restoreRadioRoutingState(raw, foundIds = [], {
  legacyDaybreakConnected = false,
} = {}) {
  const state = createRadioRoutingState();
  const found = idSet(foundIds);
  const validRaw = raw && typeof raw === 'object'
    && (raw.version === undefined || raw.version === RADIO_ROUTING_VERSION);
  const legacyEligible = found.has('radio_patch') && found.has('iris_rescued')
    && (legacyDaybreakConnected === true || (validRaw && raw.migratedFromLegacy === true));
  if (legacyEligible) {
    // Existing players already seated the physical lead in the old Daybreak
    // scene. Preserve that outcome instead of forcing newly added evidence.
    Object.assign(state, {
      loopFeed: 'island_loop', mainlandContinuity: 'open', voiceSource: 'local_microphone',
      localLoopIsolated: true, patchSocket: 'mainland_control', mainlandVerified: true,
      migratedFromLegacy: true,
    });
    return state;
  }
  if (!raw || typeof raw !== 'object'
    || (raw.version !== undefined && raw.version !== RADIO_ROUTING_VERSION)) return state;
  if (missing(found, ['radio_switchboard', 'island_loop_ledger']).length
    || raw.loopFeed !== 'island_loop') return state;
  state.loopFeed = 'island_loop';

  if (!found.has('radio_patch') || raw.mainlandContinuity !== 'open') return state;
  state.mainlandContinuity = 'open';
  if (raw.voiceSource !== 'local_microphone') return state;
  state.voiceSource = 'local_microphone';

  // The local repeater can be isolated before rescue. The separate pump-house
  // launch set remains available, and the shore line can request backup.
  if (raw.localLoopIsolated !== true) return state;
  state.localLoopIsolated = true;
  if (raw.patchSocket !== 'mainland_control') return state;
  state.patchSocket = 'mainland_control';
  if (raw.mainlandVerified !== true) return state;
  state.mainlandVerified = true;

  return state;
}

export function radioRoutingMilestones(raw) {
  const state = raw && typeof raw === 'object' ? raw : createRadioRoutingState();
  const voiceTraced = state.loopFeed === 'island_loop'
    && state.mainlandContinuity === 'open'
    && state.voiceSource === 'local_microphone';
  const mainlandConnected = voiceTraced && state.localLoopIsolated === true
    && state.patchSocket === 'mainland_control' && state.mainlandVerified === true;
  return { voiceTraced, mainlandConnected };
}

/** Apply a button action; wrong readings never energize or connect a circuit. */
export function applyRadioRoutingAction(previous, action, foundIds = [], options = {}) {
  const found = idSet(foundIds);
  const state = restoreRadioRoutingState(previous, found, options);
  const type = action?.type;
  const next = (patch, status, message, event) =>
    result({ ...state, ...patch }, status, message, event);

  if (type === 'routing.traceLoop') {
    if (state.loopFeed) return result(state, 'unchanged', 'The transmission path is already marked as the island loop.');
    const need = missing(found, ['radio_switchboard', 'island_loop_ledger']);
    if (need.length) return result(state, 'blocked', `Read ${listNames(need)} before tracing the call entries.`);
    if (!LOOP_CHOICES.some((choice) => choice.feed === action.feed)) return result(state, 'blocked', 'Select a labeled feed on the switchboard.');
    if (action.feed !== 'island_loop') return result(state, 'mistake',
      'Match each claimed shore-control call to the loop ledger. The mainland column has no corresponding transmission.');
    return next({ loopFeed: 'island_loop' }, 'changed',
      'The claimed shore-control calls used the island loop. This identifies a route, not yet the speaker.', 'radio_loop_traced');
  }
  if (type === 'routing.checkMainland') {
    if (!state.loopFeed) return result(state, 'blocked', 'Trace the repeated call entries through the switchboard first.');
    if (state.mainlandContinuity) return result(state, 'unchanged', 'The shore lead is already recorded as open.');
    if (!found.has('radio_patch')) return result(state, 'blocked', 'Inspect the physical mainland patch and its free plug first.');
    if (!CONTINUITY_CHOICES.some((choice) => choice.continuity === action.continuity)) return result(state, 'blocked', 'Select an observed continuity state.');
    if (action.continuity !== 'open') return result(state, 'mistake',
      'The shore plug is lying beside the socket. It could not have carried the voice heard on the island set.');
    return next({ mainlandContinuity: 'open' }, 'changed',
      'The mainland lead is physically unplugged. The received calls came through the still-connected local loop.', 'mainland_lead_found_open');
  }
  if (type === 'routing.locateVoice') {
    if (!state.loopFeed || !state.mainlandContinuity) return result(state, 'blocked', 'Trace the loop and check the shore lead before locating the speaker.');
    if (state.voiceSource) return result(state, 'unchanged', 'The voice has already been placed at the island microphone.');
    if (!SOURCE_CHOICES.some((choice) => choice.source === action.source)) return result(state, 'blocked', 'Choose the microphone supported by the physical route.');
    if (action.source !== 'local_microphone') return result(state, 'mistake',
      'A shore microphone cannot reach this repeater through an unplugged patch. The island microphone remains on the logged loop.');
    return next({ voiceSource: 'local_microphone' }, 'changed',
      'The reassuring voice was transmitted from the island microphone. The route proves its location; Iris’s account and other records are needed to judge what the speaker concealed.', 'route_verified');
  }
  if (type === 'routing.isolateLoop') {
    if (!state.voiceSource) return result(state, 'blocked', 'Identify which circuit carried the false shore-control calls first.');
    if (state.localLoopIsolated) return result(state, 'unchanged', 'The local microphone is already isolated from the shore channel.');
    return next({ localLoopIsolated: true }, 'changed',
      'The local microphone feed is isolated. The separate pump-house launch set remains available while the shore line is restored.', 'radio_loop_isolated');
  }
  if (type === 'routing.patch') {
    if (!state.localLoopIsolated) return result(state, 'blocked', 'Isolate the local microphone before seating the shore lead.');
    if (state.patchSocket) return result(state, 'unchanged', 'The shore lead is already seated in the mainland-control socket.');
    if (!SOCKET_CHOICES.some((choice) => choice.socket === action.socket)) return result(state, 'blocked', 'Select a labeled socket.');
    if (action.socket !== 'mainland_control') return result(state, 'mistake',
      'That jack returns to the island repeater. The shore cable belongs in the separately labeled mainland-control socket.');
    return next({ patchSocket: 'mainland_control' }, 'changed',
      'The free shore lead is seated in the mainland-control socket. Wait for a separate return before trusting the route.', 'mainland_plug_seated');
  }
  if (type === 'routing.verify') {
    if (!state.patchSocket) return result(state, 'blocked', 'Seat the shore lead in the mainland-control socket first.');
    if (state.mainlandVerified) return result(state, 'unchanged', 'Mainland control has already answered over the separate line.');
    if (!REPLY_CHOICES.some((choice) => choice.reply === action.reply)) return result(state, 'blocked', 'Choose the return actually heard on the circuit.');
    if (action.reply !== 'independent_dispatcher') return result(state, 'mistake',
      'An echo is the island loop returning your own test phrase. The line is not verified until a separate dispatcher answers.');
    return next({ mainlandVerified: true }, 'complete',
      'A mainland dispatcher answers the call after the local feed is isolated. Mara can now request help or send the available evidence before the rescue.', 'mainland_patch_verified');
  }
  return result(state, 'blocked', 'That action is not part of the radio routing controls.');
}

/** A modal view model. It never offers a control whose prerequisite records or
 * physical state are missing, but applyRadioRoutingAction checks them again. */
export function getRadioRoutingPanel(previous, foundIds = [], options = {}) {
  const found = idSet(foundIds);
  const state = restoreRadioRoutingState(previous, found, options);
  const panel = (stage, title, text, actions = [], missingEvidenceIds = []) => ({
    stage, title, text, actions, missingEvidenceIds,
  });
  if (!state.loopFeed) {
    const need = missing(found, ['radio_switchboard', 'island_loop_ledger']);
    return panel('trace-loop', 'Trace the incoming calls', need.length
      ? `Read ${listNames(need)} to compare the switchboard entries with their transmission times.`
      : 'Every call claiming to be shore control has a switchboard line and a matching transmission entry. Which feed carried them?',
    need.length ? [] : actionChoices(LOOP_CHOICES, 'routing.traceLoop', 'feed'), need);
  }
  if (!state.mainlandContinuity) {
    const need = missing(found, ['radio_patch']);
    return panel('check-patch', 'Check the mainland lead', need.length
      ? `Inspect ${listNames(need)} before recording whether that circuit is continuous.`
      : 'The free plug lies beside the shore socket. Could that mainland lead have carried the calls you heard?',
    need.length ? [] : actionChoices(CONTINUITY_CHOICES, 'routing.checkMainland', 'continuity'), need);
  }
  if (!state.voiceSource) return panel('locate-voice', 'Locate the speaker',
    'The loop has entries for each call; the mainland lead was open. Which microphone could reach the repeater?',
    actionChoices(SOURCE_CHOICES, 'routing.locateVoice', 'source'));
  if (!state.localLoopIsolated) {
    return panel('isolate-loop', 'Secure the local station',
      'Isolate the local microphone from the channel marked shore control before reconnecting the genuine lead. The pump-house launch set is separate.',
      [{ label: 'ISOLATE LOCAL MICROPHONE FEED', action: { type: 'routing.isolateLoop' } }]);
  }
  if (!state.patchSocket) return panel('seat-plug', 'Seat the shore lead',
    'The island loop is isolated. The loose shore cable can now be seated in one of the labeled sockets.',
    actionChoices(SOCKET_CHOICES, 'routing.patch', 'socket'));
  if (!state.mainlandVerified) return panel('verify-return', 'Verify the return',
    'Call through the patched line. One return merely repeats your own test phrase; the other is an independent dispatcher answering from shore.',
    actionChoices(REPLY_CHOICES, 'routing.verify', 'reply'));
  return panel('complete', 'Mainland route verified',
    'Mainland control has answered over the separate line. The player can now decide when to send the evidence already gathered or request backup.');
}
