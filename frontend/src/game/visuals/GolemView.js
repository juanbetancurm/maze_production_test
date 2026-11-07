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
  const anchors = (positions ?? []).map(({ x, y }) => ({ x, y }));
  const shadowGroups = anchors.map(({ x, y }) => [
    scene.add.ellipse(x + 2, y + 24, 92, 30, 0x111a12, 0.09).setDepth(3.1),
    scene.add.ellipse(x + 1, y + 25, 70, 21, 0x111a12, 0.15).setDepth(3.4),
    scene.add.ellipse(x, y + 29, 44, 12, 0x111a12, 0.24).setDepth(3.7),
  ]);
  const images = anchors.map(({ x, y }) => {
    const image = scene.add.image(x, y, GOLEM_TEXTURE_KEY)
      .setDisplaySize(100, 100)
      .setAngle(0)
      .setDepth(actorDepthForY(y));
    applyPremiumLighting(scene, image, GOLEM_TEXTURE_KEY);
    return image;
  });
  const eyeGlows = images.map((image) => {
    if (!scene.textures.exists(VISUAL_TEXTURES.golemEyeGlow)) return null;
    return scene.add.image(image.x, image.y, VISUAL_TEXTURES.golemEyeGlow)
      .setDisplaySize(image.displayWidth, image.displayHeight)
      .setAlpha(0.1)
      .setDepth(image.depth);
  });
  const facingAngles = images.map(() => 0);
  const baseScales = images.map(({ scaleX, scaleY }) => ({ scaleX, scaleY }));
  const baseShadowStyles = shadowGroups.map(group => group.map(({ scaleX, scaleY, alpha }) => ({
    scaleX,
    scaleY,
    alpha,
  })));
  const idleStates = images.map(() => ({ lift: 0 }));
  const idleTweens = images.map(() => null);

  const syncEyeGlow = (index) => {
    const image = images[index];
    const glow = eyeGlows[index];
    if (!image.active || !glow?.active) return;
    glow.setPosition(image.x, image.y)
      .setRotation(image.rotation)
      .setDisplaySize(image.displayWidth, image.displayHeight)
      .setDepth(image.depth)
      .setAlpha(0.1 + idleStates[index].lift * 0.16);
  };

  let destroyed = false;

  const applyIdlePose = (index) => {
    const lift = idleStates[index].lift;
    const image = images[index];
    if (image.active) {
      const { x, y } = anchors[index];
      image.x = x;
      image.y = y - lift * 1.25;
      image.setScale(
        baseScales[index].scaleX * (1 + lift * 0.012),
        baseScales[index].scaleY * (1 + lift * 0.018),
      );
    }

    shadowGroups[index].forEach((shadow, shadowIndex) => {
      if (!shadow.active) return;
      const base = baseShadowStyles[index][shadowIndex];
      // A lifted body casts a slightly broader, softer contact shadow.
      shadow.setScale(base.scaleX * (1 + lift * 0.055), base.scaleY * (1 + lift * 0.04));
      shadow.setAlpha(base.alpha * (1 - lift * 0.16));
    });
    syncEyeGlow(index);
  };

  const stopIdleMotion = () => {
    idleTweens.forEach((tween, index) => {
      tween?.stop();
      idleTweens[index] = null;
      idleStates[index].lift = 0;
      applyIdlePose(index);
    });
  };

  const startIdleMotion = () => {
    if (destroyed || reducedMotion) return;
    images.forEach((image, index) => {
      idleStates[index].lift = 0;
      applyIdlePose(index);
      idleTweens[index] = scene.tweens.add({
        targets: idleStates[index],
        lift: 1,
        duration: 1650,
        yoyo: true,
        repeat: -1,
        delay: index * 210,
        ease: 'Sine.easeInOut',
        onUpdate: () => applyIdlePose(index),
      });
    });
  };

  startIdleMotion();

  return {
    get count() { return images.length; },
    get shadowCount() { return shadowGroups.length; },
    get renderOrder() {
      return images.map(({ depth }, index) => ({ ...anchors[index], depth }));
    },
    get facingAngles() { return facingAngles.map(angle => angle * 180 / Math.PI); },
    /** Visual lifting never changes the fixed logical anchor used for facing or depth. */
    facePosition(playerX, playerY, deltaMs = 16) {
      if (destroyed || !Number.isFinite(playerX) || !Number.isFinite(playerY)) return;
      images.forEach((image, index) => {
        const { x, y } = anchors[index];
        const dx = playerX - x;
        const dy = playerY - y;
        if (dx * dx + dy * dy < 0.01) return;

        // The static golem artwork's eyes face down-screen at zero rotation.
        const target = angleFacingPoint(x, y, playerX, playerY);
        facingAngles[index] = easeAngleToward(facingAngles[index], target, deltaMs, { reducedMotion });
        image.rotation = facingAngles[index];
        syncEyeGlow(index);
      });
    },
    get eyeGlowCount() { return eyeGlows.filter(Boolean).length; },
    setReducedMotion(reduced) {
      if (destroyed || reducedMotion === Boolean(reduced)) return;
      reducedMotion = Boolean(reduced);
      if (reducedMotion) {
        stopIdleMotion();
      } else {
        startIdleMotion();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopIdleMotion();
      shadowGroups.flat().forEach(shadow => shadow.destroy());
      eyeGlows.filter(Boolean).forEach(glow => glow.destroy());
      images.forEach(image => image.destroy());
    },
  };
}
