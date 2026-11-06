import test from 'node:test';
import assert from 'node:assert/strict';
import { sweptFootprintsContact } from '../../src/game/visuals/CollisionGeometry.js';

function rectangle(halfWidth, halfHeight) {
  return {
    halfWidth,
    halfHeight,
    polygon: [
      { x: -halfWidth, y: -halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: -halfWidth, y: halfHeight },
    ],
  };
}

const playerFootprint = rectangle(6, 4);
const golemFootprint = rectangle(12, 8);

function contactAt({ x, y, angle = 0, fromX = x, fromY = y }) {
  return sweptFootprintsContact({
    startX: fromX,
    startY: fromY,
    endX: x,
    endY: y,
    playerAngle: angle,
    playerFootprint,
    targetX: 0,
    targetY: 0,
    targetFootprint: golemFootprint,
  });
}

test('physical hulls register edge contact and overlap, but preserve a visible gap', () => {
  assert.equal(contactAt({ x: 18, y: 0 }).overlaps, true);
  assert.equal(contactAt({ x: 17.5, y: 0 }).overlaps, true);
  assert.equal(contactAt({ x: 18.5, y: 0 }).overlaps, false);
});

test('gaps and contact are consistent from eight directions and player rotations', () => {
  const directions = Array.from({ length: 8 }, (_, index) => index * Math.PI / 4);
  const playerAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4];

  for (const direction of directions) {
    const nx = Math.cos(direction);
    const ny = Math.sin(direction);
    for (const playerAngle of playerAngles) {
      const playerAxisX = { x: Math.cos(playerAngle), y: Math.sin(playerAngle) };
      const playerAxisY = { x: -playerAxisX.y, y: playerAxisX.x };
      const separatingAxes = [playerAxisX, playerAxisY, { x: 1, y: 0 }, { x: 0, y: 1 }];
      const touchingDistance = Math.min(...separatingAxes.map((axis) => {
        const directionProjection = Math.abs(nx * axis.x + ny * axis.y);
        if (directionProjection < 1e-12) return Infinity;
        const playerSupport = 6 * Math.abs(playerAxisX.x * axis.x + playerAxisX.y * axis.y) +
          4 * Math.abs(playerAxisY.x * axis.x + playerAxisY.y * axis.y);
        const golemSupport = 12 * Math.abs(axis.x) + 8 * Math.abs(axis.y);
        return (playerSupport + golemSupport) / directionProjection;
      }));

      assert.equal(contactAt({
        x: nx * (touchingDistance + 1),
        y: ny * (touchingDistance + 1),
        angle: playerAngle,
      }).overlaps, false, `gap at direction ${direction}, angle ${playerAngle}`);
      assert.equal(contactAt({
        x: nx * (touchingDistance - 1),
        y: ny * (touchingDistance - 1),
        angle: playerAngle,
      }).overlaps, true, `overlap at direction ${direction}, angle ${playerAngle}`);
    }
  }
});

test('continuous sweep catches a fast crossing and returns the first contact point', () => {
  const result = sweptFootprintsContact({
    startX: -30,
    startY: 0,
    endX: 30,
    endY: 0,
    playerAngle: 0,
    playerFootprint: rectangle(2, 2),
    targetX: 0,
    targetY: 0,
    targetFootprint: rectangle(5, 5),
  });

  assert.equal(result.overlaps, true);
  assert.ok(Math.abs(result.progress - (23 / 60)) < 1e-10);
  assert.ok(Math.abs(result.playerAnchor.x + 7) < 1e-10);
});

test('swept movement that clears the physical hull on a parallel path does not collide', () => {
  const result = sweptFootprintsContact({
    startX: -30,
    startY: 8.5,
    endX: 30,
    endY: 8.5,
    playerAngle: 0,
    playerFootprint: rectangle(2, 2),
    targetX: 0,
    targetY: 0,
    targetFootprint: rectangle(5, 5),
  });

  assert.equal(result.overlaps, false);
  assert.equal(result.progress, null);
});
