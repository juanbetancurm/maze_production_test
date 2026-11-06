import { VISUAL_TEXTURES } from './assetManifest.js';

/** Texture key expected to be loaded by the owning scene. */
export const EXIT_TEXTURE_KEY = VISUAL_TEXTURES.exit;

/**
 * Creates a fixed, display-only exit image centered at x/y.
 * @param {Phaser.Scene} scene Scene that owns the image.
 * @param {number} x Horizontal center.
 * @param {number} y Vertical center.
 * @param {{reducedMotion?: boolean}} [options] Initial motion preference.
 * @returns {{ displayWidth: number, displayHeight: number,
 *   setReducedMotion: (reduced: boolean) => void, destroy: () => void }}
 * Handle for motion preference and owned visual cleanup.
 */
export function ExitView(scene, x, y, { reducedMotion = false } = {}) {
  const halo = scene.add.circle(x, y, 35, 0xffd66b, 0.14)
    .setDepth(1);
  const proximityGlow = scene.add.circle(x, y, 44, 0xffb638, 0)
    .setDepth(1.5);
  const image = scene.add.image(x, y, EXIT_TEXTURE_KEY)
    .setDisplaySize(64, 64)
    .setDepth(2);

  let destroyed = false;
  let activated = false;
  let pulseTween = null;
  let proximity = 0;

  const stopPulse = () => {
    pulseTween?.stop();
    pulseTween = null;
    halo.setScale(1).setAlpha(0);
  };

  const startPulse = () => {
    if (destroyed || reducedMotion || activated) return;
    halo.setAlpha(0.14);
    pulseTween = scene.tweens.add({
      targets: halo,
      scale: 1.08,
      alpha: 0.2,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  };

  const showActivation = () => {
    halo.setScale(1.12).setAlpha(reducedMotion ? 0.2 : 0.3);
    proximityGlow.setScale(1.12).setAlpha(Math.max(proximity * 0.16, reducedMotion ? 0.12 : 0.2));
  };

  if (reducedMotion) {
    stopPulse();
  } else {
    startPulse();
  }

  return {
    displayWidth: image.displayWidth,
    displayHeight: image.displayHeight,
    activate() {
      if (destroyed || activated) return;
      activated = true;
      stopPulse();
      showActivation();
    },
    get isActivated() { return activated; },
    updateProximity(playerX, playerY) {
      if (destroyed || activated || !Number.isFinite(playerX) || !Number.isFinite(playerY)) return;
      const distance = Math.hypot(playerX - x, playerY - y);
      proximity = Math.max(0, Math.min(1, 1 - distance / 110));
      proximityGlow.setAlpha(proximity * 0.16).setScale(0.88 + proximity * 0.12);
    },
    get proximityAlpha() { return proximityGlow.alpha; },
    setReducedMotion(reduced) {
      if (destroyed || reducedMotion === Boolean(reduced)) return;
      reducedMotion = Boolean(reduced);
      if (activated) {
        showActivation();
      } else if (reducedMotion) {
        stopPulse();
      } else {
        startPulse();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopPulse();
      halo.destroy();
      proximityGlow.destroy();
      image.destroy();
    },
  };
}
