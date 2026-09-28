// An optional reconstruction of Iris's last documented route. Each station
// yields a bounded observation; no trace can establish her motive or the
// exact time someone else moved a piece of equipment. Rescue never reads this
// state, so missing these stations cannot hold Iris behind the hatch.

export const IRIS_TRAIL_VERSION = 1;

export const IRIS_TRAIL_STATIONS = Object.freeze([
  Object.freeze({
    id: 'radio', site: 'radio', inside: 'radio', x: 152.5, z: -54.3,
    name: 'Radio room checkout card',
    prompt: 'A damp checkout card records that Iris signed out field spool 14 and a survey lamp at 18:40. The destination box says “pump / tunnel conduit.” It records a plan, not an arrival time.',
    actionType: 'irisTrail.radio', answer: 'planned_pump_route',
    choices: Object.freeze([
      Object.freeze({ answer: 'planned_pump_route', label: 'Record her stated destination; keep her arrival time unknown' }),
      Object.freeze({ answer: 'voluntary_confinement', label: 'Conclude she voluntarily locked herself in the tunnel', mistake: 'A checkout destination cannot establish how she later came to be behind a locked gate.' }),
      Object.freeze({ answer: 'never_left_radio', label: 'Conclude she never left the radio house', mistake: 'A checkout card records what she planned to take. It cannot establish that she stayed in the room.' }),
    ]),
    success: 'Iris signed out a field spool for the pump and tunnel conduit. The checkout does not say when she reached either place.',
  }),
  Object.freeze({
    id: 'road', site: 'pump-link', inside: null, x: 154, z: 41,
    name: 'Field-spool inventory tag',
    prompt: 'A blue inventory tab stamped 14 is snagged in the old service-road gate. Its printed number matches the radio checkout card; the wet ground has lost any reliable footprints.',
    actionType: 'irisTrail.road', answer: 'gear_on_service_road',
    choices: Object.freeze([
      Object.freeze({ answer: 'elias_dragged_iris', label: 'The tab proves Elias dragged Iris down this road', mistake: 'The tag identifies equipment, not its carrier or whether anyone was forced along the road.' }),
      Object.freeze({ answer: 'gear_on_service_road', label: 'Record the matching equipment tag on the pump road; leave its carrier and time open' }),
      Object.freeze({ answer: 'footprints_timed', label: 'Date the journey from the footprints in the rain', mistake: 'The track surface is washed out. No usable print or time mark remains.' }),
    ]),
    success: 'The matching spool tag places signed-out equipment on the service road. It does not identify who carried it.',
  }),
  Object.freeze({
    id: 'pump', site: 'pump', inside: 'pump', x: 122.5, z: 131.2,
    name: 'Pump bypass margin',
    prompt: 'A pencil line on the bypass chart runs from the pump house to the tunnel conduit. Iris noted that the emergency pump and standby rear lamp share a feed; the switch position is a separate question.',
    actionType: 'irisTrail.pump', answer: 'planned_shared_feed_check',
    choices: Object.freeze([
      Object.freeze({ answer: 'iris_powered_false_lamp', label: 'Iris’s pencil line proves she energized the misleading lamp', mistake: 'A wiring note identifies a hazard. It is not a switch log and cannot show that Iris operated the circuit.' }),
      Object.freeze({ answer: 'planned_shared_feed_check', label: 'Record her marked conduit route and shared-feed warning; keep switch operation separate' }),
      Object.freeze({ answer: 'old_order_places_iris', label: 'Use the wreck-night service order to date Iris’s visit', mistake: 'The service order was written seventeen years earlier and records Elias’s action, not Iris’s visit.' }),
    ]),
    success: 'Iris marked the bypass and the shared electrical hazard. The chart does not show that she threw a switch.',
  }),
  Object.freeze({
    id: 'hatch', site: 'tunnel', inside: null, x: 160, z: 139,
    name: 'Conduit chalk and route board',
    prompt: 'Chalk at the tunnel conduit points back toward the pump. Compare the radio checkout, the road tag, and the bypass margin before you describe Iris’s route.',
    actionType: 'irisTrail.hatch', answer: 'documented_route_with_limits',
    choices: Object.freeze([
      Object.freeze({ answer: 'documented_route_with_limits', label: 'Reconstruct radio checkout → equipment on pump road → bypass note → tunnel chalk, with carrier and timing unresolved' }),
      Object.freeze({ answer: 'exact_chase', label: 'Conclude Elias chased Iris from the radio room to the hatch at 18:40', mistake: 'The checkout time belongs to equipment leaving the radio room. The marks do not show a chase or timestamp the hatch.' }),
      Object.freeze({ answer: 'iris_sabotaged', label: 'Conclude Iris staged the disappearance and sabotaged the pump', mistake: 'The marks show her planned work and route. They do not show sabotage or voluntary confinement.' }),
    ]),
    success: 'The physical traces support a route from radio to pump conduit and hatch, with an unknown interval and unknown carrier for the road tag. Iris’s own later account remains hers to give.',
  }),
]);

const BY_ID = new Map(IRIS_TRAIL_STATIONS.map((station) => [station.id, station]));
const FIRST_THREE = Object.freeze(['radio', 'road', 'pump']);

function contextOf(raw = {}) {
  const context = raw && typeof raw === 'object' ? raw : {};
  return {
    chapter: Number.isInteger(context.chapter) ? context.chapter : -1,
    found: context.foundIds instanceof Set ? context.foundIds
      : new Set(Array.isArray(context.foundIds) ? context.foundIds : []),
  };
}

export function createIrisTrailState() {
  return { version: IRIS_TRAIL_VERSION, radio: null, road: null, pump: null, hatch: null };
}

export function serializeIrisTrailState(raw) {
  const state = createIrisTrailState();
  if (!raw || typeof raw !== 'object' || raw.version !== IRIS_TRAIL_VERSION) return state;
  for (const station of IRIS_TRAIL_STATIONS) {
    if (raw[station.id] === station.answer) state[station.id] = station.answer;
  }
  if (!FIRST_THREE.every((id) => state[id])) state.hatch = null;
  return state;
}

export function restoreIrisTrailState(raw, context = {}) {
  if (contextOf(context).chapter < 3) return createIrisTrailState();
  return serializeIrisTrailState(raw);
}

export function irisTrailMilestones(raw, context = {}) {
  const state = restoreIrisTrailState(raw, context);
  const observedStations = FIRST_THREE.filter((id) => Boolean(state[id])).length;
  return { observedStations, readyToReconstruct: observedStations === 3,
    reconstructed: state.hatch === BY_ID.get('hatch').answer };
}

export function irisTrailSummary(raw, context = {}) {
  if (!irisTrailMilestones(raw, context).reconstructed) return null;
  const { found } = contextOf(context);
  const extras = [];
  if (found.has('radio_iris_recording')) extras.push('Her recorded checklist independently names the two survey stakes, the pump, and the danger of energizing the standby lamp.');
  if (found.has('pump_iris_route')) extras.push('Her bypass sketch supplies a separate drawing of the pump and tunnel sequence.');
  if (found.has('tunnel_chalk')) extras.push('The chalk on the conduit is a physical marker at the tunnel end of the route.');
  if (found.has('tunnel_signal')) extras.push('Iris later answers from behind the locked service hatch; her own account is needed for what happened there.');
  return [
    'IRIS’S LAST DOCUMENTED ROUTE',
    'At 18:40 Iris signed out field spool 14 for the pump and tunnel conduit. Its numbered tag was found on the pump service road. A marked bypass chart in the pump house and chalk at the tunnel conduit continue that route.',
    'The sources do not establish who carried the spool along the road, when Iris reached the hatch, or what happened at the locked gate. The wreck-night service order belongs to a different night seventeen years earlier.',
    ...extras,
  ].join('\n\n');
}

function result(state, status, message, context, event = null) {
  return { state, status, message, event, summaryText: irisTrailSummary(state, context) };
}

export function nearestIrisTrailStation(x, z, insideId, raw, context = {}, radius = 1.8) {
  if (contextOf(context).chapter < 3 || !Number.isFinite(x) || !Number.isFinite(z)
    || !Number.isFinite(radius) || radius <= 0) return null;
  const state = restoreIrisTrailState(raw, context);
  let best = null;
  for (const station of IRIS_TRAIL_STATIONS) {
    if (station.inside !== (insideId ?? null)) continue;
    const distance = Math.hypot(station.x - x, station.z - z);
    if (distance > radius || (best && distance >= best.distance)) continue;
    best = { id: station.id, name: station.name, x: station.x, z: station.z,
      distance, complete: Boolean(state[station.id]),
      prompt: state[station.id] ? `Review ${station.name.toLowerCase()}` : `Inspect ${station.name.toLowerCase()}` };
  }
  return best;
}

export function getIrisTrailPanel(raw, stationId, context = {}) {
  const state = restoreIrisTrailState(raw, context);
  const { found } = contextOf(context);
  const station = BY_ID.get(stationId);
  const panel = (title, text, actions = [], missingStationIds = [], complete = false) => ({
    stationId: stationId ?? null, title, text, actions, missingStationIds, complete,
    summaryText: irisTrailSummary(state, context),
  });
  if (contextOf(context).chapter < 3) {
    return panel('Iris’s trail', 'The radio, pump, and tunnel route can be examined after the investigation reaches the island radio.');
  }
  if (!station) return panel('Iris’s trail', 'Move closer to a field trace along the radio-to-pump road.');
  if (state[station.id]) return panel(station.name, station.id === 'hatch'
    ? 'The observed route is in the field journal. Iris’s account of the locked gate remains her own.'
    : station.success, [], [], true);
  const missingStationIds = station.id === 'hatch'
    ? FIRST_THREE.filter((id) => !state[id]) : [];
  const supportingRecord = station.id === 'radio' && found.has('radio_iris_recording')
    ? ' Iris’s recorded checklist independently names both survey stakes, the pump, and the shared-feed warning.'
    : station.id === 'pump'
      ? `${found.has('pump_iris_route') ? ' Her bypass sketch repeats this pump-to-tunnel path.' : ''}${found.has('pump_service_order') ? ' The service order beside it records Elias’s wreck-night action seventeen years earlier; it cannot date this visit.' : ''}`
      : station.id === 'hatch'
        ? `${found.has('tunnel_chalk') ? ' The conduit chalk you recorded fixes this marker to the tunnel end of the route.' : ''}${found.has('tunnel_signal') ? ' Iris later answers from behind the hatch; only she can describe the confinement.' : ''}`
        : '';
  const prompt = station.prompt + supportingRecord;
  const text = missingStationIds.length
    ? `${prompt} Return after examining ${missingStationIds.map((id) => BY_ID.get(id).name.toLowerCase()).join(', ')}.`
    : prompt;
  return panel(station.name, text, missingStationIds.length ? []
    : station.choices.map(({ answer, label }) => ({ label, action: { type: station.actionType, answer } })),
  missingStationIds);
}

export function applyIrisTrailAction(previous, action, context = {}) {
  const state = restoreIrisTrailState(previous, context);
  if (contextOf(context).chapter < 3) {
    return result(state, 'blocked', 'This route is part of the radio, pump, and tunnel investigation.', context);
  }
  const station = IRIS_TRAIL_STATIONS.find((candidate) => candidate.actionType === action?.type);
  if (!station) return result(state, 'blocked', 'Inspect a trace along Iris’s route.', context);
  if (state[station.id]) return result(state, 'unchanged', 'That observation has already been entered in the field journal.', context);
  if (station.id === 'hatch' && !FIRST_THREE.every((id) => state[id])) {
    return result(state, 'blocked', 'Compare the radio checkout, road tag, and pump bypass margin before reconstructing the route.', context);
  }
  const choice = station.choices.find((candidate) => candidate.answer === action.answer);
  if (!choice) return result(state, 'blocked', 'Choose one of the observations offered at this station.', context);
  if (choice.answer !== station.answer) return result(state, 'mistake', choice.mistake, context);
  const next = { ...state, [station.id]: station.answer };
  const complete = station.id === 'hatch';
  return result(next, complete ? 'complete' : 'changed', station.success, context,
    complete ? 'iris_route_reconstructed' : 'iris_route_observation');
}
