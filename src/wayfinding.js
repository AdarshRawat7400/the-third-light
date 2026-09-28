import { CLUES, SITES } from './story.js';

const DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

/** The tunnel is omitted from the field map until Mara can place it from evidence. */
export function availableMapSites({ chapter = 0, foundIds = [] } = {}) {
  const found = foundIds instanceof Set ? foundIds : new Set(foundIds);
  const tunnelKnown = chapter >= 3 &&
    (found.has('radio_route_verified') || found.has('tunnel_signal'));
  return SITES.filter((site) =>
    (site.id !== 'tunnel' || tunnelKnown)
    && (site.id !== 'headland_stake' || chapter >= 2));
}

export function restoreWaypointId(raw, context = {}) {
  if (typeof raw !== 'string') return null;
  return availableMapSites(context).some((site) => site.id === raw) ? raw : null;
}

const CLUE_BY_ID = new Map(CLUES.map((clue) => [clue.id, clue]));
const PHASE_SITE = Object.freeze({
  signing_memory: 'lodge',
  elias_account: 'radio',
  witness_finding: 'radio',
  iris_aftercare: 'tunnel',
  jetty_return: 'north_jetty',
});

/** An optional map hint, limited to a location the case has already earned. */
export function suggestMapLead(progress, context = {}) {
  if (!progress || progress.ready) return null;
  const sites = availableMapSites(context);
  const known = new Map(sites.map((site) => [site.id, site]));
  const found = context.foundIds instanceof Set ? context.foundIds
    : new Set(context.foundIds ?? []);
  if (context.chapter >= 3 && progress.reason === 'witness_finding'
    && !found.has('pump_service_order')) {
    const site = known.get('pump');
    return site ? { site, clueId: 'pump_service_order' } : null;
  }
  if (progress.reason === 'required_clues') {
    for (const clueId of progress.missingIds ?? []) {
      const clue = CLUE_BY_ID.get(clueId);
      if (!clue) continue;
      let siteId = clue.room ?? clue.nearSite ?? null;
      if (!siteId && Array.isArray(clue.world)) {
        const nearest = SITES.reduce((best, site) => {
          const distance = Math.hypot(site.x - clue.world[0], site.z - clue.world[1]);
          return !best || distance < best.distance ? { site, distance } : best;
        }, null);
        siteId = nearest?.site.id ?? null;
      }
      const site = known.get(siteId);
      if (site) return { site, clueId };
    }
  }
  const site = known.get(PHASE_SITE[progress.reason]);
  return site ? { site, clueId: null } : null;
}

/** A pencil bearing on the map; metres are straight line, never a route promise. */
export function describeWaypoint(id, x, z, context = {}) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const site = availableMapSites(context).find((candidate) => candidate.id === id);
  if (!site) return null;
  const dx = site.x - x;
  const dz = site.z - z;
  const bearingDegrees = ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
  return {
    site,
    distanceMeters: Math.round(Math.hypot(dx, dz)),
    bearingDegrees: Math.round(bearingDegrees) % 360,
    direction: DIRECTIONS[Math.floor((bearingDegrees + 11.25) / 22.5) % 16],
  };
}
