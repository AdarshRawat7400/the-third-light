// Persistent human choices for the inquiry. Evidence still determines the
// physical truth; these choices change who hears it when and how people react.
// The module is deliberately independent of rendering, timers, and save I/O.

export const CHOICE_ROUTES_VERSION = 1;

export const COMPLETE_PACKET_EVIDENCE = Object.freeze([
  'radio_patch', 'official_log', 'lamp_strip', 'headland_view', 'east_ridge_view',
]);

export const ELIAS_RECORDS_EVIDENCE = Object.freeze([
  'radio_patch', 'official_log', 'lamp_strip', 'pump_service_order',
]);

const DISCLOSURE_EVIDENCE = Object.freeze(['archive_draft_memo', 'official_log']);
const IRIS_CUSTODY_EVIDENCE = Object.freeze([
  'iris_rescued', 'lamp_strip', 'headland_view', 'east_ridge_view',
]);

const PACKET_TYPES = new Set(['early', 'complete']);
const ELIAS_ROUTES = new Set(['ask_account', 'show_records', 'public_radio']);
const HEARING_ROUTES = new Set(['volunteer', 'answer_when_asked']);
const CUSTODY_ROUTES = new Set(['independent_hold_shared_copies', 'inquiry_originals_family_copies']);

function contextOf(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const ids = source.foundIds instanceof Set ? source.foundIds : new Set(Array.isArray(source.foundIds) ? source.foundIds : []);
  return {
    found: ids,
    mainlandConnected: source.mainlandConnected === true,
    irisRescued: source.irisRescued === true,
    reportSubmitted: source.reportSubmitted === true,
    inquiryReceipt: source.inquiryReceipt === true,
  };
}

const hasEvery = (found, ids) => ids.every((id) => found.has(id));
const missing = (found, ids) => ids.filter((id) => !found.has(id));
const hasCompletePacket = (state) => state.initialPacket === 'complete' || state.supplementSent;

export function createChoiceRouteState() {
  return {
    version: CHOICE_ROUTES_VERSION,
    initialPacket: null,
    supplementSent: false,
    eliasRoute: null,
    eliasRecordsShown: false,
    oralDisclosure: null,
    irisAsked: false,
    irisCustody: null,
  };
}

// Save only canonical values. Old saves have no choiceRoutes field and load to
// the blank state; future or malformed versions do not acquire choices.
export function serializeChoiceRouteState(raw) {
  const state = createChoiceRouteState();
  if (!raw || typeof raw !== 'object' || raw.version !== CHOICE_ROUTES_VERSION) return state;
  if (PACKET_TYPES.has(raw.initialPacket)) state.initialPacket = raw.initialPacket;
  state.supplementSent = state.initialPacket === 'early' && raw.supplementSent === true;
  if (ELIAS_ROUTES.has(raw.eliasRoute)) state.eliasRoute = raw.eliasRoute;
  state.eliasRecordsShown = Boolean(state.eliasRoute) &&
    (state.eliasRoute === 'show_records' || raw.eliasRecordsShown === true);
  if (HEARING_ROUTES.has(raw.oralDisclosure)) state.oralDisclosure = raw.oralDisclosure;
  state.irisAsked = raw.irisAsked === true && CUSTODY_ROUTES.has(raw.irisCustody);
  if (state.irisAsked) state.irisCustody = raw.irisCustody;
  return state;
}

// A save cannot claim a route whose prerequisite evidence disappeared. The
// first packet remains "early" after later proof is found: timing is history.
export function restoreChoiceRouteState(raw, context = {}) {
  const source = serializeChoiceRouteState(raw);
  const state = createChoiceRouteState();
  const { found, mainlandConnected, irisRescued, reportSubmitted } = contextOf(context);
  if (mainlandConnected && found.has('radio_patch')) {
    if (source.initialPacket === 'early') state.initialPacket = 'early';
    if (source.initialPacket === 'complete' && hasEvery(found, COMPLETE_PACKET_EVIDENCE)) {
      state.initialPacket = 'complete';
    }
    state.supplementSent = state.initialPacket === 'early' && source.supplementSent &&
      hasEvery(found, COMPLETE_PACKET_EVIDENCE);
  }
  if (found.has('radio_patch') && source.eliasRoute) {
    if (source.eliasRoute !== 'show_records' || hasEvery(found, ELIAS_RECORDS_EVIDENCE)) {
      state.eliasRoute = source.eliasRoute;
      state.eliasRecordsShown = source.eliasRecordsShown && hasEvery(found, ELIAS_RECORDS_EVIDENCE);
    }
  }
  if (reportSubmitted && hasEvery(found, DISCLOSURE_EVIDENCE)) {
    state.oralDisclosure = source.oralDisclosure;
  }
  if (irisRescued && hasEvery(found, IRIS_CUSTODY_EVIDENCE) && source.irisAsked) {
    state.irisAsked = true;
    state.irisCustody = source.irisCustody;
  }
  return state;
}

export function choiceRouteConsequences(raw) {
  const state = serializeChoiceRouteState(raw);
  return {
    backupReadiness: state.initialPacket === 'early' ? 'launched_early'
      : state.initialPacket === 'complete' ? 'dispatched_with_verified_packet' : 'not_requested',
    eliasHeardBypass: state.initialPacket === 'early',
    mainlandHasFullPacket: hasCompletePacket(state),
    eliasStatement: state.eliasRoute === 'public_radio' ? 'refuses_to_sign'
      : state.eliasRecordsShown ? 'willing_to_sign_limited_facts'
        : state.eliasRoute === 'ask_account' ? 'unsigned_personal_account' : 'not_asked',
    oralHearing: state.oralDisclosure,
    irisCustody: state.irisCustody,
    // Neither route alters proof, rescue eligibility, or the required correction.
    rescueBlocked: false,
  };
}

function result(state, status, message, event = null) {
  return { state, status, message, event, consequences: choiceRouteConsequences(state) };
}

export function applyChoiceRouteAction(previous, action, context = {}) {
  const state = restoreChoiceRouteState(previous, context);
  const { found, mainlandConnected, irisRescued, reportSubmitted, inquiryReceipt } = contextOf(context);
  const type = action?.type;

  if (type === 'choice.packet.early' || type === 'choice.packet.complete') {
    if (!mainlandConnected || !found.has('radio_patch')) {
      return result(state, 'blocked', 'Reconnect the genuine mainland circuit after locating the island-loop patch.');
    }
    if (type === 'choice.packet.early') {
      if (state.initialPacket) return result(state, 'unchanged', 'The first packet has already gone to genuine mainland control.');
      const next = { ...state, initialPacket: 'early' };
      return result(next, 'changed', 'Mainland acknowledges the cut patch and missing technician. A backup launch begins preparing; the pilot will hold offshore for a confirmed bearing. Elias hears the bypassed channel.', 'mainland_initial_packet_sent');
    }
    const absent = missing(found, COMPLETE_PACKET_EVIDENCE);
    if (absent.length) return result(state, 'blocked', 'The full packet needs the typed log, mechanical strip, and both survey photographs.', null);
    if (state.initialPacket === 'complete' || state.supplementSent) {
      return result(state, 'unchanged', 'Mainland already has the mechanical strip and both surveyed bearings.');
    }
    if (state.initialPacket === 'early') {
      const next = { ...state, supplementSent: true };
      return result(next, 'changed', 'The strip, typed log, and two photographs reach mainland control as a supplement. The early rescue request remains on record.', 'mainland_evidence_supplement_sent');
    }
    const next = { ...state, initialPacket: 'complete' };
    return result(next, 'changed', 'Mainland receives a checked first packet: conflicting log and relay records, plus both surveyed bearings. A launch prepares while the pilot holds offshore.', 'mainland_initial_packet_sent');
  }

  if (type === 'choice.elias.ask_account' || type === 'choice.elias.show_records' || type === 'choice.elias.public_radio') {
    if (state.eliasRoute) return result(state, 'unchanged', 'Mara has already chosen how to approach Elias. She can still put the records to him later.');
    if (!found.has('radio_patch')) return result(state, 'blocked', 'Trace the supposed mainland voice to the island radio first.');
    if (type === 'choice.elias.show_records' && !hasEvery(found, ELIAS_RECORDS_EVIDENCE)) {
      return result(state, 'blocked', 'The service order and mechanical strip must be read beside the typed log before putting those records to Elias.');
    }
    const eliasRoute = type.slice('choice.elias.'.length);
    const next = { ...state, eliasRoute, eliasRecordsShown: eliasRoute === 'show_records' };
    const message = eliasRoute === 'show_records'
      ? 'Mara asks Elias to account for the order, relay strip, and contradictory typed line. He describes the failing main feed and will sign a narrow account of his own actions; his explanation does not erase them.'
      : eliasRoute === 'ask_account'
        ? 'Mara asks Elias privately why he used the island loop. He gives his account of fear and delay, but it remains testimony until the physical records are compared.'
        : 'Mara states on the open channel that the supposed shore-control voice came from the island. Elias withdraws from the exchange; the question of his intent remains open.';
    return result(next, 'changed', message, 'elias_confronted');
  }

  if (type === 'choice.elias.followup_records') {
    if (!state.eliasRoute) return result(state, 'blocked', 'Speak to Elias before returning with the records.');
    if (state.eliasRecordsShown) return result(state, 'unchanged', 'Elias has already been shown the records.');
    if (!hasEvery(found, ELIAS_RECORDS_EVIDENCE)) {
      return result(state, 'blocked', 'Collect the service order, mechanical strip, and typed log before asking Elias to address their mismatch.');
    }
    const next = { ...state, eliasRecordsShown: true };
    const message = state.eliasRoute === 'public_radio'
      ? 'Elias admits the standby action and changed line when shown the records, but refuses a signed statement after the public exchange. The physical evidence stands without his signature.'
      : 'With the records in front of him, Elias agrees to sign a limited account of the standby action and altered line. Mara records his words without treating his motive as proven.';
    return result(next, 'changed', message, 'elias_records_followup');
  }

  if (type === 'choice.disclosure.volunteer' || type === 'choice.disclosure.answer_when_asked') {
    if (state.oralDisclosure) return result(state, 'unchanged', 'Mara has already spoken at the hearing. Her signed written correction remains available to everyone.');
    if (!reportSubmitted || !hasEvery(found, DISCLOSURE_EVIDENCE)) {
      return result(state, 'blocked', 'Finish the signed correction and inspect Mara’s draft before the hearing.');
    }
    const oralDisclosure = type.slice('choice.disclosure.'.length);
    const next = { ...state, oralDisclosure };
    const message = oralDisclosure === 'volunteer'
      ? 'Mara opens by naming the qualification she removed. Iris and the family hear her take responsibility before a question forces it; the loss remains.'
      : 'The written correction already names Mara’s removed qualification. At the hearing she waits until the family asks before saying it aloud. They hear the truth, and they also notice the delay.';
    return result(next, 'changed', message, 'mara_hearing_disclosure');
  }

  if (type === 'choice.iris.ask') {
    if (state.irisAsked) return result(state, 'unchanged', 'Iris has already decided how her originals and copies will be handled.');
    if (!irisRescued || !hasEvery(found, IRIS_CUSTODY_EVIDENCE)) {
      return result(state, 'blocked', 'Rescue Iris and secure the strip and both survey photographs before discussing custody.');
    }
    // The player asks; Iris chooses. Without a verified inquiry receipt she
    // keeps the originals independently and shares copies with both parties.
    const release = inquiryReceipt && hasCompletePacket(state);
    const irisCustody = release ? 'inquiry_originals_family_copies' : 'independent_hold_shared_copies';
    const next = { ...state, irisAsked: true, irisCustody };
    const message = release
      ? 'Iris checks the inquiry receipt, seals the original strip and chart for the inquiry, and sends authenticated copies to the captain’s family. Mara does not take custody.'
      : 'Iris keeps the originals in independent sealed custody until the inquiry issues a receipt. She sends authenticated copies to the inquiry and directly to the captain’s family. Mara does not take custody.';
    return result(next, 'changed', message, 'iris_custody_decided');
  }

  if (type === 'choice.iris.release_after_receipt') {
    if (action?.actor !== 'iris') return result(state, 'blocked', 'Only Iris can authorize a change to the custody of her originals.');
    if (!state.irisAsked || state.irisCustody !== 'independent_hold_shared_copies') {
      return result(state, 'unchanged', 'No independently held originals are ready for transfer.');
    }
    if (!inquiryReceipt || !hasCompletePacket(state)) {
      return result(state, 'blocked', 'Iris waits for a verified inquiry receipt and a complete evidence packet.');
    }
    const next = { ...state, irisCustody: 'inquiry_originals_family_copies' };
    return result(next, 'changed', 'After checking the receipt herself, Iris releases the sealed originals to the inquiry. The family already has authenticated copies.', 'iris_originals_released');
  }

  return result(state, 'blocked', 'Choose an available conversation or evidence action.');
}

// View models contain only player-facing actions. The later custody transfer
// is an Iris NPC event, never an option on the player's panel.
export function getChoiceRoutePanel(previous, route, context = {}) {
  const state = restoreChoiceRouteState(previous, context);
  const { found, mainlandConnected, irisRescued, reportSubmitted } = contextOf(context);
  const panel = (title, text, actions = [], missingEvidenceIds = []) => ({
    title, text, actions, missingEvidenceIds, consequences: choiceRouteConsequences(state),
  });

  if (route === 'packet') {
    if (!mainlandConnected || !found.has('radio_patch')) {
      return panel('The genuine mainland line', 'Locate the island-loop patch and restore the genuine mainland circuit before transmitting.');
    }
    if (state.initialPacket === 'complete' || state.supplementSent) {
      return panel('Packet received', 'Mainland has the original relay record and both survey photographs. The pilot still needs a confirmed safe bearing.');
    }
    const absent = missing(found, COMPLETE_PACKET_EVIDENCE);
    const actions = [];
    if (!state.initialPacket) actions.push({ label: 'Send a limited alert now', action: { type: 'choice.packet.early' } });
    if (!absent.length) actions.push({ label: state.initialPacket === 'early' ? 'Send the complete evidence supplement' : 'Send a checked first packet', action: { type: 'choice.packet.complete' } });
    const text = state.initialPacket === 'early'
      ? 'The first alert requested backup without claiming what the lamps did. Send the records and both bearings once checked.'
      : 'A limited alert can summon backup now. A first packet with the relay strip and both photographs gives mainland a stronger statement, but the launch starts preparing later.';
    return panel('When to contact mainland', text, actions, absent);
  }

  if (route === 'elias') {
    if (!found.has('radio_patch')) return panel('The voice on the channel', 'Trace the supposed mainland voice to its source before confronting anyone.');
    if (state.eliasRoute) {
      const canFollowUp = !state.eliasRecordsShown && hasEvery(found, ELIAS_RECORDS_EVIDENCE);
      return panel('Elias’s account', state.eliasRecordsShown
        ? 'His response is on record beside the physical sources. His motive is still an account, not an established fact.'
        : 'A conversation does not replace the service order, relay strip, and typed line. Mara can return with those records.',
      canFollowUp ? [{ label: 'Put the records to Elias', action: { type: 'choice.elias.followup_records' } }] : [],
      state.eliasRecordsShown ? [] : missing(found, ELIAS_RECORDS_EVIDENCE));
    }
    const actions = [
      { label: 'Ask Elias for his account privately', action: { type: 'choice.elias.ask_account' } },
      { label: 'Identify the island voice on the open channel', action: { type: 'choice.elias.public_radio' } },
    ];
    if (hasEvery(found, ELIAS_RECORDS_EVIDENCE)) {
      actions.unshift({ label: 'Show Elias the service order and relay strip', action: { type: 'choice.elias.show_records' } });
    }
    return panel('How to confront Elias', 'Mara can hear his account or establish what the records show. Neither route proves he intended the grounding or Iris’s death.', actions);
  }

  if (route === 'disclosure') {
    if (!reportSubmitted || !hasEvery(found, DISCLOSURE_EVIDENCE)) {
      return panel('Mara’s hearing', 'The written correction and Mara’s draft must be on the record before she speaks at the hearing.', [], missing(found, DISCLOSURE_EVIDENCE));
    }
    if (state.oralDisclosure) return panel('Mara’s hearing', 'Mara answered for the qualification she removed. Her written correction remains in the inquiry record.');
    return panel('Mara’s hearing', 'The signed correction already names the qualification she removed. Will Mara say it aloud before she is asked?', [
      { label: 'Volunteer the removed qualification', action: { type: 'choice.disclosure.volunteer' } },
      { label: 'Answer when the family asks', action: { type: 'choice.disclosure.answer_when_asked' } },
    ]);
  }

  if (route === 'iris') {
    if (!irisRescued || !hasEvery(found, IRIS_CUSTODY_EVIDENCE)) {
      return panel('Iris’s records', 'Rescue Iris and secure the physical strip and both surveyed photographs before deciding a handoff.', [], missing(found, IRIS_CUSTODY_EVIDENCE));
    }
    if (state.irisAsked) return panel('Iris’s records', state.irisCustody === 'inquiry_originals_family_copies'
      ? 'Iris has personally released sealed originals to the inquiry and authenticated copies to the family.'
      : 'Iris holds the originals independently until she receives a verified inquiry receipt. The inquiry and family receive authenticated copies.');
    return panel('Iris’s records', 'Iris found and protected these sources. Ask how she wants the originals and copies delivered; Mara has no default claim to them.', [
      { label: 'Ask Iris to decide the evidence handoff', action: { type: 'choice.iris.ask' } },
    ]);
  }

  return panel('Inquiry choices', 'Choose a conversation at the appropriate scene.');
}
