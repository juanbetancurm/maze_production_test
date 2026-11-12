/**
 * introCinematic.js - Tiny store for the cinematic introduction overlay.
 *
 * WHAT: Tracks whether the intro overlay is open and whether this browser has
 *   already been shown the intro.
 * WHY: The overlay is mounted once at the app root so it can stay on screen
 *   while the route underneath changes from registration to the level menu.
 *   Keeping this outside GameContext means the intro can never touch team,
 *   progress, or gameplay state.
 * HOW: A module-level snapshot read through useSyncExternalStore. The "seen"
 *   flag lives in localStorage; it is a convenience, not a guarantee (private
 *   browsing or cleared storage simply offers the intro again).
 */
const INTRO_SEEN_STORAGE_KEY = 'anglemaze:introSeen';

function readSeen() {
  try {
    return localStorage.getItem(INTRO_SEEN_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let snapshot = { isOpen: false, seen: readSeen() };
let onCovered = null;
const listeners = new Set();

function update(patch) {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeIntro(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getIntroSnapshot() {
  return snapshot;
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_SEEN_STORAGE_KEY, 'true');
  } catch {
    // Storage unavailable: the intro may be offered again next visit.
  }
  if (!snapshot.seen) update({ seen: true });
}

/** Visitors who asked their browser to save data are not sent a video unasked. */
export function prefersReducedData() {
  return Boolean(navigator.connection?.saveData);
}

/**
 * Open the overlay. `onCovered` runs once, when the overlay fully hides the
 * page (or immediately if the overlay is already open), so the caller can
 * change route underneath without the visitor seeing it.
 */
export function openIntro(options = {}) {
  if (snapshot.isOpen) {
    options.onCovered?.();
    return;
  }
  onCovered = options.onCovered ?? null;
  update({ isOpen: true });
}

/** Called by the overlay once it is fully opaque. */
export function notifyIntroCovered() {
  const callback = onCovered;
  onCovered = null;
  callback?.();
}

export function closeIntro() {
  // If the overlay closes before it finished covering the page, the pending
  // route change must still happen.
  notifyIntroCovered();
  if (snapshot.isOpen) update({ isOpen: false });
}
