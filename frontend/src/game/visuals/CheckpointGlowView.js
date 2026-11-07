import Phaser from 'phaser';

const CHECKPOINT_GLOW_TEXTURE = 'premium.checkpoint.active-glow';
const GLOW_SIZE = 128;
const GLOW_ALPHA = 0.46;

function prepareTexture(scene) {
  if (scene.textures.exists(CHECKPOINT_GLOW_TEXTURE)) return true;
  if (typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = GLOW_SIZE;
  canvas.height = GLOW_SIZE;
  const context = canvas.getContext('2d');
  if (!context) return false;

  const gradient = context.createRadialGradient(
    GLOW_SIZE / 2, GLOW_SIZE / 2, 0,
    GLOW_SIZE / 2, GLOW_SIZE / 2, GLOW_SIZE / 2,
  );
  gradient.addColorStop(0, 'rgba(255, 194, 55, 0.34)');
  gradient.addColorStop(0.42, 'rgba(255, 184, 38, 0.19)');
  gradient.addColorStop(1, 'rgba(255, 174, 20, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);

  const texture = scene.textures.addCanvas(CHECKPOINT_GLOW_TEXTURE, canvas);
  texture?.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
  return scene.textures.exists(CHECKPOINT_GLOW_TEXTURE);
}

/** A soft, display-only halo for the current active checkpoint badge. */
export function CheckpointGlowView(scene, { reducedMotion = false } = {}) {
  if (!prepareTexture(scene)) return null;

  let glow = null;
  let pulseTween = null;
  let destroyed = false;
  let baseScaleX = 0;
  let baseScaleY = 0;

  const restoreBasePose = () => {
    if (!glow?.active) return;
    glow.setAlpha(GLOW_ALPHA).setScale(baseScaleX, baseScaleY);
  };

  const stopPulse = () => {
    pulseTween?.stop();
    pulseTween = null;
    restoreBasePose();
  };

  const startPulse = () => {
    if (destroyed || reducedMotion || !glow?.active || pulseTween) return;
    restoreBasePose();
    pulseTween = scene.tweens.add({
      targets: glow,
      alpha: 0.58,
      scaleX: glow.scaleX * 1.08,
      scaleY: glow.scaleY * 1.08,
      duration: 1700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  };

  return {
    setActive(x, y) {
      if (destroyed || !Number.isFinite(x) || !Number.isFinite(y)) return;
      if (!glow?.active) {
        glow = scene.add.image(x, y, CHECKPOINT_GLOW_TEXTURE)
          .setDisplaySize(88, 88)
          .setAlpha(GLOW_ALPHA)
          .setDepth(2.85);
        baseScaleX = glow.scaleX;
        baseScaleY = glow.scaleY;
        if (!reducedMotion) startPulse();
      } else {
        glow.setPosition(x, y);
      }
    },
    setReducedMotion(reduced) {
      if (destroyed || reducedMotion === Boolean(reduced)) return;
      reducedMotion = Boolean(reduced);
      if (reducedMotion) stopPulse();
      else startPulse();
    },
    get isActive() { return Boolean(glow?.active); },
    get pulseActive() { return Boolean(pulseTween?.isPlaying()); },
    get position() { return glow?.active ? { x: glow.x, y: glow.y } : null; },
    get alpha() { return glow?.active ? glow.alpha : null; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      pulseTween?.stop();
      pulseTween = null;
      glow?.destroy();
      glow = null;
    },
  };
}

export default CheckpointGlowView;
