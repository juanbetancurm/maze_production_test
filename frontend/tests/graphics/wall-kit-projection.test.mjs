import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldFlipDiagonalWallSide } from '../../src/game/visuals/WallKit.js';

const radians = degrees => degrees * Math.PI / 180;

test('diagonal wall bevel stays on the lower-right projected side for both slopes', () => {
  for (const degrees of [-78, -60, -46, -30, 0, 30, 46, 60, 78]) {
    const angle = radians(degrees);
    const flipped = shouldFlipDiagonalWallSide(angle);
    const sideNormalX = -Math.sin(angle) * (flipped ? -1 : 1);
    const sideNormalY = Math.cos(angle) * (flipped ? -1 : 1);
    const projectedFacing = sideNormalX + sideNormalY;

    assert.ok(
      projectedFacing >= -1e-8,
      `Expected ${degrees}° side to face lower-right projection; dot=${projectedFacing}`,
    );
    assert.equal(
      shouldFlipDiagonalWallSide(angle + Math.PI),
      flipped,
      `Reversing endpoints should not change the ${degrees}° side selection`,
    );
  }
});

test('45° side selection remains stable and the -45° side faces the viewer', () => {
  assert.equal(shouldFlipDiagonalWallSide(radians(45)), false);
  assert.equal(shouldFlipDiagonalWallSide(radians(-45)), false);
});
