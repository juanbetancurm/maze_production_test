const ACTOR_DEPTH_BASE = 4;
const ACTOR_DEPTH_PER_WORLD_UNIT = 0.001;

/** Map screen-space Y to a shared draw layer for top-down characters. */
export function actorDepthForY(y) {
  if (!Number.isFinite(y)) return ACTOR_DEPTH_BASE;
  return ACTOR_DEPTH_BASE + Math.max(0, Math.min(600, y)) * ACTOR_DEPTH_PER_WORLD_UNIT;
}

export const PLAYER_GROUND_SHADOW_DEPTH = 3.75;
export const PLAYER_CONTACT_SHADOW_DEPTH = 3.8;
