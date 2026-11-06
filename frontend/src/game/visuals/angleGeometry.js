/** Mathematical bearing helpers for the AngleMaze protractor. */
export const normalizeBearing = (degrees) => ((degrees % 360) + 360) % 360;

/** Unit direction in screen coordinates (positive game angles are CCW). */
export function bearingVector(degrees) {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians), y: -Math.sin(radians) };
}

/** Preserve the commanded signed sweep, including wrap and complete turns. */
export function interpretSignedTurn(previous, signedDegrees, current) {
  const start = normalizeBearing(previous);
  const end = normalizeBearing(current);
  const magnitude = Math.abs(signedDegrees);
  return {
    start,
    end,
    signedDegrees,
    direction: Math.sign(signedDegrees),
    crossesZero: signedDegrees > 0
      ? end < start && magnitude % 360 !== 0
      : signedDegrees < 0 && end > start && magnitude % 360 !== 0,
    fullTurns: Math.floor(magnitude / 360),
    remainder: magnitude % 360,
  };
}
