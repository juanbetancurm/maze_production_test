import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeoutScope } from '../../src/lib/timeoutScope.js';

function createFakeClock() {
  let nextHandle = 1;
  const timers = new Map();
  const scheduledCallbacks = new Map();

  return {
    timers,
    scheduleTimer(callback, delay) {
      const handle = nextHandle++;
      const timer = { callback, delay };
      timers.set(handle, timer);
      scheduledCallbacks.set(handle, timer);
      return handle;
    },
    cancelTimer(handle) {
      timers.delete(handle);
    },
    run(handle) {
      const timer = timers.get(handle);
      if (!timer) return false;
      timers.delete(handle);
      timer.callback();
      return true;
    },
    runEvenIfCancelled(handle) {
      const timer = scheduledCallbacks.get(handle);
      if (!timer) return false;
      timer.callback();
      return true;
    },
  };
}

test('replacing a keyed message timer cancels the older callback', () => {
  const clock = createFakeClock();
  const scope = createTimeoutScope(clock);
  const messages = [];

  const oldHandle = scope.replace('checkpoint', () => messages.push('old'), 2000);
  const latestHandle = scope.replace('checkpoint', () => messages.push('latest'), 2000);

  assert.equal(clock.timers.has(oldHandle), false);
  assert.equal(scope.size, 1);
  assert.equal(clock.run(oldHandle), false);
  assert.equal(clock.run(latestHandle), true);
  assert.deepEqual(messages, ['latest']);
  assert.equal(scope.size, 0);
});

test('clearing a timer scope cancels all pending view callbacks', () => {
  const clock = createFakeClock();
  const scope = createTimeoutScope(clock);
  let invoked = 0;

  const first = scope.schedule(() => { invoked += 1; }, 3000);
  const second = scope.replace('win-navigation', () => { invoked += 1; }, 3000);

  scope.clearAll();

  assert.equal(scope.size, 0);
  assert.equal(clock.timers.size, 0);
  assert.equal(clock.run(first), false);
  assert.equal(clock.run(second), false);
  clock.runEvenIfCancelled(first);
  clock.runEvenIfCancelled(second);
  assert.equal(invoked, 0);
});

test('clearing one named timer preserves unrelated scheduled work', () => {
  const clock = createFakeClock();
  const scope = createTimeoutScope(clock);
  const called = [];

  const toast = scope.replace('toast', () => called.push('toast'), 2000);
  const followUp = scope.schedule(() => called.push('follow-up'), 3000);
  assert.equal(scope.clear(toast), true);
  assert.equal(scope.clear(toast), false);
  assert.equal(clock.run(followUp), true);

  assert.deepEqual(called, ['follow-up']);
  assert.equal(scope.size, 0);
});
