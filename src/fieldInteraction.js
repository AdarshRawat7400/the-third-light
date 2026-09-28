// Resolve one on-foot E target for both the HUD prompt and the actual keypress.
// The optional Iris trail must not hide a nearby, unrecorded chapter objective.
export function closestFieldClue({
  clues, chapter, insideId, x, z, foundIds, mainlandConnected = false,
  positionFor,
}) {
  let result = null;
  let score = Infinity;
  for (const clue of clues) {
    if (chapter < clue.minChapter) continue;
    if (clue.room !== undefined && insideId !== clue.room) continue;
    const pos = positionFor(clue);
    const distance = Math.hypot(x - pos.x, z - pos.z);
    // Chapter 6 needs the already-recorded routing controls once more to
    // reconnect the mainland. Until then they are an active operation, not a
    // review clue; the nearby correction terminal is still available at its
    // own position and becomes preferred after the circuit is live.
    const activeRouting = chapter === 5 && clue.id === 'radio_route_verified'
      && !mainlandConnected;
    const candidateScore = distance + (foundIds.has(clue.id) && !activeRouting ? 20 : 0);
    if (distance < (clue.world ? 6 : 3.25) && candidateScore < score) {
      result = clue;
      score = candidateScore;
    }
  }
  return result;
}

export function selectFieldInteraction({
  clue = null, clueDistance = Infinity, requiredClue = false,
  person = null, prisonPerson = null, vehicle = null, lodgeStation = null,
  signingStation = null, irisStation = null, towerStation = null,
  witnessStation = null, jettyStation = null, chronologyStation = null,
} = {}) {
  const candidates = [
    { kind: 'lodge', target: lodgeStation, distance: lodgeStation?.distance ?? Infinity, tie: 0 },
    { kind: 'signing', target: signingStation, distance: signingStation?.distance ?? Infinity, tie: 1 },
    { kind: 'tower', target: towerStation, distance: towerStation?.distance ?? Infinity, tie: 2 },
    { kind: 'irisTrail', target: irisStation, distance: irisStation?.distance ?? Infinity, tie: 3 },
    { kind: 'witness', target: witnessStation, distance: witnessStation?.distance ?? Infinity, tie: 4 },
    { kind: 'jetty', target: jettyStation, distance: jettyStation?.distance ?? Infinity, tie: 5 },
    { kind: 'chronology', target: chronologyStation,
      distance: chronologyStation?.distance ?? Infinity, tie: 5.5 },
    { kind: 'clue', target: clue, distance: clue ? clueDistance : Infinity, tie: 6 },
    { kind: 'person', target: person, distance: person?.distance ?? Infinity, tie: 7 },
    { kind: 'prisonPerson', target: prisonPerson,
      distance: prisonPerson?.distance ?? Infinity, tie: 8 },
    { kind: 'vehicle', target: vehicle, distance: vehicle?.distance ?? Infinity, tie: 9 },
  ];
  const available = candidates.filter((candidate) => candidate.target
    && Number.isFinite(candidate.distance) && candidate.distance >= 0
    && !(requiredClue && ['irisTrail', 'tower', 'witness', 'jetty', 'chronology', 'prisonPerson']
      .includes(candidate.kind)));
  available.sort((a, b) => a.distance - b.distance || a.tie - b.tie);
  return available[0] ?? null;
}
