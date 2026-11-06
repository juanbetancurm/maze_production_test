import assert from 'node:assert/strict';
import test from 'node:test';
import { findWallJunctions } from '../../src/game/visuals/WallKit.js';
import wallsLevel1 from '../../src/game/mazeData.js';
import wallsLevel2 from '../../src/game/mazeDataLevel2.js';

test('finds and classifies an L corner', () => {
  assert.deepEqual(findWallJunctions([
    { x1: 0, y1: 0, x2: 100, y2: 0 },
    { x1: 100, y1: 0, x2: 100, y2: 100 },
  ]), [{ x: 100, y: 0, degree: 2 }]);
});

test('counts a wall endpoint meeting the interior of a beam as a T junction', () => {
  assert.deepEqual(findWallJunctions([
    { x1: 0, y1: 50, x2: 100, y2: 50 },
    { x1: 50, y1: 50, x2: 50, y2: 100 },
  ]), [{ x: 50, y: 50, degree: 3 }]);
});

test('finds orthogonal and acute diagonal crossings', () => {
  assert.deepEqual(findWallJunctions([
    { x1: 0, y1: 0, x2: 100, y2: 100 },
    { x1: 0, y1: 100, x2: 100, y2: 0 },
  ]), [{ x: 50, y: 50, degree: 4 }]);

  assert.deepEqual(findWallJunctions([
    { x1: 0, y1: 0, x2: 100, y2: 0 },
    { x1: 0, y1: -28.8675134595, x2: 100, y2: 28.8675134595 },
  ]), [{ x: 50, y: 0, degree: 4 }]);
});

test('does not cap collinear seams or disconnected near misses', () => {
  assert.deepEqual(findWallJunctions([
    { x1: 0, y1: 0, x2: 50, y2: 0 },
    { x1: 50, y1: 0, x2: 100, y2: 0 },
  ]), []);
  assert.deepEqual(findWallJunctions([
    { x1: 0, y1: 0, x2: 50, y2: 0 },
    { x1: 50.25, y1: 0.25, x2: 50.25, y2: 100 },
  ]), []);
});

test('the current level datasets contain renderable wall junctions', () => {
  const level1 = findWallJunctions(wallsLevel1);
  const level2 = findWallJunctions(wallsLevel2);
  assert.ok(level1.length > 0);
  assert.ok(level2.length > level1.length);
  assert.ok(level1.some(({ degree }) => degree >= 3));
  assert.ok(level2.some(({ degree }) => degree >= 3));
});
