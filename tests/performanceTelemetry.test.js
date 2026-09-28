import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPerformanceTelemetry, formatPerformanceTelemetry,
} from '../src/performanceTelemetry.js';

test('visible gameplay reports sustained frame cadence and separates CPU submission time', () => {
  const telemetry = createPerformanceTelemetry({ reportEveryMs: 0, warmupMs: 0 });
  let now = 0;
  telemetry.record({ at: now, cpuMs: 2 });
  let report;
  for (let frame = 1; frame <= 120; frame++) {
    now += frame % 20 === 0 ? 100 : 1000 / 60;
    report = telemetry.record({
      at: now, cpuMs: frame % 10 === 0 ? 9 : 2,
      calls: 41, triangles: 85_000,
    });
  }
  assert.equal(report.status, 'ready');
  assert.equal(report.frames, 120);
  assert.ok(Math.abs(report.medianFps - 60) < 0.01);
  assert.ok(Math.abs(report.low1Fps - 10) < 0.01,
    'the slowest repeated frames appear in the 1% low');
  assert.equal(report.cpuP95Ms, 9);
  assert.equal(report.calls, 41);
  assert.equal(report.triangles, 85_000);
  assert.match(formatPerformanceTelemetry(report, {
    tier: 'desktop', pixelRatio: 1.6, width: 1920, height: 1080,
    geometries: 153, textures: 21,
  }), /10 1% low[\s\S]*Main-thread p95 9\.0 ms[\s\S]*GPU time unavailable/);
});

test('pause and tab suspension discard old samples before resumed play', () => {
  const telemetry = createPerformanceTelemetry({ reportEveryMs: 0, warmupMs: 0 });
  telemetry.record({ at: 0, cpuMs: 1 });
  for (let frame = 1; frame <= 10; frame++) {
    telemetry.record({ at: frame * 20, cpuMs: 1 });
  }
  assert.deepEqual(telemetry.record({ at: 220, cpuMs: 1, active: false }),
    { status: 'paused' });
  assert.equal(telemetry.record({ at: 240, cpuMs: 1, active: false }), null);
  telemetry.record({ at: 100_000, cpuMs: 1 });
  let report;
  for (let frame = 1; frame <= 5; frame++) {
    report = telemetry.record({ at: 100_000 + frame * 50, cpuMs: 3 });
  }
  assert.equal(report.frames, 5);
  assert.equal(report.medianFps, 20);
  assert.deepEqual(telemetry.record({ at: 105_000, cpuMs: 3 }), { status: 'gathering' },
    'a multi-second browser gap restarts the sample');
  for (let frame = 1; frame <= 5; frame++) {
    report = telemetry.record({ at: 105_000 + frame * 100, cpuMs: 4 });
  }
  assert.equal(report.frames, 5);
  assert.equal(report.medianFps, 10);
  assert.deepEqual(telemetry.record({ at: 105_600, cpuMs: 4, visible: false }),
    { status: 'paused' });
});

test('default display waits for a useful sustained sample after starting or resuming', () => {
  const telemetry = createPerformanceTelemetry();
  assert.deepEqual(telemetry.record({ at: 0, cpuMs: 2 }),
    { status: 'gathering' });
  for (let frame = 1; frame <= 300; frame++) {
    assert.equal(telemetry.record({ at: frame * 16, cpuMs: 2 }), null);
  }
  const first = telemetry.record({ at: 5_024, cpuMs: 2 });
  assert.equal(first.status, 'ready');
  assert.equal(first.frames, 301);
  assert.equal(telemetry.record({ at: 5_040, cpuMs: 2, active: false }).status,
    'paused');
  assert.deepEqual(telemetry.record({ at: 50_000, cpuMs: 2 }),
    { status: 'gathering' });
});
