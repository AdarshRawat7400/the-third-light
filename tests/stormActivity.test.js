import test from 'node:test';
import assert from 'node:assert/strict';
import { createStormActivity, effectiveWeather, rainSquallStrength } from '../src/stormActivity.js';

test('sustained storms form frequent clusters with multiple forks and one thunder roll each', () => {
  const activity = createStormActivity();
  const events = [];
  for (let frame = 0; frame < 120 * 30; frame++) {
    const elapsed = frame / 30;
    const result = activity.update(elapsed, 'storm');
    if (result.strike) events.push({ elapsed, ...result });
  }
  const thunder = events.filter((event) => event.thunder);
  assert.ok(thunder.length >= 12 && thunder.length <= 20, `thunder rolls: ${thunder.length}`);
  assert.ok(events.length >= thunder.length * 2, `visible strikes: ${events.length}`);
  assert.ok(events.some((event) => event.bolts > 1));
  assert.ok(thunder.every((event, index) => index === 0
    || event.elapsed - thunder[index - 1].elapsed >= 6));
});

test('rainy chapters have brief recurring squalls while mist and dawn stay calm', () => {
  assert.equal(effectiveWeather('mist', 100, 0), 'mist');
  assert.equal(effectiveWeather('dawn', 100, 5), 'dawn');
  assert.equal(effectiveWeather('rain', 0, 1), 'rain');
  assert.equal(rainSquallStrength(0), 0);
  for (const chapter of [1, 2]) {
    const stormSeconds = [];
    for (let second = 0; second < 180; second++) {
      if (effectiveWeather('rain', second, chapter) === 'storm') stormSeconds.push(second);
    }
    assert.ok(stormSeconds.length >= 25 && stormSeconds.length <= 40);
    assert.ok(stormSeconds.some((second) => second > 60));
  }
});

test('leaving a storm cancels queued secondary strikes', () => {
  const activity = createStormActivity();
  activity.update(0, 'storm');
  assert.equal(activity.update(1.6, 'storm').thunder, true);
  assert.equal(activity.update(1.7, 'rain').strike, false);
  assert.equal(activity.update(1.9, 'rain').strike, false);
  assert.equal(activity.update(2, 'dawn').strike, false);
  assert.equal(activity.update(2.1, 'storm').strike, false);
  assert.equal(activity.update(3.7, 'storm').thunder, true);
});
