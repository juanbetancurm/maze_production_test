import test from 'node:test';
import assert from 'node:assert/strict';
import { angleFacingPoint, easeAngleToward } from '../../src/game/visuals/ActorFacing.js';

const closeTo = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

function angularDistance(first, second) {
  return Math.abs(Math.atan2(Math.sin(first - second), Math.cos(first - second)));
}

test('down-facing golem art turns toward all four screen-space cardinals', () => {
  closeTo(angleFacingPoint(0, 0, 10, 0), -Math.PI / 2);
  closeTo(angleFacingPoint(0, 0, 0, 10), 0);
  closeTo(angleFacingPoint(0, 0, -10, 0), Math.PI / 2);
  closeTo(angleFacingPoint(0, 0, 0, -10), -Math.PI);
});

test('normal tracking eases toward the target without snapping', () => {
  const current = 0;
  const target = Math.PI / 2;
  const eased = easeAngleToward(current, target, 16);

  assert.ok(eased > current);
  assert.ok(eased < target);
  assert.ok(angularDistance(eased, target) < angularDistance(current, target));
});

test('tracking uses the shortest rotation across the wrap boundary', () => {
  const current = 179 * Math.PI / 180;
  const target = -179 * Math.PI / 180;
  const eased = easeAngleToward(current, target, (1000 * Math.log(2)) / 10);

  closeTo(eased, Math.PI);
  assert.ok(angularDistance(eased, target) < 2 * Math.PI / 180);
});

test('reduced motion snaps to the target and zero time leaves facing unchanged', () => {
  const target = 1.2;
  assert.equal(easeAngleToward(-0.4, target, 16, { reducedMotion: true }), target);
  assert.equal(easeAngleToward(-0.4, target, 0), -0.4);
});
