const percentile = (sorted, fraction) =>
  sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];

/**
 * Collect visible, unpaused gameplay frames without allocating in the frame
 * loop. The resulting measurements describe browser frame cadence and time
 * spent on the main thread; they do not measure GPU execution time.
 */
export function createPerformanceTelemetry({ windowMs = 15_000,
  maxFrames = 4_096, reportEveryMs = 2_000, warmupMs = 5_000 } = {}) {
  const times = new Float64Array(maxFrames);
  const intervals = new Float32Array(maxFrames);
  const cpuTimes = new Float32Array(maxFrames);
  let write = 0;
  let count = 0;
  let previousTime = null;
  let lastReport = null;
  let paused = true;

  function reset() {
    write = 0;
    count = 0;
    previousTime = null;
    lastReport = null;
  }

  function record({ at, cpuMs, calls = 0, triangles = 0,
    active = true, visible = true } = {}) {
    if (!active || !visible) {
      const changed = !paused;
      paused = true;
      reset();
      return changed ? { status: 'paused' } : null;
    }
    if (!Number.isFinite(at) || !Number.isFinite(cpuMs)) return null;
    const resuming = paused;
    paused = false;
    if (previousTime === null) {
      previousTime = at;
      return resuming ? { status: 'gathering' } : null;
    }
    const interval = at - previousTime;
    previousTime = at;
    // A long gap is often tab suspension, focus loss, or a browser pause.
    // Start a new window instead of reporting it as an in-game slow frame.
    if (interval > 2_000) {
      reset();
      previousTime = at;
      return { status: 'gathering' };
    }
    if (interval <= 0) return null;
    times[write] = at;
    intervals[write] = interval;
    cpuTimes[write] = Math.max(0, cpuMs);
    write = (write + 1) % maxFrames;
    count = Math.min(maxFrames, count + 1);
    const oldest = times[(write - count + maxFrames) % maxFrames];
    if (count < 5 || (lastReport === null && at - oldest < warmupMs)
      || (lastReport !== null && at - lastReport < reportEveryMs)) return null;
    lastReport = at;

    const frameValues = [];
    const cpuValues = [];
    let earliest = at;
    for (let index = 0; index < count; index++) {
      if (times[index] < at - windowMs) continue;
      frameValues.push(intervals[index]);
      cpuValues.push(cpuTimes[index]);
      earliest = Math.min(earliest, times[index]);
    }
    frameValues.sort((a, b) => a - b);
    cpuValues.sort((a, b) => a - b);
    return {
      status: 'ready',
      frames: frameValues.length,
      seconds: Math.max(0, (at - earliest) / 1_000),
      medianFps: 1_000 / percentile(frameValues, 0.5),
      low1Fps: 1_000 / percentile(frameValues, 0.99),
      cpuP95Ms: percentile(cpuValues, 0.95),
      calls, triangles,
    };
  }

  return { record, reset };
}

export function formatPerformanceTelemetry(report, {
  tier = 'desktop', pixelRatio = 1, width = 0, height = 0,
  geometries = 0, textures = 0,
} = {}) {
  if (report?.status === 'paused') return 'PERFORMANCE · waiting for gameplay';
  if (report?.status !== 'ready') return 'PERFORMANCE · gathering frames';
  return `PERFORMANCE · ${tier.toUpperCase()} · ${width}×${height} @ ${pixelRatio.toFixed(2)}×\n`
    + `${report.medianFps.toFixed(0)} median FPS · ${report.low1Fps.toFixed(0)} 1% low`
    + ` · ${report.frames} frames / ${report.seconds.toFixed(1)} s\n`
    + `Main-thread p95 ${report.cpuP95Ms.toFixed(1)} ms · ${report.calls} draws`
    + ` · ${Math.round(report.triangles / 1_000)}k tris\n`
    + `${geometries} geometries · ${textures} textures · GPU time unavailable`;
}
