import { applyPremiumLighting, VISUAL_TEXTURES } from './assetManifest.js';
import { actorDepthForY } from './ActorDepth.js';
import { angleFacingPoint, easeAngleToward } from './ActorFacing.js';

/** Texture key expected to be loaded by the owning scene. */
export const GOLEM_TEXTURE_KEY = VISUAL_TEXTURES.golem;

/**
 * Creates fixed, display-only golem images at the supplied centers.
 * @param {Phaser.Scene} scene Scene that owns the images.
 * @param {Array<{x: number, y: number}>} positions Exact image centers.
 * @param {{reducedMotion?: boolean}} [options] Initial motion preference.
 * @returns {{ setReducedMotion: (reduced: boolean) => void, destroy: () => void }}
 * Handle for motion preference and owned image cleanup.
 */
export function GolemView(scene, positions, { reducedMotion = false } = {}) {
  const safePositions = positions ?? [];
  const shadows = safePositions.flatMap(({ x, y }) => [
    scene.add.ellipse(x + 2, y + 24, 92, 30, 0x111a12, 0.09).setDepth(3.1),
    scene.add.ellipse(x + 1, y + 25, 70, 21, 0x111a12, 0.15).setDepth(3.4),
    scene.add.ellipse(x, y + 29, 44, 12, 0x111a12, 0.24).setDepth(3.7),
  ]);
  const images = safePositions.map(({ x, y }) => {
    const image = scene.add.image(x, y, GOLEM_TEXTURE_KEY)
      .setDisplaySize(100, 100)
      .setAngle(0)
      .setDepth(actorDepthForY(y));
    applyPremiumLighting(scene, image, GOLEM_TEXTURE_KEY);
    return image;
  });
  const facingAngles = images.map(() => 0);
  const baseScales = images.map(({ scaleX, scaleY }) => ({ scaleX, scaleY }));
  const tweens = images.map(() => null);

  let destroyed = false;

  const stopBreathing = () => {
    tweens.forEach((tween, index) => {
      tween?.stop();
      tweens[index] = null;
      const image = images[index];
      if (image.active) image.setScale(baseScales[index].scaleX, baseScales[index].scaleY);
    });
  };

  const startBreathing = () => {
    if (destroyed || reducedMotion) return;
    images.forEach((image, index) => {
      const { scaleX, scaleY } = baseScales[index];
      tweens[index] = scene.tweens.add({
        targets: image,
        scaleX: scaleX * 1.02,
        scaleY: scaleY * 1.02,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        delay: index * 170,
        ease: 'Sine.easeInOut',
      });
    });
  };

  startBreathing();

  return {
    get count() { return images.length; },
    get shadowCount() { return safePositions.length; },
    get renderOrder() { return images.map(({ x, y, depth }) => ({ x, y, depth })); },
    get facingAngles() { return facingAngles.map(angle => angle * 180 / Math.PI); },
    /** Rotate only the authored golem art; its shadow and physical footprint stay fixed. */
    facePosition(playerX, playerY, deltaMs = 16) {
      if (destroyed || !Number.isFinite(playerX) || !Number.isFinite(playerY)) return;
      images.forEach((image, index) => {
        const dx = playerX - image.x;
        const dy = playerY - image.y;
        if (dx * dx + dy * dy < 0.01) return;

        // The static golem artwork's eyes face down-screen at zero rotation.
        const target = angleFacingPoint(image.x, image.y, playerX, playerY);
        facingAngles[index] = easeAngleToward(facingAngles[index], target, deltaMs, { reducedMotion });
        image.rotation = facingAngles[index];
      });
    },
    setReducedMotion(reduced) {
      if (destroyed || reducedMotion === Boolean(reduced)) return;
      reducedMotion = Boolean(reduced);
      if (reducedMotion) {
        stopBreathing();
      } else {
        startBreathing();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopBreathing();
      shadows.forEach(shadow => shadow.destroy());
      images.forEach(image => image.destroy());
    },
  };
}
