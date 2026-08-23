import assert from 'node:assert/strict';
import test from 'node:test';

import { schedulePrayerHashScroll } from './prayerHashNavigation.mjs';

function createEnvironment(targets = {}) {
  let callback = null;
  const cancelledFrames = [];

  return {
    document: {
      getElementById(id) {
        return targets[id] ?? null;
      },
    },
    requestAnimationFrame(next) {
      callback = next;
      return 17;
    },
    cancelAnimationFrame(frameId) {
      cancelledFrames.push(frameId);
    },
    runFrame() {
      callback?.();
    },
    get cancelledFrames() {
      return cancelledFrames;
    },
  };
}

test('a valid direct Prayer hash scrolls its mounted segment after one animation frame', () => {
  const scrollCalls = [];
  const environment = createEnvironment({
    'segment-night': {
      scrollIntoView(options) {
        scrollCalls.push(options);
      },
    },
  });

  schedulePrayerHashScroll(
    '#segment-night',
    ['segment-morning', 'segment-night'],
    environment,
  );

  assert.deepEqual(scrollCalls, []);
  environment.runFrame();
  assert.deepEqual(scrollCalls, [{ behavior: 'auto', block: 'start' }]);
});

test('invalid and missing hashes do not schedule a scroll', () => {
  const environment = createEnvironment();
  const cleanup = schedulePrayerHashScroll(
    '#not-a-segment',
    ['segment-morning'],
    environment,
  );

  environment.runFrame();
  cleanup();
  assert.deepEqual(environment.cancelledFrames, []);
});

test('cleanup cancels a queued direct-hash scroll before it can run', () => {
  const scrollCalls = [];
  const environment = createEnvironment({
    'segment-morning': {
      scrollIntoView(options) {
        scrollCalls.push(options);
      },
    },
  });

  const cleanup = schedulePrayerHashScroll(
    '#segment-morning',
    ['segment-morning'],
    environment,
  );
  cleanup();
  environment.runFrame();

  assert.deepEqual(environment.cancelledFrames, [17]);
  assert.deepEqual(scrollCalls, []);
});
