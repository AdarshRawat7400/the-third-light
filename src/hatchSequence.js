// The service hatch is a physical release sequence, not a second countdown.
// The pump and launch milestones come from mechanisms.js; this module owns only
// the steps taken at the hatch and stays independent of DOM, audio and saves.

export const HATCH_VERSION = 1;

const fields = [
  'responseConfirmed', 'waterBelowSill', 'pressureEqualized',
  'irisClear', 'jamCleared', 'boltReleased', 'gateOpened',
];

function foundSet(foundIds) {
  if (foundIds instanceof Set) return foundIds;
  return new Set(Array.isArray(foundIds) ? foundIds : []);
}

function contextParts(context = {}) {
  return {
    found: foundSet(context.foundIds),
    milestones: context.milestones ?? {},
  };
}

export function createHatchState() {
  return {
    version: HATCH_VERSION,
    responseConfirmed: false,
    waterBelowSill: false,
    pressureEqualized: false,
    irisClear: false,
    jamCleared: false,
    boltReleased: false,
    gateOpened: false,
  };
}

/** Malformed or out-of-order saved flags cannot skip the physical sequence. */
export function restoreHatchState(raw, foundIds = []) {
  const state = createHatchState();
  const rescued = foundSet(foundIds).has('iris_rescued');
  if (rescued) {
    for (const field of fields) state[field] = true;
    return state;
  }
  if (!raw || typeof raw !== 'object' || raw.version !== HATCH_VERSION) return state;
  let previous = true;
  for (const field of fields) {
    state[field] = previous && raw[field] === true;
    previous = state[field];
  }
  // The gate action is saved just before the runtime records iris_rescued.
  // A reload in that gap must be able to trigger the rescue again.
  state.gateOpened = false;
  return state;
}

function result(state, status, message, event = null, field = null) {
  return {
    state: field ? { ...state, [field]: true } : state,
    status,
    message,
    event,
  };
}

/**
 * @param {object} previous serializable hatch state
 * @param {{type:string}} action button action from getHatchPanel
 * @param {{foundIds:Set<string>|string[],milestones:object}} context
 *   Pass state.found and mechanismMilestones(state.mechanisms). No step changes
 *   the mechanism state. Wrong actions leave the hatch state recoverable.
 */
export function applyHatchAction(previous, action, context = {}) {
  const state = restoreHatchState(previous, context.foundIds);
  const { found, milestones } = contextParts(context);
  if (state.gateOpened) return result(state, 'unchanged', 'Iris is out. The service gate stands open.');

  switch (action?.type) {
    case 'hatch.confirmResponse':
      if (state.responseConfirmed) return result(state, 'unchanged', 'Iris has answered with the same two taps, pause, one tap.');
      if (!found.has('tunnel_signal')) return result(state, 'blocked', 'Listen at the hatch and record Iris’s signal before giving instructions through the gate.');
      return result(state, 'changed', 'Two taps, a pause, then one. Iris answers the agreed pattern and says she can hear you.', 'iris_response_confirmed', 'responseConfirmed');

    case 'hatch.checkSill':
      if (!state.responseConfirmed) return result(state, 'blocked', 'Confirm Iris is responding before working the service gate.');
      if (state.waterBelowSill) return result(state, 'unchanged', 'The sight glass still reads below the gate sill.');
      if (!milestones.tunnelDrained) return result(state, 'blocked', 'Water still covers the sill. Keep the pump running and check the sight glass again when it falls.');
      return result(state, 'changed', 'The sight glass is clear below the sill, and Iris reports that the dry shelf is above the water.', 'sill_confirmed', 'waterBelowSill');

    case 'hatch.equalize':
      if (!state.waterBelowSill) return result(state, 'blocked', 'Do not open the small bleed while water still bears against the gate. Check the sill first.');
      if (!milestones.powerRestored || !milestones.tunnelDrained) return result(state, 'blocked', 'The drain must stay live with water below the sill before the gate can be vented.');
      if (state.pressureEqualized) return result(state, 'unchanged', 'The bleed is open and the gate pressure has equalized.');
      return result(state, 'changed', 'You crack the bleed valve. Air hisses, then stops; the pressure gauge settles to zero.', 'pressure_equalized', 'pressureEqualized');

    case 'hatch.clearIris':
      if (!state.pressureEqualized) return result(state, 'blocked', 'Vent the trapped pressure before asking Iris to move beside the gate.');
      if (state.irisClear) return result(state, 'unchanged', 'Iris is waiting on the dry shelf, clear of the gate swing.');
      return result(state, 'changed', 'You ask Iris to step onto the marked dry shelf and give two taps when clear. She does.', 'iris_clear_of_gate', 'irisClear');

    case 'hatch.clearJam':
      if (!state.irisClear) return result(state, 'blocked', 'Ask Iris to stand clear before working the seized keeper pin.');
      if (state.jamCleared) return result(state, 'unchanged', 'The keeper pin is free in its track.');
      return result(state, 'changed', 'You seat the service bar in the keeper notch and ease the rusted pin back along its track.', 'keeper_freed', 'jamCleared');

    case 'hatch.releaseBolt':
      if (!state.jamCleared) return result(state, 'blocked', 'The keeper pin still holds the outer bolt. Free it before turning the release wheel.');
      if (state.boltReleased) return result(state, 'unchanged', 'The outer bolt is retracted.');
      return result(state, 'changed', 'The wheel turns without strain. The outer bolt retracts and the gate settles on its hinges.', 'outer_bolt_released', 'boltReleased');

    case 'hatch.openGate':
      if (!state.boltReleased) return result(state, 'blocked', 'The outer bolt is still engaged; release it before moving the gate.');
      if (!milestones.powerRestored || !milestones.tunnelDrained) return result(state, 'blocked', 'The pump must keep the sill dry while Iris crosses the opening.');
      if (!milestones.launchGuided) return result(state, 'blocked', 'The launch has no confirmed safe approach. Keep Iris on the dry shelf until the pilot takes the true inlet line.');
      return result(state, 'complete', 'You pull the gate toward you. Iris crosses the dry sill into the rain; the launch is approaching along the confirmed main light pair.', 'iris_rescued', 'gateOpened');

    case 'hatch.forceGate':
      return result(state, 'mistake', !state.waterBelowSill
        ? 'The wheel loads against flooded water. Forcing it could drive the gate inward; let the pump lower the sill first.'
        : !state.pressureEqualized
          ? 'The gate holds under trapped pressure. Use the bleed valve before trying the wheel.'
          : !state.boltReleased
            ? 'The wheel will not turn against the keeper. Free its pin and retract the bolt.'
            : 'The gate is ready; use the controlled opening once the launch has the safe approach.', 'gate_resists');

    default:
      return result(state, 'blocked', 'That control is not part of the service hatch.');
  }
}

export function hatchMilestones(previous, foundIds = []) {
  const state = restoreHatchState(previous, foundIds);
  return {
    irisResponding: state.responseConfirmed,
    sillConfirmedDry: state.waterBelowSill,
    pressureEqualized: state.pressureEqualized,
    boltReleased: state.boltReleased,
    irisRescued: state.gateOpened,
  };
}

/** Small serializable view model for the game's existing action-button modal. */
export function getHatchPanel(previous, context = {}) {
  const state = restoreHatchState(previous, context.foundIds);
  const { found, milestones } = contextParts(context);
  const button = (label, type) => ({ label, action: { type } });
  const force = button('TRY THE OUTER WHEEL', 'hatch.forceGate');
  const note = found.has('pump_iris_route')
    ? 'Iris’s sketch says: pump first, launch on the true line, gate second. '
    : '';

  if (state.gateOpened) return { title: 'Service gate open', text: 'Iris is clear of the tunnel. The launch has the safe inlet line.', actions: [] };
  if (!found.has('tunnel_signal')) return {
    title: 'A reply beyond the gate',
    text: `${note}Listen at the hatch and record Iris’s tapping before using the release controls.`,
    actions: [],
  };
  if (!state.responseConfirmed) return {
    title: 'Iris at the service gate',
    text: `${note}Answer her two taps, pause, one tap. Establish that she can hear each instruction.`,
    actions: [button('ANSWER THE TAP PATTERN', 'hatch.confirmResponse'), force],
  };
  if (!state.waterBelowSill) return {
    title: 'Check the water at the sill',
    text: milestones.tunnelDrained
      ? 'The pump has lowered the tunnel. Read the hatch sight glass and confirm the dry shelf with Iris.'
      : 'The pump is still draining the tunnel. Water above the sill holds the gate shut; keep Iris on the dry shelf.',
    actions: [button('CHECK SIGHT GLASS', 'hatch.checkSill'), force],
  };
  if (!state.pressureEqualized) return {
    title: 'Vent the trapped pressure',
    text: 'The sill is dry, but the gate still carries trapped air pressure. Crack the small bleed valve and watch the gauge.',
    actions: [button('OPEN BLEED VALVE', 'hatch.equalize'), force],
  };
  if (!state.irisClear) return {
    title: 'Clear the gate swing',
    text: 'Ask Iris to stand on the marked dry shelf and tap twice when she is clear of the heavy door.',
    actions: [button('ASK IRIS TO STAND CLEAR', 'hatch.clearIris')],
  };
  if (!state.jamCleared) return {
    title: 'Free the keeper pin',
    text: 'The outer wheel is locked by a rusted keeper pin. Use the service bar in its notch; Iris is clear of the gate.',
    actions: [button('EASE KEEPER PIN BACK', 'hatch.clearJam'), force],
  };
  if (!state.boltReleased) return {
    title: 'Retract the outer bolt',
    text: 'The pin is free. Turn the release wheel and let the heavy gate settle before pulling it open.',
    actions: [button('TURN RELEASE WHEEL', 'hatch.releaseBolt')],
  };
  return {
    title: 'Open the service gate',
    text: milestones.launchGuided
      ? 'Iris is clear, the sill is dry, and the launch has the true inlet line. Pull the gate toward you.'
      : 'Iris is waiting on the dry shelf. The launch must have a confirmed safe approach before she crosses the opening.',
    actions: [button('OPEN THE GATE', 'hatch.openGate')],
  };
}
