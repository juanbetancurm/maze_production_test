/** Return the screen-space rotation that points a down-facing sprite at a target. */
export function angleFacingPoint(x, y, targetX, targetY) {
  return Math.atan2(targetY - y, targetX - x) - Math.PI / 2;
}

/** Move an angle toward its target along the shortest arc, independent of frame rate. */
export function easeAngleToward(current, target, deltaMs, { reducedMotion = false, response = 10 } = {}) {
  if (reducedMotion) return target;
  const difference = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  const blend = 1 - Math.exp(-Math.max(0, deltaMs) / 1000 * response);
  return current + difference * blend;
}
