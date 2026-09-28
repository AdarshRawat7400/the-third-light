import { CLUES } from './story.js';

// The case board presents questions, not answers. Evidence is compared only
// when the player explicitly links cards to a proposition.
export const DEDUCTIONS = Object.freeze([
  {
    id: 'false_light',
    title: 'The third light',
    prompt: 'Could a real lamp have created the extra light the captain described?',
    minChapter: 2,
    evidenceIds: ['headland_view', 'east_ridge_view', 'tower_panel'],
    requiresIds: [],
    conclusion: 'Two rear lamps could align with the same front light. The western main pair marked the deep inlet; the eastern standby pair led toward the reef.',
    explanation: 'The two photographs establish different bearings. The tower panel proves that the standby lamp was physically connected and could be lit. A window reflection cannot explain a sighting from a ship at sea.',
    wrongEvidenceMessage: 'The selected cards do not establish both seaward bearings and whether the standby lamp could operate. Compare the field views with the tower hardware.',
  },
  {
    id: 'altered_log',
    title: 'The official account',
    prompt: 'Does the typed accident record match the lamp machinery?',
    minChapter: 1,
    evidenceIds: ['official_log', 'lamp_strip'],
    requiresIds: [],
    conclusion: 'The typed export says the standby lamp was disabled at 21:14. The relay’s mechanical strip records both rear lamps active. The typed entry was altered.',
    explanation: 'The two records describe the same minute. The punched strip was produced by the relay itself, independently of the later typed export.',
    wrongEvidenceMessage: 'This needs a comparison of the official entry with a record made by the lamp circuit at the same time.',
  },
  {
    id: 'local_radio_voice',
    title: 'The voice on the radio',
    prompt: 'Where was the reassuring “shore control” voice transmitting from, and what was it concealing?',
    minChapter: 3,
    evidenceIds: ['radio_patch', 'tunnel_signal'],
    requiresIds: [],
    conclusion: 'The “shore control” voice was transmitted locally, while Iris was locked in the service tunnel. Its warnings were meant to steer the investigation away from her.',
    explanation: 'The mainland patch was unplugged while transmissions continued through a local microphone. Iris’s testimony at the hatch establishes what the speaker had reason to hide.',
    wrongEvidenceMessage: 'A suspicious voice alone does not locate its transmitter or establish what it was hiding. Trace the radio connection and check Iris’s location.',
  },
  {
    id: 'rescue_bearing',
    title: 'The safe line',
    prompt: 'Backup power has lit the standby lamp. Which pair should the rescue launch follow?',
    minChapter: 4,
    evidenceIds: ['headland_view', 'east_ridge_view', 'pump_power'],
    requiresIds: ['false_light'],
    conclusion: 'Tell the launch to hold offshore, then align the lower front light with the western main rear lamp. The eastern standby pair now lit by backup power points toward the reef.',
    explanation: 'Both survey views establish where their alignments run; the pump circuit explains why the dangerous standby line is visible again during the rescue.',
    wrongEvidenceMessage: 'The rescue decision needs the two surveyed routes and the current state of the backup circuit.',
  },
  {
    id: 'responsibility',
    title: 'The finding Mara signed',
    prompt: 'What part of the old finding can Mara honestly take responsibility for?',
    minChapter: 4,
    evidenceIds: ['official_log', 'captain_statement', 'lamp_strip'],
    requiresIds: ['altered_log'],
    conclusion: 'Mara did not operate the misleading lamp, but she signed a finding based on an altered record and dismissed the captain’s accurate testimony. Her error helped keep the truth buried.',
    explanation: 'Her signature and marginal note are on the old file. The relay strip now corroborates the captain on the point she labeled uncorroborated.',
    wrongEvidenceMessage: 'This conclusion needs Mara’s own actions in the file, the testimony she dismissed, and independent proof that the testimony was right.',
  },
].map((entry) => Object.freeze({
  ...entry,
  evidenceIds: Object.freeze([...entry.evidenceIds]),
  requiresIds: Object.freeze([...entry.requiresIds]),
})));

const deductionById = new Map(DEDUCTIONS.map((entry) => [entry.id, entry]));
const knownEvidence = new Set(CLUES.map((clue) => clue.id));

function idSet(value) {
  return new Set((value instanceof Set || Array.isArray(value) ? [...value] : [])
    .filter((id) => typeof id === 'string'));
}

function savedIds(saved) {
  if (Array.isArray(saved)) return saved;
  if (saved && typeof saved === 'object' && (saved.version === undefined || saved.version === 1)) {
    return saved.solvedIds;
  }
  return [];
}

// Hydration never infers a solution from collected clues. It only restores
// explicitly solved propositions and removes corrupt/stale save entries.
export function createDeductionState(saved = null, discoveredIds = []) {
  const found = idSet(discoveredIds);
  const requested = idSet(savedIds(saved));
  const solvedIds = [];
  for (const deduction of DEDUCTIONS) {
    if (!requested.has(deduction.id)) continue;
    if (!deduction.evidenceIds.every((id) => found.has(id))) continue;
    if (!deduction.requiresIds.every((id) => solvedIds.includes(id))) continue;
    solvedIds.push(deduction.id);
  }
  return { solvedIds };
}

export function serializeDeductionState(state) {
  const requested = idSet(state?.solvedIds);
  return {
    version: 1,
    solvedIds: DEDUCTIONS.filter((deduction) => requested.has(deduction.id)).map((deduction) => deduction.id),
  };
}

export function isDeductionSolved(state, deductionId) {
  return idSet(state?.solvedIds).has(deductionId);
}

export function getAvailableDeductions(state, discoveredIds, chapter = Infinity) {
  const found = idSet(discoveredIds);
  const solved = idSet(state?.solvedIds);
  const currentChapter = Number.isFinite(chapter) ? chapter : Infinity;
  return DEDUCTIONS.filter((deduction) => deduction.minChapter <= currentChapter).map((deduction) => ({
    ...deduction,
    solved: solved.has(deduction.id),
    discoveredCount: deduction.evidenceIds.filter((id) => found.has(id)).length,
    ready: deduction.evidenceIds.every((id) => found.has(id))
      && deduction.requiresIds.every((id) => solved.has(id)),
  }));
}

// Result shape stays identical for success and failure so the UI can always
// display a specific explanation and replace its in-memory state safely.
export function attemptDeduction(state, deductionId, selectedIds, discoveredIds) {
  const nextState = createDeductionState(state, discoveredIds);
  const deduction = deductionById.get(deductionId) ?? null;
  function result(status, message, accepted = false) {
    return { state: nextState, status, accepted, message, deduction };
  }

  if (!deduction) return result('unknown-deduction', 'This question is not in the case file.');
  if (nextState.solvedIds.includes(deduction.id)) return result('already-solved', deduction.conclusion);

  const missingPrerequisite = deduction.requiresIds.find((id) => !nextState.solvedIds.includes(id));
  if (missingPrerequisite) {
    const earlier = deductionById.get(missingPrerequisite);
    return result('missing-prerequisite', `Settle “${earlier.title}” before drawing this conclusion.`);
  }

  if (!Array.isArray(selectedIds) || selectedIds.some((id) => typeof id !== 'string')) {
    return result('invalid-selection', 'Choose evidence cards from the case file.');
  }
  const selected = [...new Set(selectedIds)];
  if (selected.length === 0) return result('no-evidence', 'Select the records that support this conclusion.');

  const found = idSet(discoveredIds);
  if (selected.some((id) => !knownEvidence.has(id))) {
    return result('invalid-selection', 'One selected card is not in the case file.');
  }
  if (selected.some((id) => !found.has(id))) {
    return result('undiscovered-evidence', 'Inspect each selected record in the world before using it here.');
  }
  if (selected.length < deduction.evidenceIds.length) {
    return result('insufficient-evidence', 'The selected records leave an important part of this question unsupported.');
  }
  if (selected.length > deduction.evidenceIds.length) {
    return result('excess-evidence', 'Narrow the links to the records that directly establish this point.');
  }
  if (!deduction.evidenceIds.every((id) => selected.includes(id))) {
    return result('wrong-evidence', deduction.wrongEvidenceMessage);
  }

  nextState.solvedIds.push(deduction.id);
  return {
    state: nextState,
    status: 'solved',
    accepted: true,
    message: `${deduction.conclusion} ${deduction.explanation}`,
    deduction,
  };
}
