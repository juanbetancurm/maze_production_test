import { getFootprintOutline } from './CollisionGeometry.js';

const COLORS = Object.freeze({ player: 0x24e5ff, wallBody: 0xffaa31, golem: 0xff55c7, anchor: 0xffffff });

/** Draw the live Phaser collision shapes; this object never participates in physics. */
export default function CollisionDebugView(scene, footprint) {
  const graphics = scene.add.graphics().setDepth(1000);
  const label = scene.add.text(10, 10, '', {
    color: '#ffffff',
    backgroundColor: '#08131ddd',
    fontFamily: 'monospace',
    fontSize: '12px',
    padding: { x: 8, y: 6 },
    lineSpacing: 3,
  }).setDepth(1001).setScrollFactor(0);

  const drawPath = (points) => {
    if (!points.length) return;
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach(point => graphics.lineTo(point.x, point.y));
    graphics.closePath();
    graphics.strokePath();
  };

  return {
    update({ player, playerBody, playerRotation, playerAngle, golemShapes, wallGroup, lastCollisionCause, lastCollisionDetails, previousPosition }) {
      graphics.clear();

      graphics.lineStyle(1.5, COLORS.wallBody, 0.82);
      wallGroup?.getChildren().forEach(({ body }) => {
        if (!body?.enable) return;
        graphics.strokeRect(body.x, body.y, body.width, body.height);
      });

      graphics.lineStyle(2, COLORS.golem, 0.95);
      golemShapes?.forEach((shape) => {
        drawPath(getFootprintOutline(shape.x, shape.y, 0, shape.footprint));
        graphics.fillStyle(COLORS.anchor, 0.95);
        graphics.fillCircle(shape.x, shape.y, 1.5);
      });

      const currentPosition = { x: player.x, y: player.y };
      if (previousPosition && (previousPosition.x !== currentPosition.x || previousPosition.y !== currentPosition.y)) {
        graphics.lineStyle(1, COLORS.player, 0.5);
        graphics.beginPath();
        graphics.moveTo(previousPosition.x, previousPosition.y);
        graphics.lineTo(currentPosition.x, currentPosition.y);
        graphics.strokePath();
      }

      const angle = playerRotation;
      graphics.lineStyle(2, COLORS.player, 1);
      drawPath(getFootprintOutline(player.x, player.y, angle, footprint));
      if (playerBody) {
        graphics.lineStyle(1, 0xff514e, 0.95);
        graphics.strokeRect(playerBody.x, playerBody.y, playerBody.width, playerBody.height);
      }
      graphics.lineStyle(1, COLORS.anchor, 0.95);
      graphics.beginPath();
      graphics.moveTo(player.x - 5, player.y);
      graphics.lineTo(player.x + 5, player.y);
      graphics.moveTo(player.x, player.y - 5);
      graphics.lineTo(player.x, player.y + 5);
      graphics.strokePath();

      const cause = lastCollisionCause ?? 'none';
      const detail = lastCollisionDetails
        ? `last contact: ${lastCollisionDetails.object?.label ?? cause} @ ${lastCollisionDetails.object?.x?.toFixed?.(1) ?? '?'}, ${lastCollisionDetails.object?.y?.toFixed?.(1) ?? '?'}`
        : 'last contact: none';
      label.setText([
        'COLLISION DEBUG (DEV ONLY)',
        'cyan = player opaque-alpha hull | red = player wall body',
        'pink = golem opaque-alpha hull | orange = wall Arcade bodies',
        `anchor = white cross/dot | awareness radius = none`,
        `player logical: ${player.x.toFixed(1)}, ${player.y.toFixed(1)} | game facing: ${(playerAngle).toFixed(1)}° | visual: ${(playerRotation * 180 / Math.PI).toFixed(1)}°`,
        `player alpha size: ${(footprint.halfWidth * 2).toFixed(1)} × ${(footprint.halfHeight * 2).toFixed(1)} px`,
        `last cause: ${cause} | ${detail}`,
      ]);
    },
    destroy() {
      graphics.destroy();
      label.destroy();
    },
  };
}
