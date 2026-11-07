import { bearingVector, interpretSignedTurn, normalizeBearing } from './angleGeometry.js';

/** World-fixed, non-interactive 360-degree player bearing overlay. */
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
    this.mobile = Boolean(options.mobile);
    this.root = scene.add.container(0, 0).setDepth(options.depth ?? 1000).setAlpha(0).setVisible(false);
    this.staticGfx = scene.add.graphics();
    this.liveGfx = scene.add.graphics();
    this.root.add([this.staticGfx, this.liveGfx]);
    this.turnLabel = scene.add.text(0, 0, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '11px',
      color: '#ffffff', backgroundColor: '#14202bcc', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setVisible(false);
    this.root.add(this.turnLabel);
    this.labels = [];
    this.radius = 64;
    this.fontSize = 12;
    this.lineScale = 1;
    this._rebuildStatic();
  }

  setVisible(value) {
    if (this.destroyed) return;
    const nextVisible = Boolean(value);
    this.visible = nextVisible;
    if (!this.visible) this.clearTurn();
    this.visibilityTween?.stop();
    this.visibilityTween = null;

    const targetAlpha = this.visible ? 1 : 0;
    if (this.reducedMotion) {
      this.root.setVisible(this.visible).setAlpha(targetAlpha);
      return;
    }

    if (this.visible) this.root.setVisible(true);
    if (Math.abs(this.root.alpha - targetAlpha) < 0.001) {
      this.root.setAlpha(targetAlpha).setVisible(this.visible);
      return;
    }

    this.visibilityTween = this.scene.tweens.add({
      targets: this.root,
      alpha: targetAlpha,
      duration: 120,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.visibilityTween = null;
        this.root.setVisible(this.visible);
      },
    });
  }

  setReducedMotion(reduced) {
    if (this.destroyed) return;
    this.reducedMotion = Boolean(reduced);
    if (!this.reducedMotion) return;

    this.visibilityTween?.stop();
    this.visibilityTween = null;
    this.root.setVisible(this.visible).setAlpha(this.visible ? 1 : 0);
  }

  setScreenScale(gameScale) {
    if (this.destroyed) return;
    const next = Number.isFinite(gameScale) && gameScale > 0 ? gameScale : 1;
    const nextMobile = next < 0.7;
    if (Math.abs(next - this.gameScale) < 0.0001 && nextMobile === this.mobile) return;
    this.gameScale = next;
    this.mobile = nextMobile;
    this._rebuildStatic();
    this._drawLive();
  }

  setPose(x, y, angle) {
    if (this.destroyed) return;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.root.setPosition(x, y);
    const clearance = 18 * this.lineScale;
    const step = 8 * this.lineScale;
    const available = Math.max(0, Math.min(x, 800 - x, y, 600 - y) - clearance);
    const fittedRadius = Math.min(this.baseRadius, Math.max(24 * this.lineScale,
      Math.floor(available / step) * step));
    if (Math.abs(fittedRadius - this.radius) > 0.5) {
      this.radius = fittedRadius;
      this._rebuildStatic(true);
    }
    if (this.turnLabel.visible) this._positionTurnLabel();
    this._drawLive();
  }

  showTurn(previous, signedDegrees, current) {
    if (this.destroyed) return;
    this.turn = interpretSignedTurn(previous, signedDegrees, current);
    this.angle = current;
    const sign = signedDegrees > 0 ? '+' : '';
    const lapInfo = this.turn.fullTurns ? ` (${this.turn.fullTurns} full turn${this.turn.fullTurns === 1 ? '' : 's'}${this.turn.remainder ? ` + ${this.turn.remainder}°` : ''})` : '';
    this.turnLabel.setText(`${sign}${signedDegrees}°${lapInfo} → ${this.turn.end}°`)
      .setFontSize(`${Math.max(9, 11 / this.gameScale)}px`)
      .setVisible(true);
    this._positionTurnLabel();
    this.turnClearEvent?.remove(false);
    this.turnClearEvent = this.scene.time.delayedCall(1400, () => {
      this.turnClearEvent = null;
      this.clearTurn();
    });
    this._drawLive();
  }

  clearTurn() {
    if (this.destroyed) return;
    this.turnClearEvent?.remove(false);
    this.turnClearEvent = null;
    this.turn = null;
    this.turnLabel.setVisible(false);
    this._drawLive();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.visibilityTween?.stop();
    this.visibilityTween = null;
    this.turnClearEvent?.remove(false);
    this.turnClearEvent = null;
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    this.root.destroy(true);
    this.scene = null;
  }

  _rebuildStatic(preserveFittedRadius = false) {
    if (this.destroyed) return;
    const scale = this.gameScale;
    this.baseRadius = Math.min(150, 64 / scale);
    this.radius = preserveFittedRadius
      ? Math.min(this.radius, this.baseRadius)
      : this.baseRadius;
    this.fontSize = 12 / scale;
    this.lineScale = 1 / scale;
    const step = this.mobile ? 10 : 5;
    this.staticGfx.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];

    // A lightly backed rim keeps markings readable without obscuring the maze.
    this.staticGfx.lineStyle(5 * this.lineScale, 0x14202b, 0.18);
    this.staticGfx.strokeCircle(0, 0, this.radius);
    this.staticGfx.lineStyle(1.5 * this.lineScale, 0xc6d8e5, 0.72);
    this.staticGfx.strokeCircle(0, 0, this.radius);

    for (let degree = 0; degree < 360; degree += step) {
      const v = bearingVector(degree);
      const cardinal = degree % 90 === 0;
      const major = degree % 30 === 0;
      const length = cardinal ? 12 : major ? 8 : 4;
      this.staticGfx.lineStyle((cardinal ? 2 : major ? 1.4 : 0.8) * this.lineScale,
        cardinal ? 0xf0f4f7 : 0xc6d8e5, cardinal ? 0.95 : 0.65);
      this.staticGfx.beginPath();
      this.staticGfx.moveTo(v.x * (this.radius - length), v.y * (this.radius - length));
      this.staticGfx.lineTo(v.x * this.radius, v.y * this.radius);
      this.staticGfx.strokePath();
    }

    const labelDegrees = this.mobile ? [0, 90, 180, 270] : Array.from({ length: 12 }, (_, i) => i * 30);
    labelDegrees.forEach((degree) => {
      const v = bearingVector(degree);
      const distance = this.radius + 14 * this.lineScale;
      const label = this.scene.add.text(v.x * distance, v.y * distance, `${degree}°`, {
        fontFamily: 'Arial, sans-serif', fontSize: `${this.fontSize}px`,
        color: '#f1f6fa', fontStyle: degree % 90 === 0 ? 'bold' : 'normal',
        backgroundColor: '#14202b66', padding: { x: 2 * this.lineScale, y: this.lineScale },
      }).setOrigin(0.5);
      this.root.add(label);
      this.labels.push(label);
    });
    this._drawLive();
  }

  _positionTurnLabel() {
    // Put the annotation toward the interior of the canvas at maze edges.
    const x = this.x > 400 ? -this.radius : this.radius;
    const y = this.y > 300
      ? -this.radius - 26 * this.lineScale
      : this.radius + 26 * this.lineScale;
    this.turnLabel.setPosition(x, y);
  }

  _drawLive() {
    if (this.destroyed) return;
    const gfx = this.liveGfx;
    gfx.clear();
    const bearing = normalizeBearing(this.angle);
    const v = bearingVector(bearing);
    const tip = this.radius - 15 * this.lineScale;
    gfx.lineStyle(2.5 * this.lineScale, 0xffbd45, 0.96);
    gfx.beginPath();
    gfx.moveTo(0, 0);
    gfx.lineTo(v.x * tip, v.y * tip);
    gfx.strokePath();
    const side = bearingVector(bearing + 150);
    const side2 = bearingVector(bearing - 150);
    gfx.fillStyle(0xffbd45, 0.98);
    gfx.fillTriangle(v.x * tip, v.y * tip,
      v.x * (tip - 10 * this.lineScale) + side.x * 5 * this.lineScale,
      v.y * (tip - 10 * this.lineScale) + side.y * 5 * this.lineScale,
      v.x * (tip - 10 * this.lineScale) + side2.x * 5 * this.lineScale,
      v.y * (tip - 10 * this.lineScale) + side2.y * 5 * this.lineScale);

    if (this.turn) this._drawTurnArc(this.turn);
  }

  _drawTurnArc(turn) {
    const gfx = this.liveGfx;
    const arcRadius = Math.max(8 * this.lineScale, this.radius * 0.54);
    const direction = turn.direction || 1;
    const sweep = direction * (turn.remainder || (turn.fullTurns ? 360 : 0));
    if (sweep) {
      const start = (turn.start * Math.PI) / 180;
      const end = start + (sweep * Math.PI) / 180;
      gfx.lineStyle(2 * this.lineScale, 0x72d6c3, 0.78);
      // Segmented explicitly in signed command direction; cap display at one lap.
      const shown = Math.min(Math.abs(sweep), 360) * direction;
      const count = Math.max(2, Math.ceil(Math.abs(shown) / 8));
      gfx.beginPath();
      for (let i = 0; i <= count; i += 1) {
        const angle = start + (end - start) * (i / count);
        const point = bearingVector((angle * 180) / Math.PI);
        if (i === 0) gfx.moveTo(point.x * arcRadius, point.y * arcRadius);
        else gfx.lineTo(point.x * arcRadius, point.y * arcRadius);
      }
      gfx.strokePath();
    }
  }
}
