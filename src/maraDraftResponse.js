// Mara writes a present-day, unsent working statement at the archive desk.
// The signing memory establishes a fixed past decision; the source comparison
// establishes its limits. This scene is her response, not new wreck-night proof.
export const MARA_DRAFT_RESPONSE_VERSION = 1;
export const MARA_DRAFT_RESPONSE_EVIDENCE = Object.freeze([
  'lodge_working_carbon', 'official_log', 'captain_statement',
  'archive_draft_memo', 'archive_revision_stamp', 'archive_witness_addendum',
  'archive_chart', 'archive_signing_finding', 'archive_reconstruction',
]);

const PAGE_ORDERS = Object.freeze(['draft_first', 'captain_first']);
const FUTURE_ADDRESSES = Object.freeze(['leave_family_space', 'offer_account_later']);
const PLACEMENTS = Object.freeze(['field_journal', 'working_case_folder']);
const ADMISSION = 'own_removed_warning';
const LIMIT = 'old_circuit_unresolved';

function foundSet(value) {
  return value instanceof Set ? value : new Set(Array.isArray(value) ? value : []);
}

function contextOf(context = {}) {
  return {
    chapter: Number.isInteger(context.chapter) ? context.chapter : -1,
    found: foundSet(context.foundIds),
    atArchive: context.atArchive === true,
  };
}

export function maraDraftResponseReady(context = {}) {
  const { chapter, found } = contextOf(context);
  return chapter >= 1 && MARA_DRAFT_RESPONSE_EVIDENCE.every((id) => found.has(id));
}

export function createMaraDraftResponseState() {
  return {
    version: MARA_DRAFT_RESPONSE_VERSION,
    pageOrder: null,
    admission: null,
    limit: null,
    futureAddress: null,
    placement: null,
  };
}

// Only an ordered prefix of actual choices is restorable. Chapter start slots
// keep the completed archive evidence but never invent Mara's private response.
export function serializeMaraDraftResponseState(raw) {
  const state = createMaraDraftResponseState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || raw.version !== MARA_DRAFT_RESPONSE_VERSION) return state;
  if (!PAGE_ORDERS.includes(raw.pageOrder)) return state;
  state.pageOrder = raw.pageOrder;
  if (raw.admission !== ADMISSION) return state;
  state.admission = raw.admission;
  if (raw.limit !== LIMIT) return state;
  state.limit = raw.limit;
  if (!FUTURE_ADDRESSES.includes(raw.futureAddress)) return state;
  state.futureAddress = raw.futureAddress;
  if (PLACEMENTS.includes(raw.placement)) state.placement = raw.placement;
  return state;
}

export function restoreMaraDraftResponseState(raw, context = {}) {
  return maraDraftResponseReady(context)
    ? serializeMaraDraftResponseState(raw) : createMaraDraftResponseState();
}

export function maraDraftResponseMilestones(raw, context = {}) {
  const state = restoreMaraDraftResponseState(raw, context);
  const completedBeats = ['pageOrder', 'admission', 'limit', 'futureAddress', 'placement']
    .filter((field) => Boolean(state[field])).length;
  return { completedBeats, complete: completedBeats === 5 };
}

export function maraHeldStatementText(raw, context = {}) {
  const state = restoreMaraDraftResponseState(raw, context);
  if (!state.pageOrder) return null;
  const lines = ['GREYWAKE · WORKING STATEMENT',
    'M. Vale · Provisional, held; not sent to the family or inquiry'];
  if (state.admission) {
    lines.push('I removed “lamp status unresolved; obtain relay original” from my own draft, accepted the typed export, and signed while the original was absent. I also marked the captain’s second-high-light account possible stress confusion. The deadline did not require that certainty.');
  }
  if (state.limit) {
    lines.push('The archive can document my decision and justify reopening the finding. These pages cannot establish which rear lamp circuits operated at 21:14. That question needs the independent original relay record.');
  }
  if (state.futureAddress) {
    lines.push(state.futureAddress === 'leave_family_space'
      ? 'If I offer this account to the family, they may ask questions or decline it. I will not ask them to relieve me of it.'
      : 'After the independent record is checked, I can offer this account and answer questions. An offer is not a request for forgiveness or closure.');
  }
  return lines.join('\n\n');
}

export function maraDraftResponseSummary(raw, context = {}) {
  const state = restoreMaraDraftResponseState(raw, context);
  if (!state.placement) return null;
  const opening = state.pageOrder === 'draft_first'
    ? 'Mara began with the qualification she crossed out.'
    : 'Mara began with the captain’s account she had labeled confusion.';
  const placement = state.placement === 'field_journal'
    ? 'She kept the provisional statement in her field journal.'
    : 'She clipped the provisional statement behind the old signed page in her working case folder.';
  return [
    'ARCHIVE DESK · MARA’S HELD STATEMENT',
    `${opening} She named both choices, the missing original, and the deadline she could have qualified rather than obeyed with false certainty.`,
    'The archive records warrant reopening the finding; they do not establish the wreck-night lamp state. The statement is Mara’s present-day account, not a machine source or a new witness.',
    `${placement} It has not been sent to the family or inquiry. Any signed public correction must stand on independent evidence, and the family owes no answer to this private rehearsal.`,
  ].join('\n\n');
}

// A short, source-bound line for a later family scene. It can acknowledge that
// Mara prepared words here without implying the family received them.
export function maraDraftResponseEcho(raw, context = {}) {
  const state = restoreMaraDraftResponseState(raw, context);
  if (!state.placement) return '';
  const opening = state.pageOrder === 'draft_first'
    ? 'At the archive Mara began a held statement with the warning she removed. It was never sent in place of a corrected finding.'
    : 'At the archive Mara began a held statement with the captain’s account she had dismissed. It was never sent in place of a corrected finding.';
  return `${opening} ${state.futureAddress === 'leave_family_space'
    ? 'She left the family free to refuse her account.'
    : 'She prepared to offer an account after the independent record was checked, without asking for forgiveness.'}`;
}

const button = (label, type, answer) => ({ label, action: { type, answer } });

export function getMaraDraftResponsePanel(raw, context = {}) {
  const state = restoreMaraDraftResponseState(raw, context);
  const base = { complete: Boolean(state.placement),
    statementText: maraHeldStatementText(state, context),
    summaryText: maraDraftResponseSummary(state, context) };
  if (!maraDraftResponseReady(context)) return {
    ...base, title: 'The space after the report',
    text: 'Finish the signing-room finding and compare the archive sources before Mara writes from them.',
    actions: [],
  };
  if (!state.pageOrder) return {
    ...base, title: 'Two pages still open',
    text: 'The rain reaches the archive panes. Mara has put her crossed draft beside the captain’s statement and the page she signed. Her old words cannot be unwritten. She can choose where to begin an unsent statement, but both pages must remain in view.',
    actions: [
      button('Begin with the warning I struck from my draft', 'draft.pageOrder', 'draft_first'),
      button('Begin with the captain’s account I called confusion', 'draft.pageOrder', 'captain_first'),
    ],
  };
  if (!state.admission) return {
    ...base, title: state.pageOrder === 'draft_first' ? 'The line under the strike' : 'The margin in my hand',
    text: state.pageOrder === 'draft_first'
      ? 'The pencil qualification survives on the working carbon. Her signed finding does not carry it. The closure bell did ring; the routing docket still allowed unresolved sources. Mara rests her pen above a fresh sheet.'
      : '“Uncorroborated. Possible stress confusion.” Her handwriting follows the captain’s description of two high lights. The typed export was present; the relay original was not. The draft on the other side had asked for it.',
    actions: [
      button('Name my removed warning, my margin note, and my signature', 'draft.admission', ADMISSION),
      button('Say the office required me to erase the warning', 'draft.admission', 'office_forced'),
      button('Say I checked the relay original before I signed', 'draft.admission', 'original_checked'),
    ],
  };
  if (!state.limit) return {
    ...base, title: 'Leave one sentence unfinished',
    text: 'The first paragraph is Mara’s admission, not a new observation of the old circuit. She wants the case to make sense at once. The stamp on the later export and the original absent from this archive file leave a blank these pages cannot fill: which rear circuits actually ran at 21:14?',
    actions: [
      button('Leave the old circuit state open for the relay original', 'draft.limit', LIMIT),
      button('Write that the archive proves the standby lamp was lit', 'draft.limit', 'standby_proven_lit'),
      button('Write that the typed export proves it was off', 'draft.limit', 'standby_proven_off'),
    ],
  };
  if (!state.futureAddress) return {
    ...base, title: 'A person beyond the case number',
    text: 'The captain’s family lived with Mara’s sentence for seventeen years. No one in this room can ask them to receive a provisional account. Mara can decide what she is willing to say if she offers an account after the physical record is checked.',
    actions: [
      button('Leave them room to question me or decline the account', 'draft.futureAddress', 'leave_family_space'),
      button('Offer a full account later without asking for forgiveness', 'draft.futureAddress', 'offer_account_later'),
      button('Ask them to call the case closed when I explain', 'draft.futureAddress', 'demand_closure'),
    ],
  };
  if (!state.placement) return {
    ...base, title: 'Held, not transmitted',
    text: 'The page names the edit, the witness Mara diminished, and the machine source absent when she signed. It is a present-day working statement. Sending it as if it settled the old circuit would repeat her original error. Where will she keep it, distinct from the independent record and any public correction?',
    actions: [
      button('Keep the provisional statement in my field journal', 'draft.placement', 'field_journal'),
      button('Clip it behind the signed page in my working case folder', 'draft.placement', 'working_case_folder'),
      button('Send it as the final corrected finding now', 'draft.placement', 'send_final_now'),
    ],
  };
  return {
    ...base, title: 'A page she will have to stand behind',
    text: 'Mara closes the working folder without hiding either version of her words. The held statement cannot tell her which lamps ran on the wreck night. The case needs the original record and a public correction that does not ask the family for an easy ending.',
    actions: [],
  };
}

function result(state, status, message, event = null) {
  return { state, status, message, event };
}

export function applyMaraDraftResponseAction(previous, action, context = {}) {
  const state = restoreMaraDraftResponseState(previous, context);
  if (!maraDraftResponseReady(context)) return result(state, 'blocked',
    'Reconstruct the signing decision and compare the archive sources first.');
  if (!contextOf(context).atArchive) return result(state, 'blocked',
    'Return to the archive desk to write beside the original case pages.');
  if (state.placement) return result(state, 'unchanged', 'The provisional statement is already held with Mara’s case notes.');
  if (!state.pageOrder) {
    if (action?.type !== 'draft.pageOrder' || !PAGE_ORDERS.includes(action.answer)) {
      return result(state, 'blocked', 'Choose which of the two existing pages Mara faces first.');
    }
    return result({ ...state, pageOrder: action.answer }, 'changed',
      action.answer === 'draft_first'
        ? 'Mara turns the crossed warning toward herself. The captain’s margin remains beside it.'
        : 'Mara turns the captain’s statement toward herself. The struck qualification remains beside it.',
      'mara_draft_beat');
  }
  if (!state.admission) {
    if (action?.type !== 'draft.admission') return result(state, 'blocked', 'Name Mara’s documented edit before moving on.');
    if (action.answer === 'office_forced') return result(state, 'mistake',
      'The closure deadline was real, but the docket allowed a qualified finding. Mara crossed out her own warning.');
    if (action.answer === 'original_checked') return result(state, 'mistake',
      'The sleeve for the original relay column was empty when Mara signed. She cannot claim to have checked it.');
    if (action.answer !== ADMISSION) return result(state, 'blocked', 'Choose a statement grounded in the signed and draft pages.');
    return result({ ...state, admission: ADMISSION }, 'changed',
      'Mara speaks the removed qualification, the captain’s margin, and her signature without blaming an absent supervisor.',
      'mara_draft_beat');
  }
  if (!state.limit) {
    if (action?.type !== 'draft.limit') return result(state, 'blocked', 'Leave the missing machine source visible first.');
    if (action.answer === 'standby_proven_lit') return result(state, 'mistake',
      'The archive shows a possible second alignment and a later reprint. It cannot establish the old switch state.');
    if (action.answer === 'standby_proven_off') return result(state, 'mistake',
      'A typed export is not the original relay record. Mara cannot use it again to erase the unresolved status.');
    if (action.answer !== LIMIT) return result(state, 'blocked', 'State the limit the archive records actually have.');
    return result({ ...state, limit: LIMIT }, 'changed',
      'The working statement leaves the 21:14 circuit state unresolved. Only the original relay record can answer that separate question.',
      'mara_draft_beat');
  }
  if (!state.futureAddress) {
    if (action?.type !== 'draft.futureAddress') return result(state, 'blocked', 'Decide what this account may ask of the family.');
    if (action.answer === 'demand_closure') return result(state, 'mistake',
      'A corrected record cannot obligate the family to forgive, answer, or call the loss settled.');
    if (!FUTURE_ADDRESSES.includes(action.answer)) return result(state, 'blocked', 'Choose an available, honest intention.');
    return result({ ...state, futureAddress: action.answer }, 'changed',
      'Mara leaves the family’s response to the family. Her account is something she must be prepared to give, not trade for relief.',
      'mara_draft_beat');
  }
  if (action?.type !== 'draft.placement') return result(state, 'blocked', 'Keep this working statement clearly separate from a final finding.');
  if (action.answer === 'send_final_now') return result(state, 'mistake',
    'This is a provisional account of Mara’s decision, not a corrected accident finding. It needs the old relay original and an independent bearing survey before public transmission.');
  if (!PLACEMENTS.includes(action.answer)) return result(state, 'blocked', 'Choose where Mara keeps the unsent statement.');
  return result({ ...state, placement: action.answer }, 'complete',
    'Mara keeps the statement with her working notes. The old signed page and struck draft remain intact for the inquiry.',
    'mara_draft_response_complete');
}
