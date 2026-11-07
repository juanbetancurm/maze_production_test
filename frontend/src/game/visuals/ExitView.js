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
  const activationObjects = new Set();
  const activationTweens = new Set();

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

  const stopActivationEffects = () => {
    activationTweens.forEach(tween => tween.stop());
    activationTweens.clear();
    activationObjects.forEach(effect => {
      if (effect.active) effect.destroy();
    });
    activationObjects.clear();
  };

  const animateActivationEffect = (effect, tweenConfig) => {
    activationObjects.add(effect);
    let tween;
    tween = scene.tweens.add({
      targets: effect,
      ...tweenConfig,
      onComplete: () => {
        activationTweens.delete(tween);
        activationObjects.delete(effect);
        if (effect.active) effect.destroy();
      },
    });
    activationTweens.add(tween);
  };

  const playActivationBurst = () => {
    if (destroyed || reducedMotion) return;

    const ring = scene.add.circle(x, y, 28, 0xffd66b, 0)
      .setStrokeStyle(3, 0xffca43, 0.98)
      .setScale(0.7)
      .setDepth(2.35);
    animateActivationEffect(ring, {
      scale: 1.65,
      alpha: 0,
      duration: 560,
      ease: 'Cubic.easeOut',
    });

    const sparkleColors = [0xfff0ae, 0xffffff, 0xffca52, 0xffe58b];
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
      const startRadius = 35;
      const endRadius = 49 + ((index % 2) * 7);
      const sparkle = scene.add.star(
        x + Math.cos(angle) * startRadius,
        y + Math.sin(angle) * startRadius,
        4,
        3,
        9,
        sparkleColors[index % sparkleColors.length],
        0.96,
      ).setScale(0.95).setDepth(2.7);
      animateActivationEffect(sparkle, {
        x: x + Math.cos(angle) * endRadius,
        y: y + Math.sin(angle) * endRadius,
        scale: 0.72,
        alpha: 0,
        duration: 520,
        delay: (index % 4) * 20,
        ease: 'Sine.easeIn',
      });
    }
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
      playActivationBurst();
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
        if (reducedMotion) stopActivationEffects();
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
      stopActivationEffects();
      halo.destroy();
      proximityGlow.destroy();
      image.destroy();
    },
  };
}
