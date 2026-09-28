import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMusic, DEFAULT_MUSIC_VOLUME, musicTargetVolume, PIANO_TRACK_URL, selectMusicPlan,
} from '../src/music.js';

test('soft piano stays below the weather and ducks during dialogue', () => {
  const calm = selectMusicPlan({ weather: 'mist' });
  const storm = selectMusicPlan({ weather: 'thunderstorm' });
  const dialogue = selectMusicPlan({ weather: 'storm', dialogue: true });
  const interior = selectMusicPlan({ weather: 'mist', indoors: true });
  assert.ok(storm.level < calm.level);
  assert.ok(dialogue.level < storm.level / 2);
  assert.ok(interior.level < calm.level);
  assert.ok(musicTargetVolume(DEFAULT_MUSIC_VOLUME, false, calm) < 0.1);
  assert.equal(musicTargetVolume(DEFAULT_MUSIC_VOLUME, true, calm), 0);
  assert.equal(musicTargetVolume(0, false, calm), 0);
});

test('the licensed piano loop loads only after start and remains independently adjustable', async () => {
  const original = globalThis.Audio;
  const instances = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.paused = true;
      this.volume = 1;
      this.playCount = 0;
      this.pauseCount = 0;
      instances.push(this);
    }
    play() { this.paused = false; this.playCount += 1; return Promise.resolve(); }
    pause() { this.paused = true; this.pauseCount += 1; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    load() {}
  }
  globalThis.Audio = FakeAudio;
  try {
    const music = createMusic();
    music.update(1, { weather: 'mist' });
    music.setVolume(0.5);
    assert.equal(instances.length, 0, 'no audio file or playback is requested before a user gesture');
    assert.equal(await music.start(), true);
    assert.equal(instances.length, 1);
    assert.equal(instances[0].src, PIANO_TRACK_URL);
    assert.equal(instances[0].loop, true);
    assert.equal(instances[0].preload, 'none');
    assert.equal(instances[0].playCount, 1);
    music.update(1, { weather: 'mist' });
    assert.ok(instances[0].volume > 0 && instances[0].volume < 0.12);
    music.update(1, { weather: 'storm', dialogue: true });
    assert.ok(instances[0].volume < 0.12);
    music.setMuted(true);
    assert.equal(instances[0].volume, 0);
    assert.equal(instances[0].paused, true);
    music.setMuted(false);
    await Promise.resolve();
    assert.equal(instances[0].playCount, 2);
    music.setVolume(0);
    assert.equal(instances[0].paused, true);
    music.setVolume(0.4);
    await Promise.resolve();
    assert.equal(instances[0].playCount, 3);
    await music.dispose();
    assert.equal(instances[0].src, '');
  } finally {
    if (original === undefined) delete globalThis.Audio;
    else globalThis.Audio = original;
  }
});
