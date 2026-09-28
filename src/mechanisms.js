// Pure, serializable state for the three hands-on investigation puzzles.
// The game owns the UI, audio and persistence; this module owns the rules.

export const MECHANISM_VERSION = 1;
export const TUNNEL_DRAIN_SECONDS = 30;

const validRear = (rear) => rear === 'main' || rear === 'standby';
const has = (found, id) => found.has(id);
const finiteSeconds = (value) => Number.isFinite(value) ? Math.max(0, Math.min(TUNNEL_DRAIN_SECONDS, value)) : 0;

function foundSet(foundIds) {
  if (foundIds instanceof Set) return foundIds;
  return new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createMechanismState() {
  return {
    version: MECHANISM_VERSION,
    alignment: { westRear: null, eastRear: null, safeRear: null },
    power: {
      diagramRead: false,
      mainsIsolated: false,
      launchWarned: false,
      dischargeOpen: false,
      backupOn: false,
      pumpOn: false,
      drainSeconds: 0,
    },
    radio: { chartRead: false, heldOffshore: false, routeRear: null, confirmed: false },
  };
}

/**
 * Sanitize a saved state. Completed clue IDs from older saves migrate their
 * corresponding mechanisms, so an existing investigation never loses progress.
 */
export function restoreMechanismState(raw, foundIds = []) {
  const state = createMechanismState();
  const found = foundSet(foundIds);
  const aligned = has(found, 'alignment_solution') || has(found, 'pump_power')
    || has(found, 'launch_guided') || has(found, 'iris_rescued');
  const powered = has(found, 'pump_power') || has(found, 'launch_guided') || has(found, 'iris_rescued');
  const guided = has(found, 'launch_guided') || has(found, 'iris_rescued');

  if (raw && typeof raw === 'object') {
    const a = raw.alignment ?? {};
    state.alignment.westRear = a.westRear === 'main' ? 'main' : null;
    state.alignment.eastRear = a.eastRear === 'standby' ? 'standby' : null;
    state.alignment.safeRear = a.safeRear === 'main'
      && state.alignment.westRear === 'main' && state.alignment.eastRear === 'standby' ? 'main' : null;

    const p = raw.power ?? {};
    state.power.diagramRead = p.diagramRead === true;
    state.power.mainsIsolated = state.power.diagramRead && p.mainsIsolated === true;
    state.power.launchWarned = state.power.diagramRead && p.launchWarned === true;
    state.power.dischargeOpen = state.power.diagramRead && p.dischargeOpen === true;
    state.power.backupOn = state.power.mainsIsolated && state.power.launchWarned
      && state.power.dischargeOpen && p.backupOn === true;
    state.power.pumpOn = state.power.backupOn && p.pumpOn === true;
    state.power.drainSeconds = state.power.pumpOn ? finiteSeconds(p.drainSeconds) : 0;

    const r = raw.radio ?? {};
    state.radio.chartRead = r.chartRead === true;
    state.radio.heldOffshore = r.heldOffshore === true;
    state.radio.routeRear = state.radio.chartRead && state.radio.heldOffshore && validRear(r.routeRear)
      ? r.routeRear : null;
    state.radio.confirmed = state.radio.routeRear === 'main' && state.alignment.safeRear === 'main'
      && state.power.pumpOn && r.confirmed === true;
  }

  if (aligned) state.alignment = { westRear: 'main', eastRear: 'standby', safeRear: 'main' };
  if (powered) {
    state.power = {
      ...state.power,
      diagramRead: true,
      mainsIsolated: true,
      launchWarned: true,
      dischargeOpen: true,
      backupOn: true,
      pumpOn: true,
    };
  }
  if (guided) {
    state.radio = { chartRead: true, heldOffshore: true, routeRear: 'main', confirmed: true };
  }
  if (has(found, 'iris_rescued')) state.power.drainSeconds = TUNNEL_DRAIN_SECONDS;
  return state;
}

function unchanged(state, status, message, event = null) {
  return { state, status, message, event };
}

function changed(state, section, patch, message, event = null, status = 'changed') {
  return {
    state: { ...state, [section]: { ...state[section], ...patch } },
    status,
    message,
    event,
  };
}

/**
 * Apply one player action. `foundIds` may be the story's Set of discovered
 * clues or an array from a saved game. Every result includes UI feedback and
 * an optional event to drive lights, audio or story clue completion.
 */
export function applyMechanismAction(previous, action, foundIds = []) {
  const state = restoreMechanismState(previous, foundIds);
  const found = foundSet(foundIds);
  const type = action?.type;
  const rear = action?.rear;
  const a = state.alignment;
  const p = state.power;
  const r = state.radio;

  switch (type) {
    case 'alignment.trace': {
      const stake = action?.stake;
      const expected = stake === 'west' ? 'main' : stake === 'east' ? 'standby' : null;
      const clue = stake === 'west' ? 'headland_view' : 'east_ridge_view';
      const field = stake === 'west' ? 'westRear' : 'eastRear';
      if (!expected || !validRear(rear)) return unchanged(state, 'blocked', 'Choose a survey stake and one of the two rear lamps.');
      if (!has(found, clue)) return unchanged(state, 'blocked', `Record the ${stake} survey photograph before tracing its line.`);
      if (rear !== expected) return unchanged(state, 'mistake', stake === 'west'
        ? 'That line does not overlap in the west photograph. The western main rear lamp does.'
        : 'That line does not overlap in the east photograph. The eastern standby rear lamp does.', 'misaligned_trace');
      if (a[field] === rear) return unchanged(state, 'unchanged', `The ${stake} sightline is already traced.`);
      return changed(state, 'alignment', { [field]: rear },
        stake === 'west' ? 'West stake: the front lamp and main rear lamp coincide.'
          : 'East stake: the front lamp and standby rear lamp coincide.', 'sightline_traced');
    }
    case 'alignment.confirm': {
      if (!has(found, 'tower_panel')) return unchanged(state, 'blocked', 'Inspect the tower control panel and its standby circuit first.');
      if (a.westRear !== 'main' || a.eastRear !== 'standby') {
        return unchanged(state, 'blocked', 'Trace both field photographs on the board before selecting a safe channel.');
      }
      if (!validRear(rear)) return unchanged(state, 'blocked', 'Select which rear lamp defines the safe leading line.');
      if (rear !== 'main') return unchanged(state, 'mistake',
        'The standby pair leads west over the reef. The chart and west photograph put the main pair through deep water.', 'reef_warning');
      if (a.safeRear === 'main') return unchanged(state, 'unchanged', 'The main rear and front light are already marked as the safe line.');
      return changed(state, 'alignment', { safeRear: 'main' },
        'Safe line confirmed: the western main rear lamp with the lower front light.', 'alignment_solved', 'complete');
    }
    case 'power.inspect': {
      if (!has(found, 'lamp_strip') || !has(found, 'tunnel_signal')) {
        return unchanged(state, 'blocked', 'Find the relay strip and speak to Iris at the service hatch before operating the old bus.');
      }
      if (p.diagramRead) return unchanged(state, 'unchanged', 'The backup diagram is already in your notes.');
      return changed(state, 'power', { diagramRead: true },
        'The backup set feeds the drain pump and the old standby-lamp bus. Isolate the failed shore incomer before transfer.', 'diagram_read');
    }
    case 'power.isolateMains': {
      if (!p.diagramRead) return unchanged(state, 'blocked', 'Read the backup wiring diagram first.');
      if (p.mainsIsolated) return unchanged(state, 'unchanged', 'The shore incomer is already open.');
      return changed(state, 'power', { mainsIsolated: true },
        'Shore incomer open. The generator can now take the island bus without feeding the failed shore cable.', 'breaker_open');
    }
    case 'power.warnLaunch': {
      if (!p.diagramRead) return unchanged(state, 'blocked', 'Read the backup wiring diagram before warning the launch.');
      if (a.safeRear !== 'main') return unchanged(state, 'blocked', 'Resolve which light pair is safe at the tower before warning the launch.');
      if (p.launchWarned) return unchanged(state, 'unchanged', 'The pilot has acknowledged the standby-lamp warning.');
      return changed(state, 'power', { launchWarned: true },
        'Launch acknowledges: holding offshore while the old standby-lamp circuit is energized.', 'launch_warned');
    }
    case 'power.openDischarge': {
      if (!p.diagramRead) return unchanged(state, 'blocked', 'Read the pump and backup diagram first.');
      if (p.dischargeOpen) return unchanged(state, 'unchanged', 'The discharge valve is already open to the outfall.');
      return changed(state, 'power', { dischargeOpen: true },
        'Outfall valve open. The pump can discharge tunnel water clear of the hatch.', 'valve_open');
    }
    case 'power.startBackup': {
      if (p.backupOn) return unchanged(state, 'unchanged', 'Backup set is already carrying the old bus.');
      if (!p.diagramRead || !p.mainsIsolated || !p.launchWarned || !p.dischargeOpen) {
        return unchanged(state, 'blocked', 'Before transfer: read the diagram, isolate shore mains, warn the launch, and open the outfall valve.');
      }
      return changed(state, 'power', { backupOn: true },
        'Backup set takes the bus. The standby rear lamp glows again, but the launch is holding offshore.', 'backup_online');
    }
    case 'power.startPump': {
      if (!p.backupOn) return unchanged(state, 'blocked', 'Bring the backup generator onto the isolated bus first.');
      if (p.pumpOn) return unchanged(state, 'unchanged', 'The drain pump is already running.');
      return changed(state, 'power', { pumpOn: true },
        'Drain pump running. Water begins to fall at the tunnel gate.', 'power_restored', 'complete');
    }
    case 'radio.inspectChart': {
      if (!p.pumpOn) return unchanged(state, 'blocked', 'Restore the pump-house bus before using the harbor radio.');
      if (r.chartRead) return unchanged(state, 'unchanged', 'The inlet chart is open beside the radio.');
      return changed(state, 'radio', { chartRead: true },
        'The chart marks a deep north-inlet line through front + western main rear. The eastern standby line crosses the reef.', 'chart_read');
    }
    case 'radio.hold': {
      if (!p.pumpOn) return unchanged(state, 'blocked', 'Restore the pump-house bus before transmitting to the launch.');
      if (r.heldOffshore) return unchanged(state, 'unchanged', 'The launch is holding outside the breakers.');
      return changed(state, 'radio', { heldOffshore: true },
        'Launch copies: holding offshore and awaiting a confirmed leading-light pair.', 'launch_holding');
    }
    case 'radio.select': {
      if (!r.chartRead || !r.heldOffshore) return unchanged(state, 'blocked', 'Read the inlet chart and order the launch to hold before preparing a route.');
      if (!validRear(rear)) return unchanged(state, 'blocked', 'Select the main or standby rear lamp.');
      if (r.routeRear === rear) return unchanged(state, 'unchanged', `The ${rear} rear lamp is already selected.`);
      return changed(state, 'radio', { routeRear: rear }, rear === 'main'
        ? 'Route drafted: front lamp in line with western main rear, then into the deep channel.'
        : 'Route drafted against the eastern standby rear. Check the chart before transmitting.',
      rear === 'main' ? 'safe_route_selected' : 'reef_warning', rear === 'main' ? 'changed' : 'mistake');
    }
    case 'radio.transmit': {
      if (r.confirmed) return unchanged(state, 'unchanged', 'The safe approach has already been transmitted.');
      if (!r.chartRead || !r.heldOffshore || !r.routeRear) {
        return unchanged(state, 'blocked', 'Read the chart, hold the launch, and select a leading-light pair before transmitting.');
      }
      if (r.routeRear !== 'main' || a.safeRear !== 'main') return unchanged(state, 'mistake',
        'Pilot checks the chart and refuses the reef-side line. The launch keeps holding offshore.', 'reef_warning');
      return changed(state, 'radio', { confirmed: true },
        'Launch copies: front and western main rear in line. It enters the deep north-inlet channel.', 'launch_guided', 'complete');
    }
    default:
      return unchanged(state, 'blocked', 'That control is not part of this mechanism.');
  }
}

/** Advance the drain while the pump runs. Completion happens only once. */
export function tickMechanisms(previous, seconds) {
  const state = restoreMechanismState(previous);
  if (!state.power.pumpOn || !Number.isFinite(seconds) || seconds <= 0
      || state.power.drainSeconds >= TUNNEL_DRAIN_SECONDS) {
    return unchanged(state, 'unchanged', 'The drain state has not changed.');
  }
  const drainSeconds = finiteSeconds(state.power.drainSeconds + seconds);
  const complete = drainSeconds >= TUNNEL_DRAIN_SECONDS;
  return changed(state, 'power', { drainSeconds }, complete
    ? 'The tunnel water is below the gate sill. The hatch can be released.'
    : 'The pump is lowering the tunnel water.', complete ? 'tunnel_drained' : null,
  complete ? 'complete' : 'changed');
}

export function mechanismMilestones(previous) {
  const state = restoreMechanismState(previous);
  return {
    alignmentSolved: state.alignment.safeRear === 'main',
    powerRestored: state.power.pumpOn,
    standbyEnergized: state.power.backupOn,
    launchGuided: state.radio.confirmed,
    tunnelDrained: state.power.drainSeconds >= TUNNEL_DRAIN_SECONDS,
  };
}

/** Small, serializable view model for the existing action-button modal. */
export function getMechanismPanel(previous, puzzle) {
  const state = restoreMechanismState(previous);
  const button = (label, type, extra = {}) => ({ label, action: { type, ...extra } });
  if (puzzle === 'alignment') {
    const a = state.alignment;
    if (!a.westRear) return {
      title: 'Plot the west survey line',
      text: 'In the west photograph, which rear lamp overlaps the lower front lamp?',
      actions: [button('TRACE MAIN REAR', 'alignment.trace', { stake: 'west', rear: 'main' }),
        button('TRACE STANDBY REAR', 'alignment.trace', { stake: 'west', rear: 'standby' })],
    };
    if (!a.eastRear) return {
      title: 'Plot the east survey line',
      text: 'In the east photograph, which rear lamp overlaps the lower front lamp?',
      actions: [button('TRACE MAIN REAR', 'alignment.trace', { stake: 'east', rear: 'main' }),
        button('TRACE STANDBY REAR', 'alignment.trace', { stake: 'east', rear: 'standby' })],
    };
    if (!a.safeRear) return {
      title: 'Mark the safe channel',
      text: 'The west and east sightlines diverge seaward. Which pair follows deep water?',
      actions: [button('MAIN REAR + FRONT', 'alignment.confirm', { rear: 'main' }),
        button('STANDBY REAR + FRONT', 'alignment.confirm', { rear: 'standby' })],
    };
    return { title: 'Safe line recorded', text: 'Western main rear + lower front mark the north inlet. Eastern standby + front point toward the reef.', actions: [] };
  }
  if (puzzle === 'power') {
    const p = state.power;
    if (!p.diagramRead) return { title: 'Backup switchboard', text: 'Read the circuit diagram before touching the transfer controls.', actions: [button('READ DIAGRAM', 'power.inspect')] };
    if (!p.mainsIsolated) return { title: 'Failed shore incomer', text: 'The shore cable is still connected to the bus. Open its isolator before starting the generator.', actions: [button('OPEN SHORE INCOMER', 'power.isolateMains')] };
    if (!p.launchWarned) return { title: 'Warn the launch', text: 'The old backup bus also energizes the misleading standby rear lamp. Tell the launch to hold offshore.', actions: [button('WARN LAUNCH', 'power.warnLaunch')] };
    if (!p.dischargeOpen) return { title: 'Drainage outfall', text: 'The pump discharge valve is shut. Open it to send tunnel water to the sea.', actions: [button('OPEN OUTFALL VALVE', 'power.openDischarge')] };
    if (!p.backupOn) return { title: 'Backup transfer', text: 'Shore mains are isolated, the pilot has been warned, and the outfall is open.', actions: [button('START BACKUP SET', 'power.startBackup')] };
    if (!p.pumpOn) return { title: 'Tunnel drain pump', text: 'The old bus is live, including the standby lamp. Start the drain pump.', actions: [button('START DRAIN PUMP', 'power.startPump')] };
    return { title: 'Pump running', text: `Tunnel water lowering: ${Math.floor(p.drainSeconds)} / ${TUNNEL_DRAIN_SECONDS} seconds.`, actions: [] };
  }
  if (puzzle === 'radio') {
    const r = state.radio;
    if (!r.chartRead) return { title: 'Inlet chart', text: 'Check the north-inlet chart before giving the launch a light pair.', actions: [button('READ INLET CHART', 'radio.inspectChart')] };
    if (!r.heldOffshore) return { title: 'Harbor radio', text: 'Keep the launch clear of the breakers while you confirm the route.', actions: [button('ORDER HOLD OFFSHORE', 'radio.hold')] };
    if (!r.routeRear || r.routeRear === 'standby') return {
      title: 'Draft approach message',
      text: 'Select the rear lamp that pairs with the lower front light over the deep channel.',
      actions: [button('WESTERN MAIN REAR', 'radio.select', { rear: 'main' }),
        button('EASTERN STANDBY REAR', 'radio.select', { rear: 'standby' }),
        ...(r.routeRear ? [button('TRANSMIT DRAFT', 'radio.transmit')] : [])],
    };
    if (!r.confirmed) return { title: 'Confirm safe approach', text: 'The chart and survey match: front + western main rear. Transmit the bearing.', actions: [button('TRANSMIT SAFE LINE', 'radio.transmit'), button('RECHECK STANDBY', 'radio.select', { rear: 'standby' })] };
    return { title: 'Safe approach transmitted', text: 'The launch is entering along the deep north-inlet line.', actions: [] };
  }
  return { title: 'Unknown mechanism', text: 'This control is not available.', actions: [] };
}
