// Storm fronts move in short clusters rather than firing one isolated bolt at
// long, even intervals. This clock is independent of frame rate and creates no
// renderer objects, so the same schedule works after a brief dropped frame.
const smoothstep = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function rainSquallStrength(secondsInRain) {
  // A brief front crosses the island roughly once per minute in rainy chapters.
  const front = secondsInRain - 17;
  if (front < 0) return 0;
  const phase = front % 56;
  return smoothstep(0, 2.2, phase) * (1 - smoothstep(10.5, 13.5, phase));
}

export function effectiveWeather(baseWeather, elapsed, chapter) {
  if (baseWeather !== 'rain' || (chapter !== 1 && chapter !== 2)) return baseWeather;
  // Offset the two rainy chapters so the same global game clock does not
  // repeat an identical front on each route. The result is shared by the
  // renderer, rain, sea life, music and sound in the calling game loop.
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  return rainSquallStrength(time - chapter * 7) > 0.48 ? 'storm' : 'rain';
}

export function createStormActivity() {
  let previousMode = null;
  let previousTime = -Infinity;
  let nextCluster = Infinity;
  let nextEcho = Infinity;
  let echoesLeft = 0;
  let clusterNumber = 0;

  return {
    update(elapsed, mode) {
      const now = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
      if (mode !== previousMode || now < previousTime) {
        previousMode = mode;
        nextCluster = Infinity;
        nextEcho = Infinity;
        echoesLeft = 0;
      }
      previousTime = now;
      const idle = { strike: false, thunder: false, bolts: 0, flashPower: 0 };
      if (mode !== 'storm') {
        nextCluster = Infinity;
        nextEcho = Infinity;
        echoesLeft = 0;
        return idle;
      }
      if (!Number.isFinite(nextCluster)) nextCluster = now + 1.55;

      // Secondary forks happen while the first thunder roll is still audible.
      // They get smaller flashes and do not start overlapping five-second rolls.
      if (echoesLeft > 0 && now >= nextEcho) {
        echoesLeft -= 1;
        nextEcho = now + 0.24;
        return { strike: true, thunder: false, bolts: echoesLeft ? 2 : 1, flashPower: 0.52 };
      }
      if (now < nextCluster) return idle;

      clusterNumber += 1;
      echoesLeft = clusterNumber % 2 === 0 ? 1 : 2;
      nextEcho = now + 0.23;
      // The main storm averages one cluster every ~8 seconds, versus the old
      // 9–22-second single strikes. Short rainy squalls usually get one burst.
      const variation = (Math.sin(clusterNumber * 19.71 + now * 0.43) + 1) * 0.5;
      nextCluster = now + 6.2 + variation * 3.1;
      return { strike: true, thunder: true, bolts: 2, flashPower: 0.82 };
    },
  };
}
