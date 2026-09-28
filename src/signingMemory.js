// Mara's recollection of a fixed past event, unlocked by her working carbon
// in Chapter 1. It records what she remembers doing under pressure; it does
// not let the player revise the old finding or infer the lamp circuit state.

export const SIGNING_MEMORY_VERSION = 1;
export const SIGNING_MEMORY_TRIGGER = 'lodge_working_carbon';

export const SIGNING_MEMORY_CUES = Object.freeze([
  Object.freeze({
    id: 'carbon',
    label: 'READ THE WORKING CARBON',
    text: 'The blue carbon smudged the side of your hand. Your own pencilled line read: “lamp status unresolved; obtain relay original.” It was still legible when you picked up the pen.',
    recap: 'Your carbon warned that lamp status was unresolved.',
  }),
  Object.freeze({
    id: 'closure',
    label: 'LISTEN TO THE CLOSURE BELL',
    text: 'The office bell marked the ferry cutoff. A stack of files waited for closure that day. You felt everyone waiting for a clean answer, though an unresolved source could have remained on a qualified finding.',
    recap: 'The deadline pressed you; it did not require an unqualified answer.',
  }),
  Object.freeze({
    id: 'sleeve',
    label: 'OPEN THE RELAY SLEEVE',
    text: 'You turned over the envelope marked ORIGINAL RELAY COLUMN. It was empty. The typed export was in the folder, but the machine strip was not. You cannot remember a relay reading you never saw.',
    recap: 'The original relay strip was missing from the packet.',
  }),
]);

const CUE_BY_ID = new Map(SIGNING_MEMORY_CUES.map((cue) => [cue.id, cue]));
const CUE_IDS = SIGNING_MEMORY_CUES.map((cue) => cue.id);
const DECISION_ANSWER = 'removed_warning_and_signed';
const LIMIT_ANSWER = 'circuit_unproved';

function foundSet(foundIds) {
  return foundIds instanceof Set ? foundIds : new Set(Array.isArray(foundIds) ? foundIds : []);
}

export function createSigningMemoryState() {
  return { version: SIGNING_MEMORY_VERSION, inspectedIds: [],
    decisionAcknowledged: false, limitAcknowledged: false };
}

/** Validate both sequence and Chapter 1 trigger when loading a save. Merely
 * collecting the carbon never marks a cue or conclusion as completed. */
export function restoreSigningMemoryState(raw, foundIds = []) {
  const state = createSigningMemoryState();
  if (!foundSet(foundIds).has(SIGNING_MEMORY_TRIGGER) || !raw || typeof raw !== 'object'
    || (raw.version !== undefined && raw.version !== SIGNING_MEMORY_VERSION)) return state;
  const requested = new Set(Array.isArray(raw.inspectedIds)
    ? raw.inspectedIds.filter((id) => typeof id === 'string' && CUE_BY_ID.has(id)) : []);
  state.inspectedIds = CUE_IDS.filter((id) => requested.has(id));
  const allCues = state.inspectedIds.length === CUE_IDS.length;
  state.decisionAcknowledged = allCues && raw.decisionAcknowledged === true;
  state.limitAcknowledged = state.decisionAcknowledged && raw.limitAcknowledged === true;
  return state;
}

export function signingMemoryMilestones(raw, foundIds = []) {
  const state = restoreSigningMemoryState(raw, foundIds);
  return {
    inspectedCount: state.inspectedIds.length,
    allCuesInspected: state.inspectedIds.length === CUE_IDS.length,
    decisionAcknowledged: state.decisionAcknowledged,
    limitAcknowledged: state.limitAcknowledged,
    complete: state.limitAcknowledged,
  };
}

/** One modal panel that begins with freely selectable recollection cues, then
 * asks the player to acknowledge the documented decision and its limit. */
export function getSigningMemoryPanel(raw, foundIds = []) {
  const found = foundSet(foundIds);
  const state = restoreSigningMemoryState(raw, found);
  const base = { title: 'The moment you signed', actions: [],
    inspectedIds: [...state.inspectedIds], complete: state.limitAcknowledged };
  if (!found.has(SIGNING_MEMORY_TRIGGER)) return {
    ...base, stage: 'locked',
    text: 'Read the working carbon in the keeper’s lodge before trying to recall the signing room.',
  };

  const remembered = SIGNING_MEMORY_CUES.filter((cue) => state.inspectedIds.includes(cue.id))
    .map((cue) => cue.recap).join(' ');
  if (state.inspectedIds.length < CUE_IDS.length) return {
    ...base, stage: 'cues',
    text: `This is a recollection of what happened seventeen years ago. Look closely at each detail before completing it.${remembered ? ` ${remembered}` : ''}`,
    actions: SIGNING_MEMORY_CUES.filter((cue) => !state.inspectedIds.includes(cue.id))
      .map((cue) => ({ label: cue.label, action: { type: 'memory.inspect', cueId: cue.id } })),
  };
  if (!state.decisionAcknowledged) return {
    ...base, stage: 'decision',
    text: `${remembered} The pen is in your hand. Which action did you actually take?`,
    actions: [
      { label: 'I ACCEPTED THE EXPORT, CROSSED OUT MY WARNING, AND SIGNED',
        action: { type: 'memory.decision', answer: DECISION_ANSWER } },
      { label: 'I KEPT THE WARNING ON THE SIGNED FINDING',
        action: { type: 'memory.decision', answer: 'kept_warning' } },
      { label: 'A SUPERVISOR ERASED MY WARNING AFTER I SIGNED',
        action: { type: 'memory.decision', answer: 'supervisor_erased' } },
      { label: 'I VERIFIED THE ORIGINAL RELAY STRIP FIRST',
        action: { type: 'memory.decision', answer: 'verified_original' } },
    ],
  };
  if (!state.limitAcknowledged) return {
    ...base, stage: 'limit',
    text: 'You remember the edit and the signature. You do not remember a machine reading that was absent from the packet. What can this memory establish?',
    actions: [
      { label: 'MY DECISION IS CERTAIN; THE LAMP STATUS IS NOT',
        action: { type: 'memory.limit', answer: LIMIT_ANSWER } },
      { label: 'THE STANDBY LAMP WAS DEFINITELY DISABLED',
        action: { type: 'memory.limit', answer: 'standby_disabled' } },
      { label: 'THE STANDBY LAMP WAS DEFINITELY LIT',
        action: { type: 'memory.limit', answer: 'standby_lit' } },
    ],
  };
  return {
    ...base, stage: 'complete',
    text: 'You accepted a typed status line, removed a warning you had written, and signed the finding under pressure. The memory establishes your choice. The actual lamp state still requires independent evidence.',
  };
}

/** Every action is a focus or interpretation of an event that already
 * happened. Wrong interpretations leave the state intact and are retryable. */
export function applySigningMemoryAction(previous, action, foundIds = []) {
  const found = foundSet(foundIds);
  const state = restoreSigningMemoryState(previous, found);
  const result = (status, message, next = state, event = null) => ({ state: next, status, message, event });
  if (!found.has(SIGNING_MEMORY_TRIGGER)) {
    return result('blocked', 'Read the working carbon in the keeper’s lodge before this recollection.');
  }
  if (state.limitAcknowledged) return result('unchanged', 'The recollection has already been recorded.');

  if (action?.type === 'memory.inspect') {
    const cue = CUE_BY_ID.get(action.cueId);
    if (!cue) return result('blocked', 'Choose one of the three details in the signing room.');
    if (state.inspectedIds.includes(cue.id)) return result('unchanged', 'You have already focused on that detail.');
    const next = { ...state, inspectedIds: CUE_IDS.filter((id) => id === cue.id || state.inspectedIds.includes(id)) };
    return result('changed', cue.text, next, 'signing_memory_cue');
  }

  if (state.inspectedIds.length < CUE_IDS.length) {
    return result('blocked', 'Examine the carbon, the closure bell, and the empty relay sleeve before completing the memory.');
  }
  if (action?.type === 'memory.decision') {
    if (state.decisionAcknowledged) return result('unchanged', 'Your actual decision is already acknowledged.');
    const allowed = [DECISION_ANSWER, 'kept_warning', 'supervisor_erased', 'verified_original'];
    if (!allowed.includes(action.answer)) return result('blocked', 'Choose a statement shown in the recollection.');
    if (action.answer !== DECISION_ANSWER) return result('mistake',
      'That would change the past. The carbon, the empty sleeve, and your signature record what you chose: you removed the warning and signed.');
    return result('changed',
      'You accepted the typed export as primary, crossed out your unresolved-status warning, and signed. The closure pressure was real; the pen and the edit were yours.',
      { ...state, decisionAcknowledged: true }, 'signing_memory_decision');
  }
  if (action?.type === 'memory.limit') {
    if (!state.decisionAcknowledged) return result('blocked', 'Acknowledge Mara’s actual signing decision first.');
    const allowed = [LIMIT_ANSWER, 'standby_disabled', 'standby_lit'];
    if (!allowed.includes(action.answer)) return result('blocked', 'Choose a statement shown in the recollection.');
    if (action.answer !== LIMIT_ANSWER) return result('mistake',
      'You cannot remember a relay reading from an original that was missing. The memory establishes your edit and signature, not whether the standby lamp operated.');
    return result('complete',
      'You remember choosing a clean answer over an unresolved one. That choice is documented; the old lamp state still needs independent proof.',
      { ...state, limitAcknowledged: true }, 'signing_memory_complete');
  }
  return result('blocked', 'Focus on a memory detail or one of the questions shown.');
}
