// The survey is a visual observation, so moving mist must never turn a correct
// bearing into a timed puzzle. These deterministic offshore banks change what
// the player sees while leaving the camera's physical alignment rules alone.
const TAU = Math.PI * 2;
const BANKS = Object.freeze([
  { id: 'west', x: -186, z: -120, radius: 155, phase: 0.25 },
  { id: 'east', x: 232, z: -120, radius: 145, phase: 2.25 },
  { id: 'jetty', x: -65, z: -315, radius: 100, phase: 4.2 },
]);

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** Return a fog multiplier and a short, nonblocking camera cue. */
export function chapterThreeMist({ chapter, elapsed, x, z, indoors = false } = {}) {
  if (chapter !== 2 || indoors || ![elapsed, x, z].every(Number.isFinite)) {
    return { multiplier: 1, strength: 0, cue: '' };
  }
  let strongest = 0;
  let phase = 0;
  for (const bank of BANKS) {
    const distance = Math.hypot(x - bank.x, z - bank.z);
    const influence = 1 - smooth((distance - bank.radius * 0.38) / (bank.radius * 0.62));
    if (influence > strongest) {
      strongest = influence;
      phase = elapsed * TAU / 19 + bank.phase;
    }
  }
  if (strongest <= 0) return { multiplier: 1, strength: 0, cue: '' };

  // Slow offshore movement with smaller, irregular wisps. The clear state is
  // deliberately long enough to see both lamps, but capture never depends on
  // a particular phase of this visual effect.
  const broad = 0.5 + 0.5 * Math.cos(phase);
  const wisp = 0.5 + 0.5 * Math.sin(phase * 1.7 + 0.7);
  const strength = smooth((broad * 0.78 + wisp * 0.22 - 0.16) / 0.7);
  const multiplier = 1 + strongest * (0.68 + strength * 0.74 - 1);
  const cue = strength > 0.67 ? 'MIST CROSSING THE LINE'
    : strength < 0.28 ? 'MIST THINNING OVER THE INLET' : 'MIST MOVING OVER THE WATER';
  return { multiplier, strength: strength * strongest, cue };
}
