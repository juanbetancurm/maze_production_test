import { interpretSignedTurn, normalizeBearing } from './angleGeometry.js';

/**
 * Phaser-side state model for the React SVG protractor overlay.
 *
 * The SVG is rendered by the browser at the final display resolution. Phaser
 * remains authoritative for position and bearing, while this class publishes
 * those values without adding a second low-resolution canvas rendering.
 */
export default class ProtractorView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.destroyed = false;
    this.visible = false;
    this.gameScale = 1;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.turn = null;
    this.turnClearEvent = null;
    this.visibilityTween = null;
    this.reducedMotion = Boolean(options.reducedMotion);
    this.mobile = false;
    this.baseRadius = 64;
    this.radius = 64;
    this.lineScale = 1;
    // Keep a small state-compatible root for existing diagnostics.
    this.root = { visible: false, alpha: 0, x: 0, y: 0 };
  }

  setVisible(value) {
    if (this.destroyed) return;
    const nextVisible = Boolean(value);
    this.visible = nextVisible;
    if (!nextVisible) this.clearTurn();
    this.visibilityTween?.stop();
    this.visibilityTween = null;
    const targetAlpha = nextVisible ? 1 : 0;
    if (this.reducedMotion || Math.abs(this.root.alpha - targetAlpha) < 0.001) {
      this.root.alpha = targetAlpha;
      this.root.visible = nextVisible;
      this._publish();
      return;
    }
    if (nextVisible) this.root.visible = true;
    this._publish();
    this.visibilityTween = this.scene.tweens.add({
      targets: this.root,
      alpha: targetAlpha,
      duration: 120,
      ease: 'Sine.easeOut',
      onUpdate: () => this._publish(),
      onComplete: () => {
        this.visibilityTween = null;
        this.root.visible = this.visible;
        this._publish();
      },
    });
  }

  setReducedMotion(reduced) {
    if (this.destroyed) return;
    this.reducedMotion = Boolean(reduced);
    if (!this.reducedMotion || !this.visibilityTween) return;
    this.visibilityTween.stop();
    this.visibilityTween = null;
    this.root.alpha = this.visible ? 1 : 0;
    this.root.visible = this.visible;
    this._publish();
  }

  setScreenScale(gameScale) {
    if (this.destroyed) return;
    const next = Number.isFinite(gameScale) && gameScale > 0 ? gameScale : 1;
    this.gameScale = next;
    this.mobile = next < 0.7;
    this.baseRadius = Math.min(150, 64 / next);
    this.lineScale = 1 / next;
    this.radius = this.baseRadius;
    this._fitRadius();
    this._publish();
  }

  setPose(x, y, angle) {
    if (this.destroyed) return;
    this.x = x;
    this.y = y;
    this.angle = normalizeBearing(angle);
    this.root.x = x;
    this.root.y = y;
    this._fitRadius();
    this._publish();
  }

  showTurn(previous, signedDegrees, current) {
    if (this.destroyed) return;
    this.turn = interpretSignedTurn(previous, signedDegrees, current);
    this.turn.signedDegrees = signedDegrees;
    const lapInfo = this.turn.fullTurns
      ? ` (${this.turn.fullTurns} full turn${this.turn.fullTurns === 1 ? '' : 's'}${this.turn.remainder ? ` + ${this.turn.remainder}°` : ''})`
      : '';
    this.turn.label = `${signedDegrees > 0 ? '+' : ''}${signedDegrees}°${lapInfo} → ${this.turn.end}°`;
    this.angle = normalizeBearing(current);
    this._publish();
    this.turnClearEvent?.remove(false);
    this.turnClearEvent = this.scene.time.delayedCall(1400, () => {
      this.turnClearEvent = null;
      this.clearTurn();
    });
  }

  clearTurn() {
    if (this.destroyed) return;
    this.turnClearEvent?.remove(false);
    this.turnClearEvent = null;
    this.turn = null;
    this._publish();
  }

  destroy() {
    if (this.destroyed) return;
    this.visible = false;
    this.root.visible = false;
    this.root.alpha = 0;
    this.turnClearEvent?.remove(false);
    this.turnClearEvent = null;
    this.visibilityTween?.stop();
    this.visibilityTween = null;
    this.turn = null;
    this._publish();
    this.destroyed = true;
    this.scene = null;
  }

  _fitRadius() {
    const clearance = 18 * this.lineScale;
    const step = 8 * this.lineScale;
    const available = Math.max(0,
      Math.min(this.x, 800 - this.x, this.y, 600 - this.y) - clearance);
    this.radius = Math.min(this.baseRadius, Math.max(24 * this.lineScale,
      Math.floor(available / step) * step));
  }

  _publish() {
    if (!this.scene || !this.scene.game || this.scene.game._onMathOverlayUpdate == null) return;
    this.scene.game._onMathOverlayUpdate({
      x: this.x,
      y: this.y,
      angle: this.angle,
      visible: this.visible,
      rootVisible: this.root.visible,
      alpha: this.root.alpha,
      turn: this.turn,
      gameScale: this.gameScale,
      lineScale: this.lineScale,
      radius: this.radius,
    });
  }
}
