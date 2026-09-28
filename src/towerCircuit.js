import { NAV_LIGHTS, SITES } from './story.js';

// Chapter 3 examines a circuit that exists today and two photographed
// bearings. Nothing in this room is a substitute for the original relay strip
// made on the wreck night. That independent record is recovered later.
export const TOWER_CIRCUIT_VERSION = 1;
export const TOWER_SITE = Object.freeze({ ...SITES.find((site) => site.id === 'tower') });
export const TOWER_CIRCUIT_STATIONS = Object.freeze([
  // Keep this plaque clear of the original control panel's review prompt at
  // local (-3, -1.8), while leaving room for the repeater farther north.
  Object.freeze({ id: 'wiring', name: 'Standby conductor diagram', x: -2.82, z: -0.5,
    key: 'wiringTraced', type: 'tower.wiring' }),
  Object.freeze({ id: 'test', name: 'Isolated test repeater', x: -2.82, z: 1.28,
    key: 'testQualified', type: 'tower.test' }),
  Object.freeze({ id: 'overlay', name: 'Photograph plotting rail', x: 2.82, z: -1.68,
    key: null, type: 'tower.overlay' }),
  Object.freeze({ id: 'chart', name: 'North inlet comparison chart', x: 2.82, z: 2.9,
    key: 'channelCompared', type: 'tower.chart' }),
]);

const BY_ID = Object.freeze(Object.fromEntries(TOWER_CIRCUIT_STATIONS.map((station) => [station.id, station])));
const SURVEY_EVIDENCE = Object.freeze(['headland_view', 'east_ridge_view']);
const PANEL_EVIDENCE = Object.freeze([...SURVEY_EVIDENCE, 'tower_panel']);
const CHART_EVIDENCE = Object.freeze([...PANEL_EVIDENCE, 'archive_chart']);
const EVIDENCE_NAMES = Object.freeze({
  headland_view: 'the west-stake photograph',
  east_ridge_view: 'the east-stake photograph',
  tower_panel: 'the original tower control panel',
  archive_chart: 'the harbor survey chart',
});

function foundSet(foundIds) {
  return foundIds instanceof Set ? foundIds : new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createTowerCircuitState() {
  return {
    version: TOWER_CIRCUIT_VERSION,
    wiringTraced: false,
    testQualified: false,
    westTraced: false,
    eastTraced: false,
    channelCompared: false,
    legacyAlignment: false,
  };
}

/** Hydrate only observations supported by evidence still present in the save. */
export function restoreTowerCircuitState(raw, foundIds = []) {
  const state = createTowerCircuitState();
  const found = foundSet(foundIds);
  // Chapter 4+ start slots and saves made before this room sequence contain a
  // valid alignment_solution but no towerCircuit field. Reconcile their old
  // finding with the new station UI. The marker prevents the new test plaque
  // from claiming that a test, absent in that earlier playthrough, occurred.
  if (raw == null && found.has('alignment_solution')
    && CHART_EVIDENCE.every((id) => found.has(id))) {
    return { ...state, wiringTraced: true, testQualified: true,
      westTraced: true, eastTraced: true, channelCompared: true,
      legacyAlignment: true };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || (raw.version !== undefined && raw.version !== TOWER_CIRCUIT_VERSION)) return state;
  if (!PANEL_EVIDENCE.every((id) => found.has(id))) return state;
  state.wiringTraced = raw.wiringTraced === true;
  state.testQualified = state.wiringTraced && raw.testQualified === true;
  state.westTraced = raw.westTraced === true;
  state.eastTraced = raw.eastTraced === true;
  state.channelCompared = CHART_EVIDENCE.every((id) => found.has(id))
    && state.wiringTraced && state.testQualified
    && state.westTraced && state.eastTraced
    && raw.channelCompared === true;
  state.legacyAlignment = state.channelCompared && found.has('alignment_solution')
    && raw.legacyAlignment === true;
  return state;
}

export function towerCircuitMilestones(raw, foundIds = []) {
  const state = restoreTowerCircuitState(raw, foundIds);
  return {
    wiringTraced: state.wiringTraced,
    presentTestQualified: state.testQualified,
    westTraced: state.westTraced,
    eastTraced: state.eastTraced,
    safeLineCompared: state.channelCompared,
    completedStations: [state.wiringTraced, state.testQualified,
      state.westTraced && state.eastTraced, state.channelCompared].filter(Boolean).length,
  };
}

/** Return the sea-side x intercept of a measured leading-light bearing. */
export function sightlineXAtZ(rear, z) {
  const rearLight = NAV_LIGHTS[rear];
  const front = NAV_LIGHTS.front;
  if ((rear !== 'main' && rear !== 'standby') || !Number.isFinite(z)
    || !rearLight || rearLight.z === front.z) return null;
  return front.x + (rearLight.x - front.x) * (z - front.z) / (rearLight.z - front.z);
}

/** The two lines cross at the front light; seaward, the false line bends west. */
export function compareTowerSightlines(seaZ = -370) {
  if (!Number.isFinite(seaZ) || seaZ >= NAV_LIGHTS.front.z) return null;
  const safeX = sightlineXAtZ('main', seaZ);
  const falseX = sightlineXAtZ('standby', seaZ);
  return { seaZ, safeX, falseX, separation: safeX - falseX,
    safeRear: 'main', reefRear: 'standby' };
}

/** Local tower coordinates are converted to world coordinates for E prompts. */
export function nearestTowerCircuitStation(x, z, insideId, raw, foundIds = [], radius = 1.35) {
  if (insideId !== 'tower' || !Number.isFinite(x) || !Number.isFinite(z)
    || !Number.isFinite(radius) || radius <= 0) return null;
  const state = restoreTowerCircuitState(raw, foundIds);
  let best = null;
  for (const station of TOWER_CIRCUIT_STATIONS) {
    const sx = TOWER_SITE.x + station.x;
    const sz = TOWER_SITE.z + station.z;
    const distance = Math.hypot(x - sx, z - sz);
    if (distance > radius || (best && distance >= best.distance)) continue;
    const complete = station.id === 'overlay'
      ? state.westTraced && state.eastTraced : state[station.key];
    best = { id: station.id, name: station.name, x: sx, z: sz,
      distance, complete,
      prompt: `${complete ? 'Review' : 'Inspect'} ${station.name.toLowerCase()}` };
  }
  return best;
}

function missingFor(stationId, state, found) {
  const evidence = (stationId === 'chart' ? CHART_EVIDENCE : PANEL_EVIDENCE)
    .filter((id) => !found.has(id));
  const stations = stationId === 'test' && !state.wiringTraced ? ['wiring']
    : stationId === 'chart' ? [
      ...(!state.wiringTraced ? ['wiring'] : []),
      ...(!state.testQualified ? ['test'] : []),
      ...(!(state.westTraced && state.eastTraced) ? ['overlay'] : []),
    ] : [];
  return { evidenceIds: evidence, stationIds: stations };
}

const ACTIONS = Object.freeze({
  wiring: Object.freeze([
    Object.freeze({ label: 'TRACE THE STANDBY LEAD INTO THE OLD BUS', answer: 'standby_connected' }),
    Object.freeze({ label: 'MARK THE STANDBY LAMP PHYSICALLY DISCONNECTED', answer: 'standby_removed' }),
    Object.freeze({ label: 'MARK BOTH CIRCUITS ACTIVE ON THE WRECK NIGHT', answer: 'old_night_proven' }),
  ]),
  test: Object.freeze([
    Object.freeze({ label: 'RECORD PRESENT CONTINUITY ONLY', answer: 'present_only' }),
    Object.freeze({ label: 'USE THIS TEST AS THE WRECK-NIGHT RECORD', answer: 'wreck_night_active' }),
    Object.freeze({ label: 'ASSUME SOFTWARE ERASED THE PHYSICAL LEAD', answer: 'software_disconnected' }),
  ]),
  chart: Object.freeze([
    Object.freeze({ label: 'MAIN + FRONT THROUGH THE DEEP INLET', answer: 'main_deep' }),
    Object.freeze({ label: 'STANDBY + FRONT THROUGH THE DEEP INLET', answer: 'standby_deep' }),
    Object.freeze({ label: 'BOTH PAIRS LEAD THROUGH THE INLET', answer: 'both_safe' }),
  ]),
});

function buttons(type, choices) {
  return choices.map(({ label, ...fields }) => ({ label, action: { type, ...fields } }));
}

export function getTowerCircuitPanel(raw, stationId, foundIds = []) {
  const state = restoreTowerCircuitState(raw, foundIds);
  const found = foundSet(foundIds);
  const station = BY_ID[stationId];
  if (!station) return { stationId: null, title: 'No tower station',
    text: 'Move beside a fixture in the signal tower.', actions: [],
    missingEvidenceIds: [], missingStationIds: [], complete: false };
  const missing = missingFor(stationId, state, found);
  const missingNames = [
    ...missing.evidenceIds.map((id) => EVIDENCE_NAMES[id]),
    ...missing.stationIds.map((id) => BY_ID[id].name.toLowerCase()),
  ];
  const complete = stationId === 'overlay'
    ? state.westTraced && state.eastTraced : state[station.key];
  if (missingNames.length) return { stationId, title: station.name,
    text: `First inspect ${missingNames.join(', ')}. Compare both physical survey photographs before trusting a tower inference.`,
    actions: [], missingEvidenceIds: missing.evidenceIds,
    missingStationIds: missing.stationIds, complete: false };

  let text;
  let actions = [];
  if (stationId === 'wiring') {
    text = complete
      ? 'The labeled standby lead is still landed on the manual failover bus. Software normally suppresses it, but the hardware can energize it. This says nothing by itself about 21:14 on the wreck night.'
      : 'Follow the labeled conductor from the eastern standby rear lamp through the manual failover contact. What does the wiring physically allow today?';
    if (!complete) actions = buttons('tower.wiring', ACTIONS.wiring);
  } else if (stationId === 'test') {
    text = complete
      ? state.legacyAlignment
        ? 'Your earlier alignment finding is retained from the survey photographs and chart. The isolated test repeater is available here, but that earlier finding did not depend on a new continuity test. No present reading can establish the wreck-night relay state.'
        : 'The isolated internal repeater answered a present-day continuity test. The outside beacon was not switched on. A current reading cannot establish the old relay state.'
      : 'The guarded TEST position drives only an internal repeater, isolated from the seaward beacon. Its maintenance slip is dated today. What can a safe continuity check establish?';
    if (!complete) actions = buttons('tower.test', ACTIONS.test);
  } else if (stationId === 'overlay') {
    if (!state.westTraced) {
      text = 'Place the west-stake photograph against the tower survey pins. Which rear light shares the lower front lamp’s bearing?';
      actions = buttons('tower.overlay', [
        { label: 'WEST: MAIN REAR + FRONT', stake: 'west', rear: 'main' },
        { label: 'WEST: STANDBY REAR + FRONT', stake: 'west', rear: 'standby' },
      ]);
    } else if (!state.eastTraced) {
      text = 'Keep the west line pinned. Add the east-ridge photograph without moving the front-lamp pin. Which rear light now aligns?';
      actions = buttons('tower.overlay', [
        { label: 'EAST: MAIN REAR + FRONT', stake: 'east', rear: 'main' },
        { label: 'EAST: STANDBY REAR + FRONT', stake: 'east', rear: 'standby' },
      ]);
    } else {
      text = 'Both field photographs are pinned: west shows front + main; east shows front + standby. The lines agree at the front lamp but diverge over the sea. The chart determines which water each crosses.';
    }
  } else {
    text = complete
      ? 'The west photograph projects the main pair into the deep north inlet. The east photograph projects the standby pair toward the western reef. This establishes where the lines lead, not which lamp operated seventeen years ago.'
      : 'Extend both pinned bearings seaward across the archive chart. One reaches the deep inlet; the other reaches the western reef. Which pair can guide a boat safely?';
    if (!complete) actions = buttons('tower.chart', ACTIONS.chart);
  }
  if (found.has('lamp_strip') && stationId === 'test') {
    text += ' The relay’s original strip, found later, independently records both rear circuits active at 21:14.';
  }
  return { stationId, title: station.name, text, actions,
    missingEvidenceIds: [], missingStationIds: [], complete };
}

export function applyTowerCircuitAction(previous, action, foundIds = []) {
  const state = restoreTowerCircuitState(previous, foundIds);
  const found = foundSet(foundIds);
  const result = (status, message, next = state, event = null) => ({ state: next, status, message, event });
  const station = TOWER_CIRCUIT_STATIONS.find((item) => item.type === action?.type);
  if (!station) return result('blocked', 'Inspect a marked tower fixture first.');
  const missing = missingFor(station.id, state, found);
  if (missing.evidenceIds.length || missing.stationIds.length) {
    return result('blocked', 'Read both survey photographs, the tower panel, and any preceding fixture or chart before drawing this conclusion.');
  }
  if (station.id === 'overlay') {
    const stake = action?.stake;
    const rear = action?.rear;
    if (!['west', 'east'].includes(stake) || !['main', 'standby'].includes(rear)) {
      return result('blocked', 'Place one of the photographed light pairs on the plotting rail.');
    }
    const key = stake === 'west' ? 'westTraced' : 'eastTraced';
    if (stake === 'east' && !state.westTraced) {
      return result('blocked', 'Pin the west photograph first so the front-lamp pin stays fixed.');
    }
    if (state[key]) return result('unchanged', `The ${stake} photograph is already pinned.`);
    const expected = stake === 'west' ? 'main' : 'standby';
    if (rear !== expected) return result('mistake', stake === 'west'
      ? 'The west image stacks the front and western main lights in bearing. Move the rear pin to the main light.'
      : 'The east image stacks the front and eastern standby lights in bearing. The main light falls off that line.');
    return result('changed', `${stake === 'west' ? 'West' : 'East'} photograph pinned to the ${rear} rear-lamp bearing.`,
      { ...state, [key]: true }, `tower_${stake}_plotted`);
  }
  if (state[station.key]) return result('unchanged', 'That tower observation is already in your notes.');
  const choices = ACTIONS[station.id];
  if (!choices?.some((choice) => choice.answer === action.answer)) {
    return result('blocked', 'Choose an interpretation shown at this fixture.');
  }
  const correct = { wiring: 'standby_connected', test: 'present_only', chart: 'main_deep' }[station.id];
  if (action.answer !== correct) {
    const mistakes = {
      wiring: 'The standby conductor is still terminated on the old bus. Its existence proves capability today, not that it was live on the wreck night.',
      test: 'The slip is dated today and the check lights only the internal repeater. Find the original relay strip before claiming a wreck-night circuit state.',
      chart: 'Project the photographed lines seaward from the front lamp. The standby line bends west toward the reef; the main line follows the charted deep inlet.',
    };
    return result('mistake', mistakes[station.id]);
  }
  const messages = {
    wiring: 'The standby rear lamp remains wired to manual failover. New software can suppress the output; it cannot remove the physical lead.',
    test: 'An isolated internal repeater confirms present continuity without illuminating the seaward beacon. The wreck-night relay state still needs its original record.',
    chart: 'Safe approach recorded: lower front plus western main rear across the deep inlet. The eastern standby pair projects toward the reef. The old circuit state remains unresolved here.',
  };
  const next = { ...state, [station.key]: true };
  return result(station.id === 'chart' ? 'complete' : 'changed', messages[station.id], next,
    { wiring: 'tower_wiring_traced', test: 'tower_present_test_qualified',
      chart: 'tower_channel_compared' }[station.id]);
}
