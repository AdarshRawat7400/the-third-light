// The daybreak return is played on foot after the signed correction has gone
// to the reopened inquiry. Mara can explain her decision; Iris controls her
// records, and the captain's family controls its response.

import { serializeChoiceRouteState } from './choiceRoutes.js';
import { maraDraftResponseEcho } from './maraDraftResponse.js';

export const JETTY_RETURN_VERSION = 1;

// These positions sit on the low, walkable north-inlet shelf. The rescue launch
// berths farther seaward at (-65, -342); the existing sounding is (-64, -318).
export const JETTY_RETURN_STATIONS = Object.freeze([
  Object.freeze({ id: 'berth', name: 'Berth rail', x: -77, z: -307, prompt: 'Check the quiet berth rail' }),
  Object.freeze({ id: 'case', name: 'Iris’s copy table', x: -70, z: -313, prompt: 'Check Iris’s family packet' }),
  Object.freeze({ id: 'family', name: 'Captain’s daughter', x: -57, z: -312, prompt: 'Speak to the captain’s daughter' }),
  Object.freeze({ id: 'receipt', name: 'Family handoff board', x: -64, z: -325, prompt: 'Witness Iris’s direct handoff' }),
]);

const STATION_BY_ID = new Map(JETTY_RETURN_STATIONS.map((station) => [station.id, station]));
const REQUIRED = Object.freeze([
  'launch_guided', 'iris_rescued', 'iris_handoff', 'daybreak_report',
  'lamp_strip', 'official_log', 'headland_view', 'east_ridge_view',
  'captain_statement', 'archive_draft_memo',
]);
const CUSTODY = new Set(['independent_hold_shared_copies', 'inquiry_originals_family_copies']);
const OPENINGS = new Set(['name_draft_first', 'invite_questions']);
const COSTS = new Set(['no_closure_owed', 'public_record_requested']);

function contextOf(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const ids = source.foundIds ?? source.found;
  const found = ids instanceof Set ? ids : new Set(Array.isArray(ids) ? ids : []);
  return {
    chapter: Number.isInteger(source.chapter) ? source.chapter : -1,
    found,
    reportSubmitted: source.reportSubmitted === true,
    routes: serializeChoiceRouteState(source.choiceRoutes),
  };
}

export function jettyReturnReady(context = {}) {
  const { chapter, found, reportSubmitted, routes } = contextOf(context);
  return chapter >= 5 && reportSubmitted && REQUIRED.every((id) => found.has(id))
    && routes.irisAsked && CUSTODY.has(routes.irisCustody);
}

export function createJettyReturnState() {
  return {
    version: JETTY_RETURN_VERSION,
    berth: null,
    case: null,
    opening: null,
    proof: null,
    cost: null,
    handoff: null,
  };
}

// The ordered prefix is the only saved progress. A forged later beat cannot
// bypass an earlier station or a missing custody/report prerequisite.
export function serializeJettyReturnState(raw) {
  const state = createJettyReturnState();
  if (!raw || typeof raw !== 'object' || raw.version !== JETTY_RETURN_VERSION) return state;
  if (raw.berth !== 'safe_berth_documented') return state;
  state.berth = raw.berth;
  if (raw.case !== 'family_copy_inventory') return state;
  state.case = raw.case;
  if (!OPENINGS.has(raw.opening)) return state;
  state.opening = raw.opening;
  if (raw.proof !== 'mechanism_and_limits') return state;
  state.proof = raw.proof;
  if (!COSTS.has(raw.cost)) return state;
  state.cost = raw.cost;
  if (raw.handoff === 'iris_direct_family_copy') state.handoff = raw.handoff;
  return state;
}

export function restoreJettyReturnState(raw, context = {}) {
  return jettyReturnReady(context) ? serializeJettyReturnState(raw) : createJettyReturnState();
}

export function jettyReturnMilestones(raw, context = {}) {
  const state = restoreJettyReturnState(raw, context);
  const completedBeats = ['berth', 'case', 'opening', 'proof', 'cost', 'handoff']
    .filter((id) => Boolean(state[id])).length;
  return { completedBeats, complete: state.handoff === 'iris_direct_family_copy' };
}

function currentBeat(state) {
  if (!state.berth) return 'berth';
  if (!state.case) return 'case';
  if (!state.opening || !state.proof || !state.cost) return 'family';
  if (!state.handoff) return 'receipt';
  return null;
}

function custodyText(context) {
  return contextOf(context).routes.irisCustody === 'inquiry_originals_family_copies'
    ? 'Iris checked the inquiry receipt and released the sealed originals herself. The family packet contains authenticated copies.'
    : 'Iris keeps the sealed originals independently until she checks an inquiry receipt. The family packet contains authenticated copies.';
}

export function jettyReturnSummary(raw, context = {}) {
  const state = restoreJettyReturnState(raw, context);
  if (!jettyReturnMilestones(state, context).complete) return null;
  const opening = state.opening === 'name_draft_first'
    ? 'Mara began by naming the warning she removed from her draft.'
    : 'Mara let the daughter set the order of questions, then named the warning she removed.';
  const cost = state.cost === 'public_record_requested'
    ? 'The daughter asked Mara to repeat her answer in the public inquiry record.'
    : 'The daughter said receiving a correction did not oblige the family to offer closure.';
  return [
    'NORTH INLET JETTY · FAMILY HANDOFF',
    'At the berth, Mara checked the line by which the rescue launch arrived. The jetty and present soundings corroborate the safe landing; they do not reproduce the captain’s view from the vessel seventeen years ago.',
    `Iris inventoried the direct family copy and controlled its custody. ${custodyText(context)}`,
    `The captain’s daughter heard the conflict between the mechanical strip and later typed export, and what the two field photographs establish about the bearings. ${opening} ${cost}`,
    'Iris handed an authenticated paper copy directly to the daughter. The board records delivery of documents, not agreement, forgiveness, or a final inquiry ruling.',
  ].join('\n\n');
}

function panel(stationId, title, text, actions = [], extra = {}) {
  return { stationId, title, text, actions, complete: false, missingStationIds: [], ...extra };
}

function waitingFor(beat) {
  return {
    berth: 'Check the berth rail where the launch came in.',
    case: 'Ask Iris to show the family copy inventory at her case table.',
    family: 'Speak with the captain’s daughter. She can set the pace of this conversation.',
    receipt: 'Go with Iris to the handoff board at the seaward end of the jetty.',
  }[beat];
}

export function nearestJettyReturnStation(x, z, insideId, raw, context = {}, radius = 2.5) {
  if (!jettyReturnReady(context) || insideId != null || !Number.isFinite(x) || !Number.isFinite(z)
    || !Number.isFinite(radius) || radius <= 0) return null;
  const state = restoreJettyReturnState(raw, context);
  let best = null;
  for (const station of JETTY_RETURN_STATIONS) {
    const distance = Math.hypot(x - station.x, z - station.z);
    if (distance > radius || (best && distance >= best.distance)) continue;
    best = {
      id: station.id, name: station.name, x: station.x, z: station.z,
      distance, complete: currentBeat(state) !== station.id && Boolean(
        station.id === 'berth' ? state.berth : station.id === 'case' ? state.case
          : station.id === 'family' ? state.cost : state.handoff),
      prompt: station.prompt,
    };
  }
  return best;
}

export function getJettyReturnPanel(raw, stationId, context = {}) {
  const state = restoreJettyReturnState(raw, context);
  if (!jettyReturnReady(context)) {
    return panel(stationId, 'A return still to make',
      'Bring Iris to safety, let her decide custody, and submit the signed correction before returning to the north jetty.');
  }
  const station = STATION_BY_ID.get(stationId);
  if (!station) return panel(stationId, 'North Inlet Jetty', 'Move closer to a station on the jetty.');
  const beat = currentBeat(state);
  if (beat && beat !== stationId) {
    const index = JETTY_RETURN_STATIONS.findIndex((entry) => entry.id === stationId);
    const nextIndex = JETTY_RETURN_STATIONS.findIndex((entry) => entry.id === beat);
    if (index > nextIndex) return panel(stationId, station.name, waitingFor(beat), [], { missingStationIds: [beat] });
  }
  if (stationId === 'berth') {
    if (state.berth) return panel(stationId, station.name,
      'The rescue launch reached this berth on the western main and lower front lights. Today’s soundings confirm a usable landing. Neither observation recreates the captain’s eyes on the wreck night.', [], { complete: true });
    return panel(stationId, 'The water is quiet now',
      'The launch lies against the seaward berth. Oren’s depth marks end at deep water; the shelf climbs toward the western reef. Mara can compare the landing with the line she gave the pilot, while keeping a present-day rescue separate from the captain’s old account.', [
        { label: 'Record the safe landing and its limit', action: { type: 'jetty.berth', answer: 'safe_berth_documented' } },
        { label: 'Say today’s arrival proves exactly what the captain saw', action: { type: 'jetty.berth', answer: 'proves_captain_view' } },
      ]);
  }
  if (stationId === 'case') {
    if (state.case) return panel(stationId, station.name,
      `Iris’s paper set matches the authenticated family copies sent through the verified line. ${custodyText(context)} The signed correction, Mara’s draft and signed old summary, and the captain’s testimony are listed separately.`, [], { complete: true });
    return panel(stationId, 'Check the packet before anyone speaks for it',
      `Iris lays out her inventory. The family already has the direct electronic copies she authorized; this sealed paper set can be checked in person. ${custodyText(context)} It also carries Mara’s signed correction, her crossed-out draft beside the old signed summary, and the captain’s statement.`, [
        { label: 'Log Iris’s authenticated copies and both versions of Mara’s finding', action: { type: 'jetty.case', answer: 'family_copy_inventory' } },
        { label: 'List Mara as owner of the original strip because she signed', action: { type: 'jetty.case', answer: 'mara_owns_originals' } },
        { label: 'Omit the old draft to make the packet easier to receive', action: { type: 'jetty.case', answer: 'omit_draft' } },
      ]);
  }
  if (stationId === 'family') {
    const heldEcho = maraDraftResponseEcho(context.maraDraftResponse, context);
    if (!state.opening) return panel(stationId, 'The captain’s daughter',
      `She came on the first civilian crossing after the storm cleared. At the dry end of the jetty she holds the old finding, folded soft at the crease. “I read your correction. My father kept asking why you called the second high light confusion. Tell me what changed.”${heldEcho ? ` ${heldEcho}` : ''}`, [
        { label: 'Name the warning Mara removed from her draft first', action: { type: 'jetty.opening', answer: 'name_draft_first' } },
        { label: 'Let her choose the order, while naming that warning', action: { type: 'jetty.opening', answer: 'invite_questions' } },
      ]);
    if (!state.proof) return panel(stationId, 'What the new sources can say',
      state.opening === 'name_draft_first'
        ? 'Mara says she wrote “lamp status unresolved; obtain relay original” and removed it before signing. The daughter does not thank her. “Then show me the reason you can change the finding now.”'
        : '“Start with the records,” the daughter says. Mara agrees, and tells her that the unresolved-lamp warning was in her draft but absent from the page she signed. “Now the records,” the daughter says.', [
        { label: 'Explain the strip, altered export, two bearings, and limits of the photographs', action: { type: 'jetty.proof', answer: 'mechanism_and_limits' } },
        { label: 'Claim the photographs prove his exact view from the deck', action: { type: 'jetty.proof', answer: 'photos_prove_deck' } },
        { label: 'Claim the strip establishes Elias’s intention to ground the ship', action: { type: 'jetty.proof', answer: 'strip_proves_intent' } },
      ]);
    if (!state.cost) return panel(stationId, 'Seventeen years under a single sentence',
      'Mara explains that the relay strip records both rear circuits active at 21:14; the later typed export contradicted it. The surveys show one line into deep water and another toward the reef, but cannot reproduce a deck view. The daughter closes the old finding. “You can amend a page. What am I meant to do with the years under it?”', [
        { label: 'Say that receiving the correction creates no duty to forgive', action: { type: 'jetty.cost', answer: 'no_closure_owed' } },
        { label: 'Offer to repeat Mara’s answer in the public inquiry record', action: { type: 'jetty.cost', answer: 'public_record_requested' } },
        { label: 'Ask her to call the matter settled so everyone can leave', action: { type: 'jetty.cost', answer: 'ask_closure' } },
      ]);
    return panel(stationId, 'A pause before the papers move',
      state.cost === 'public_record_requested'
        ? '“Say it where the finding was made,” she replies. Mara agrees. The daughter turns to Iris, who is holding the family copy. Neither woman asks Mara to handle the originals.'
        : '“I’ll read what you brought,” she says. “Please do not write that I forgave you.” Iris holds the family copy while the daughter makes room on the rail.', [], { complete: true });
  }
  if (state.handoff) return panel(stationId, 'A delivery, not a verdict',
    'Iris’s delivery record lists the pages received. The daughter takes the packet without signing away a question or promising forgiveness. The inquiry still has to decide the amended finding.', [],
  { complete: true, summaryText: jettyReturnSummary(state, context) });
  return panel(stationId, 'Iris makes the handoff',
    `Iris breaks the outer wax seal on the paper family set and checks the numbered pages against her inventory. ${custodyText(context)} The daughter asks for the crossed-out draft beside the old signed page. Iris has included both. A delivery line records the documents and date only.`, [
      { label: 'Witness Iris give the authenticated family copy directly', action: { type: 'jetty.handoff', answer: 'iris_direct_family_copy' } },
      { label: 'Give Iris’s originals to the family on Mara’s authority', action: { type: 'jetty.handoff', answer: 'mara_transfers_originals' } },
      { label: 'Ask the daughter to sign that the matter is settled', action: { type: 'jetty.handoff', answer: 'family_signs_closure' } },
    ]);
}

function result(state, status, message, context, event = null) {
  return { state, status, message, event, summaryText: jettyReturnSummary(state, context) };
}

export function applyJettyReturnAction(previous, action, context = {}) {
  const state = restoreJettyReturnState(previous, context);
  if (!jettyReturnReady(context)) return result(state, 'blocked',
    'Complete Iris’s custody decision and the signed correction before meeting the family at the jetty.', context);
  const beat = currentBeat(state);
  if (!beat) return result(state, 'unchanged', 'Iris’s family handoff is already documented.', context);
  const rules = {
    berth: { type: 'jetty.berth', key: 'berth', answer: 'safe_berth_documented',
      success: 'Mara notes the usable berth and the safe approach the launch followed, without turning today’s arrival into proof of an old deck view.',
      mistakes: { proves_captain_view: 'Today’s landing confirms today’s route. It cannot show exactly what the captain perceived on a different night.' } },
    case: { type: 'jetty.case', key: 'case', answer: 'family_copy_inventory',
      success: 'Iris checks her authenticated duplicate packet. Mara’s draft stays beside the old signed finding so the family can see the warning she removed.',
      mistakes: { mara_owns_originals: 'Mara’s signature does not grant custody of records Iris found and preserved.',
        omit_draft: 'The removed qualification is central to Mara’s responsibility. Omitting the draft would repeat the concealment.' } },
    family: !state.opening
      ? { type: 'jetty.opening', key: 'opening', answers: OPENINGS,
        success: 'The daughter sets down the old finding. She listens, but does not reassure Mara.', mistakes: {} }
      : !state.proof
        ? { type: 'jetty.proof', key: 'proof', answer: 'mechanism_and_limits',
          success: 'The daughter puts a finger on the two photographs. “So the mechanical strip answers whether the lamps ran. These show where a vessel could have been led. My father’s own account is still his.”',
          mistakes: { photos_prove_deck: 'The land surveys reproduce bearings from fixed island stakes. They cannot show the captain’s precise view aboard the vessel.',
            strip_proves_intent: 'The strip records circuit state at 21:14. It cannot record Elias’s intention.' } }
        : { type: 'jetty.cost', key: 'cost', answers: COSTS,
          success: 'Mara does not ask the daughter to resolve seventeen years in one conversation.',
          mistakes: { ask_closure: 'The daughter owes no statement of forgiveness or closure in return for a corrected record.' } },
    receipt: { type: 'jetty.handoff', key: 'handoff', answer: 'iris_direct_family_copy',
      success: 'Iris checks the page numbers and places the authenticated paper family set in the daughter’s hands. She records delivery only; the daughter takes the pages home to read.',
      mistakes: { mara_transfers_originals: 'Only Iris can authorize transfer of her originals. The family packet is made of authenticated copies.',
        family_signs_closure: 'A document receipt can attest delivery. It cannot demand agreement or forgiveness.' } },
  };
  const rule = rules[beat];
  if (action?.type !== rule.type) return result(state, 'blocked', waitingFor(beat), context);
  if (rule.mistakes[action?.answer]) return result(state, 'mistake', rule.mistakes[action.answer], context);
  const valid = rule.answers ? rule.answers.has(action?.answer) : action?.answer === rule.answer;
  if (!valid) return result(state, 'blocked', 'Choose one of the available responses at this station.', context);
  const next = { ...state, [rule.key]: action.answer };
  const complete = beat === 'receipt';
  return result(next, complete ? 'complete' : 'changed', rule.success, context,
    complete ? 'jetty_return_completed' : 'jetty_return_beat');
}
