// Four small, physical investigations within the keeper's lodge. These rules
// contain no scene or DOM state, so an interrupted visit resumes exactly where
// the player left it. A lit lamp and a later paper copy are not proof of which
// navigation lamps operated seventeen years earlier.

export const LODGE_SEQUENCE_VERSION = 1;

// Coordinates are metres relative to the lodge site (-90, 185). Each anchor
// sits on clear floor within the lodge's collision envelope, away from its
// south-facing entrance. The props are small wall or tabletop details.
export const LODGE_STATIONS = Object.freeze([
  Object.freeze({ id: 'shutter', name: 'Storm shutter latch', x: 6.35, z: -2.55,
    prompt: 'A loose shutter keeps striking the east window. Its movement makes every light beyond the wet pane seem to jump.' }),
  Object.freeze({ id: 'lamp', name: 'Table lamp and wet glass', x: 1.35, z: -1.35,
    prompt: 'The keeper’s table lamp faces the rain-covered pane. Its pale glow appears beside the two fixed harbor lights.' }),
  Object.freeze({ id: 'folder', name: 'Old case folder', x: -5.35, z: -2.75,
    prompt: 'A case folder stamped with the wreck’s date sits in the keeper’s file box. Its sheets are dry beneath the stair.' }),
  Object.freeze({ id: 'desk', name: 'Working-copy comparison', x: -2.2, z: 2.65,
    prompt: 'The signed conclusion and an earlier carbon sheet can be laid together under the desk light.' }),
]);

const STATION_BY_ID = Object.freeze(Object.fromEntries(LODGE_STATIONS.map((station) => [station.id, station])));
const COMPLETION_KEY = Object.freeze({ shutter: 'shutterLatched', lamp: 'lampRedirected',
  folder: 'folderRetrieved', desk: 'qualificationCompared' });
const FINAL_EVIDENCE = Object.freeze(['iris_note', 'window_reflection']);
const EVIDENCE_NAMES = Object.freeze({
  iris_note: 'Iris’s letter by the rear table',
  window_reflection: 'the rain-covered east window',
});

function foundSet(foundIds) {
  return foundIds instanceof Set ? foundIds : new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createLodgeSequenceState() {
  return { version: LODGE_SEQUENCE_VERSION, shutterLatched: false, lampRedirected: false,
    folderRetrieved: false, qualificationCompared: false };
}

/** A save may contain only booleans for visited stations. A claimed final
 * comparison is discarded unless all physical observations and both existing
 * lodge clues are actually in the player's journal. */
export function restoreLodgeSequenceState(raw, foundIds = []) {
  const state = createLodgeSequenceState();
  if (!raw || typeof raw !== 'object' || (raw.version !== undefined && raw.version !== LODGE_SEQUENCE_VERSION)) return state;
  for (const key of ['shutterLatched', 'lampRedirected', 'folderRetrieved']) {
    state[key] = raw[key] === true;
  }
  const found = foundSet(foundIds);
  state.qualificationCompared = raw.qualificationCompared === true
    && state.shutterLatched && state.lampRedirected && state.folderRetrieved
    && FINAL_EVIDENCE.every((id) => found.has(id));
  return state;
}

export function lodgeSequenceMilestones(raw, foundIds = []) {
  const state = restoreLodgeSequenceState(raw, foundIds);
  return {
    shutterLatched: state.shutterLatched,
    lampRedirected: state.lampRedirected,
    folderRetrieved: state.folderRetrieved,
    qualificationCompared: state.qualificationCompared,
    completedStations: ['shutterLatched', 'lampRedirected', 'folderRetrieved', 'qualificationCompared']
      .filter((key) => state[key]).length,
  };
}

/** For E prompts. The caller should arbitrate distance against normal clue
 * markers; this helper never selects a station through an exterior wall. */
export function nearestLodgeStation(x, z, insideId, raw, foundIds = [], radius = 1.55) {
  if (insideId !== 'lodge' || !Number.isFinite(x) || !Number.isFinite(z)) return null;
  const state = restoreLodgeSequenceState(raw, foundIds);
  let best = null;
  for (const station of LODGE_STATIONS) {
    const distance = Math.hypot(x - (-90 + station.x), z - (185 + station.z));
    if (distance > radius || (best && distance >= best.distance)) continue;
    const complete = state[COMPLETION_KEY[station.id]];
    best = { id: station.id, name: station.name, x: -90 + station.x,
      z: 185 + station.z, distance, complete,
      prompt: complete ? `Review ${station.name.toLowerCase()}` : `Inspect ${station.name.toLowerCase()}` };
  }
  return best;
}

function missingForDesk(state, found) {
  return {
    stationIds: ['shutter', 'lamp', 'folder'].filter((id) => !state[COMPLETION_KEY[id]]),
    evidenceIds: FINAL_EVIDENCE.filter((id) => !found.has(id)),
  };
}

export function getLodgeSequencePanel(raw, stationId, foundIds = []) {
  const state = restoreLodgeSequenceState(raw, foundIds);
  const found = foundSet(foundIds);
  const station = STATION_BY_ID[stationId];
  if (!station) return { stationId: null, title: 'No lodge station', text: 'Move closer to a fixture in the lodge.',
    actions: [], missingStationIds: [], missingEvidenceIds: [], complete: false };
  const complete = state[COMPLETION_KEY[stationId]];
  const base = { stationId, title: station.name, missingStationIds: [], missingEvidenceIds: [], complete };
  if (stationId === 'shutter') return {
    ...base,
    text: complete
      ? 'The shutter is held open against the stone jamb. The apparent moving light on the glass no longer follows its impact.'
      : station.prompt,
    actions: complete ? [] : [{ label: 'LATCH THE SHUTTER OPEN', action: { type: 'lodge.shutter', answer: 'latch_open' } }],
  };
  if (stationId === 'lamp') return {
    ...base,
    text: complete
      ? 'Turning the shade moved the extra glow across the pane while the distant harbor lights remained fixed. This room can create a false third light; it says nothing decisive about a sighting made at sea.'
      : station.prompt,
    actions: complete ? [] : [
      { label: 'TURN THE SHADE AWAY FROM THE GLASS', action: { type: 'lodge.lamp', answer: 'shade_away' } },
      { label: 'COVER THE HARBOR LIGHTS WITH YOUR HAND', action: { type: 'lodge.lamp', answer: 'cover_harbor' } },
    ],
  };
  if (stationId === 'folder') return {
    ...base,
    text: complete
      ? 'The folder holds a signed case summary and Mara’s earlier working carbon. The later official archive should confirm what was filed, but these sheets already show a change in her own wording.'
      : station.prompt,
    actions: complete ? [] : [{ label: 'TAKE THE WORKING CARBON TO THE DESK',
      action: { type: 'lodge.folder', answer: 'take_carbon' } }],
  };
  const missing = missingForDesk(state, found);
  const missingNames = [
    ...missing.stationIds.map((id) => STATION_BY_ID[id].name.toLowerCase()),
    ...missing.evidenceIds.map((id) => EVIDENCE_NAMES[id]),
  ];
  return {
    ...base, missingStationIds: missing.stationIds, missingEvidenceIds: missing.evidenceIds,
    text: complete
      ? 'Your working carbon reads “lamp status unresolved; obtain relay original.” That qualification was struck out before you signed the summary. The paper shows your decision to remove uncertainty; it does not establish whether the standby lamp was powered.'
      : missingNames.length
        ? `First examine ${missingNames.join(', ')}. The comparison is only meaningful after you can account for the reflection and the papers.`
        : 'Place the carbon beside the signed summary and Iris’s letter. Which change can these documents actually establish?',
    actions: complete || missingNames.length ? [] : [
      { label: 'MARA REMOVED AN UNRESOLVED STATUS', action: { type: 'lodge.desk', answer: 'qualification_removed' } },
      { label: 'THE STANDBY LAMP IS PROVEN ACTIVE', action: { type: 'lodge.desk', answer: 'lamp_proven_active' } },
      { label: 'IRIS WROTE THE OLD CONCLUSION', action: { type: 'lodge.desk', answer: 'iris_signed' } },
    ],
  };
}

export function applyLodgeSequenceAction(previous, action, foundIds = []) {
  const state = restoreLodgeSequenceState(previous, foundIds);
  const found = foundSet(foundIds);
  const result = (status, message, next = state, event = null) => ({ state: next, status, message, event });
  const entries = {
    'lodge.shutter': { key: 'shutterLatched', answer: 'latch_open',
      message: 'The latch catches. The shutter stops hammering the glass, leaving the real harbor lights steady beyond it.',
      event: 'lodge_shutter_latched' },
    'lodge.lamp': { key: 'lampRedirected', answer: 'shade_away',
      message: 'The extra pale glow travels with the lampshade. The fixed harbor pair does not move. You have found one local optical illusion, not an explanation for the captain’s view from the sea.',
      event: 'lodge_lamp_redirected' },
    'lodge.folder': { key: 'folderRetrieved', answer: 'take_carbon',
      message: 'The folder contains your signed summary and its working carbon. One handwritten line is crossed out. You bring both sheets to the comparison desk.',
      event: 'lodge_folder_retrieved' },
    'lodge.desk': { key: 'qualificationCompared', answer: 'qualification_removed',
      message: 'You wrote that lamp status was unresolved, then removed the warning before signing. The old file cannot show whether the standby circuit was live. The archive and original relay record must answer that.',
      event: 'lodge_case_compared' },
  };
  const entry = entries[action?.type];
  if (!entry) return result('blocked', 'Inspect one of the lodge fixtures first.');
  if (state[entry.key]) return result('unchanged', 'That part of the lodge investigation is already recorded.');
  if (entry.key === 'qualificationCompared') {
    const missing = missingForDesk(state, found);
    if (missing.stationIds.length || missing.evidenceIds.length) {
      return result('blocked', 'Inspect the shutter, lamp, case folder, Iris’s letter, and the wet window before comparing the papers.');
    }
  }
  const allowed = {
    'lodge.shutter': ['latch_open'],
    'lodge.lamp': ['shade_away', 'cover_harbor'],
    'lodge.folder': ['take_carbon'],
    'lodge.desk': ['qualification_removed', 'lamp_proven_active', 'iris_signed'],
  }[action.type];
  if (!allowed.includes(action.answer)) return result('blocked', 'Choose an action shown at this station.');
  if (action.answer !== entry.answer) {
    if (entry.key === 'lampRedirected') return result('mistake',
      'Covering the distant lights hides your reference. Move the nearby lamp instead and see which image follows it.');
    return result('mistake', 'The papers show a change to Mara’s wording, not what the old lamp circuit actually did.');
  }
  const next = { ...state, [entry.key]: true };
  return result(entry.key === 'qualificationCompared' ? 'complete' : 'changed',
    entry.message, next, entry.event);
}
