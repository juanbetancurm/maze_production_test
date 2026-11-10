/** Owns short-lived UI timers and clears them when their view is disposed. */
export function createTimeoutScope({
  scheduleTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  cancelTimer = (handle) => globalThis.clearTimeout(handle),
} = {}) {
  const activeHandles = new Set();
  const namedHandles = new Map();

  function clear(handle) {
    if (!activeHandles.delete(handle)) return false;

    cancelTimer(handle);
    for (const [key, namedHandle] of namedHandles) {
      if (namedHandle === handle) namedHandles.delete(key);
    }
    return true;
  }

  function schedule(callback, delay) {
    let handle;
    handle = scheduleTimer(() => {
      if (!activeHandles.delete(handle)) return;
      for (const [key, namedHandle] of namedHandles) {
        if (namedHandle === handle) namedHandles.delete(key);
      }
      callback();
    }, delay);
    activeHandles.add(handle);
    return handle;
  }

  function replace(key, callback, delay) {
    clear(namedHandles.get(key));
    const handle = schedule(callback, delay);
    namedHandles.set(key, handle);
    return handle;
  }

  function clearAll() {
    for (const handle of [...activeHandles]) clear(handle);
  }

  return {
    schedule,
    replace,
    clear,
    clearAll,
    get size() {
      return activeHandles.size;
    },
  };
}
