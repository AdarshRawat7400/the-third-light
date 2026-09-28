// A returner's reminder, not a new source of evidence. Every specific claim
// below is gated by a clue the player has actually recorded.
function foundSet(ids) {
  return ids instanceof Set ? ids : new Set(Array.isArray(ids) ? ids : []);
}

export function caseRecap(foundIds = [], {
  signingMemoryComplete = false, arrivalNotes = [],
} = {}) {
  const found = foundSet(foundIds);
  const beats = [];
  const add = (title, source, text) => beats.push({ title, source, text });

  const crossingCount = Math.min(4, Array.isArray(arrivalNotes) ? arrivalNotes.length : 0);
  if (crossingCount > 0) add('The crossing', 'CROSSING NOTES',
    `Mara recorded ${crossingCount} of 4 observations aboard the ferry. They describe the present approach to Greywake, not the old wreck-night lamp state.`);

  if (found.has('iris_note')) add('Why Mara came', 'IRIS’S LETTER',
    'Iris wrote that the old typed lamp status conflicts with a physical strip she found. Her claim brought Mara to Greywake; the letter alone cannot establish which lamps burned.');
  if (found.has('window_reflection')) add('A misleading light in the lodge', 'FIELD OBSERVATION',
    'Rain-covered glass reflected a lamp inside the room and made another light appear. That explains the lodge view, not what the captain saw from open water.');
  if (found.has('lodge_working_carbon')) add('The qualification Mara removed', 'MARA’S WORKING CARBON',
    signingMemoryComplete
      ? 'Mara’s carbon warned that lamp status was unresolved. She remembers striking that warning before signing, under pressure to close the file. The recollection fixes her decision, not the wreck-night circuit state.'
      : 'Mara’s carbon warned that lamp status was unresolved. The signed summary omits that warning; the paper does not establish the wreck-night circuit state.');
  if (found.has('archive_signing_finding')) add('What was on the signing desk', 'ARCHIVE RECORDS',
    'The captain’s account and an absent relay original were part of the file Mara had. A later witness account cannot be placed on her desk retroactively.');
  if (found.has('archive_reconstruction')) add('How the archive copies diverged', 'DATED ARCHIVE COPIES',
    'The typed export and its later handling have different provenance. Their dates narrow what Mara could know when she signed; neither copy substitutes for the missing machine original.');

  const west = found.has('headland_view');
  const east = found.has('east_ridge_view');
  if (west || east) add('The measured island today', 'FIELD PHOTOGRAPHS',
    west && east
      ? 'Both fixed survey viewpoints are recorded. They show two distinct present-day leading-light lines; present geometry alone cannot prove which circuits ran on the wreck night.'
      : 'The ' + (west ? 'west' : 'east') + ' fixed survey viewpoint is recorded. A second bearing and the inlet chart are still needed before choosing a safe line.');
  if (found.has('alignment_solution')) add('The safe present-day bearing', 'SURVEY + DEPTH CHART',
    'The main rear and lower front pair leads through the north inlet. The eastern standby pair points toward the reef; a visually plausible line is not necessarily safe water.');
  if (found.has('radio_route_verified')) add('The voice on the island channel', 'SWITCHBOARD + LEDGER',
    'The intercepted calls came through the local island loop, not a verified mainland return. That route identifies the source of the calls; Elias’s motive still needs his account and records.');
  if (found.has('lamp_strip')) add('The old circuit at 21:14', 'ORIGINAL RELAY STRIP',
    'The punched original records both rear lamp circuits active at 21:14. It establishes lamp state, not who changed the later typed account or what anyone intended.');
  if (found.has('tunnel_signal') && !found.has('iris_rescued')) add('Iris beyond the service gate', 'DIRECT RESPONSE',
    'Iris answered the tap pattern from the tunnel. Mara can locate her, but must drain and release the gate safely before bringing her into the storm.');
  if (found.has('iris_rescued')) add('Iris is out', 'RESCUE OBSERVATION',
    'Iris crossed the drained service hatch alive with her sealed records. Her immediate safety and her choice about custody come before a formal statement.');
  if (found.has('daybreak_report')) add('The corrected finding', 'SIGNED CORRECTION',
    'Mara filed a correction that separates the relay strip, the two surveyed lines, her own removed warning, and unresolved questions of intent.');

  return beats.length ? beats : [{
    title: 'The case is beginning', source: 'FIELD JOURNAL',
    text: 'Mara came to Greywake after Iris Hale disappeared. No case observation has been entered yet; begin with the crossing and the keeper’s lodge.',
  }];
}
