// Test-only fixture: imports production scene/config and observes their behavior.
import Phaser from 'phaser';
import config from '../../src/game/config.js';
import wallsLevel2 from '../../src/game/mazeDataLevel2.js';
import { VISUAL_TEXTURES } from '../../src/game/visuals/assetManifest.js';
import { getFootprintPolygon } from '../../src/game/visuals/CollisionGeometry.js';

const params = new URLSearchParams(location.search);
window.__anglemazeInitialLevel = Number(params.get('level') || 1);
const events = [];
const record = (kind, detail = {}) => events.push({ at: performance.now(), kind, ...detail });
const forceCanvas = new URLSearchParams(window.location.search).get('renderer') === 'canvas';
const game = new Phaser.Game({
  ...config,
  type: forceCanvas ? Phaser.CANVAS : config.type,
  parent: 'game-container',
});
const scene = () => game.scene.getScene('MazeScene');
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

game._onReset = (restarted, cfg) => record('reset', { restarted, cfg });
game._onCrash = () => record('crash', { x: scene().player.x, y: scene().player.y });
game._onLivesChanged = (lives, checkpoint) => record('lives', { lives, checkpoint });
game._onRespawn = (x, y) => record('respawn', { x, y });
game._onLevelWin = (level) => record('win', { level });

function bounds(body) {
  return {
    x: body.x, y: body.y, width: body.width, height: body.height,
    cx: body.center.x, cy: body.center.y,
    texture: body.gameObject?.texture?.key ?? null,
    type: body.gameObject?.type ?? null,
  };
}

function resources() {
  const s = scene();
  return {
    displayObjects: s.children.list.length,
    staticBodies: s.physics.world.staticBodies.size,
    dynamicBodies: s.physics.world.bodies.size,
    textures: game.textures.getTextureKeys().length,
    activeTweens: s.tweens.getTweens().length,
    sceneListeners: Object.fromEntries(s.events.eventNames().map((name) => [String(name), s.events.listenerCount(name)])),
  };
}

function snapshot() {
  const s = scene();
  const grassTexture = game.textures.exists(VISUAL_TEXTURES.grass)
    ? game.textures.get(VISUAL_TEXTURES.grass)
    : null;
  return {
    level: game._currentLevel, themed: s._themed, angle: s.facingAngle,
    x: s.player.x, y: s.player.y,
    playerDepth: s.playerSprite.depth,
    golemRenderOrder: s.golemView?.renderOrder ?? [],
    spriteX: s.playerSprite.x, spriteY: s.playerSprite.y,
    playerTexture: s.playerSprite.texture?.key ?? null,
    playerFacingAngle: s.playerSprite.angle,
    playerTopDown: Boolean(s.playerSprite._topDownSprite),
    playerWalkingCue: Boolean(s.playerSprite._walkTweenScale || s.playerSprite._walkCycleActive),
    playerFrame: s.playerSprite.frame?.name ?? null,
    playerAnimation: s.playerSprite.anims?.currentAnim?.key ?? null,
    playerAnimationPlaying: Boolean(s.playerSprite.anims?.isPlaying),
    playerIdle: Boolean(s.playerSprite._idleTween),
    playerImpact: Boolean(s.playerSprite._impactTween),
    playerTurnFeedback: Boolean(s.playerSprite._turnFeedbackTween),
    playerSettle: Boolean(s.playerSprite._settleTween),
    playerSettleShadow: Boolean(s.playerSprite._settleShadowTween),
    playerContactShadow: s.playerSprite._contactShadow ? {
      scaleX: s.playerSprite._contactShadow.scaleX,
      scaleY: s.playerSprite._contactShadow.scaleY,
      alpha: s.playerSprite._contactShadow.alpha,
    } : null,
    checkpointGlow: s.checkpointGlowView ? {
      active: s.checkpointGlowView.isActive,
      pulseActive: s.checkpointGlowView.pulseActive,
      position: s.checkpointGlowView.position,
      alpha: s.checkpointGlowView.alpha,
    } : null,
    protractor: s.protractorView ? {
      visible: s.protractorView.visible,
      rootVisible: s.protractorView.root.visible,
      alpha: s.protractorView.root.alpha,
      transitionActive: Boolean(s.protractorView.visibilityTween?.isPlaying()),
      x: s.protractorView.root.x,
      y: s.protractorView.root.y,
    } : null,
    playerDisplaySize: { width: s.playerSprite.displayWidth, height: s.playerSprite.displayHeight },
    playerPipeline: s.playerSprite.getPipelineName?.() ?? null,
    playerGolemFootprint: s.playerGolemFootprint,
    playerRotationForCollision: (90 - s.facingAngle),
    playerBody: bounds(s.player.body),
    moving: s.isMoving, resetting: s.isResetting, won: s.hasWon,
    reducedMotion: Boolean(s._reducedMotion),
    visuals: {
      grassTexture: VISUAL_TEXTURES.grass,
      wallTexture: VISUAL_TEXTURES.wallKit,
      wallJoinTextureLoaded: game.textures.exists(VISUAL_TEXTURES.wallJoin),
      playerTexture: s.playerSprite.texture?.key ?? null,
      playerWalkFrameCount: game.textures.exists(VISUAL_TEXTURES.playerWalk)
        ? Object.keys(game.textures.get(VISUAL_TEXTURES.playerWalk).frames)
          .filter((name) => name !== '__BASE').length
        : 0,
      light2DEnabled: Boolean(s._premiumLightingEnabled),
      light2DObjectCount: s.children.list.filter(object => object.pipeline?.name === 'Light2D').length,
      normalMappedTextures: Object.values(VISUAL_TEXTURES)
        .filter((key, index, keys) => keys.indexOf(key) === index)
        .filter(key => game.textures.get(key)?.dataSource?.[0]?.image),
      pixelArt: config.pixelArt,
      premiumTextureFilter: grassTexture?.source?.[0]?.scaleMode ?? null,
      playerShadow: s.playerSprite?._groundShadow
        ? { x: s.playerSprite._groundShadow.x, y: s.playerSprite._groundShadow.y }
        : null,
      playerContactShadow: Boolean(s.playerSprite?._contactShadow),
      wallSegmentCount: s.environmentView?.wallSegmentCount ?? 0,
      wallModuleCount: s.environmentView?.wallModuleCount ?? 0,
      wallJunctionCount: s.environmentView?.wallJunctionCount ?? 0,
      wallJunctions: s.environmentView?.wallJunctions ?? [],
      wallRasterWidth: s.environmentView?.wallRasterWidth ?? 0,
      wallKitTextureSources: [VISUAL_TEXTURES.wallKit, `${VISUAL_TEXTURES.wallKit}.diagonal.horizontal`, VISUAL_TEXTURES.wallJoin]
        .map((key) => {
          const source = game.textures.get(key)?.source?.[0];
          return source ? { key, width: source.width, height: source.height } : null;
        })
        .filter(Boolean),
      checkpointStateTextures: [VISUAL_TEXTURES.checkpointActive, VISUAL_TEXTURES.checkpointClaimed]
        .filter(key => game.textures.exists(key)),
      checkpointTextureInfo: [VISUAL_TEXTURES.checkpointActive, VISUAL_TEXTURES.checkpointClaimed]
        .filter(key => game.textures.exists(key))
        .map((key) => {
          const image = game.textures.get(key)?.source?.[0]?.image;
          if (!image?.getContext) return { key, width: image?.width ?? 0, height: image?.height ?? 0 };
          return {
            key,
            width: image.width,
            height: image.height,
            alphaCorner: image.getContext('2d').getImageData(0, 0, 1, 1).data[3],
          };
        }),
      checkpointStates: Object.values(s._checkpointSprites ?? {})
        .map(sprite => sprite.getData('checkpointState') ?? null),
      golemCount: s.golemView?.count ?? 0,
      golemShadowCount: s.golemView?.shadowCount ?? 0,
      golemEyeGlowTextureLoaded: game.textures.exists(VISUAL_TEXTURES.golemEyeGlow),
      golemEyeGlowCount: s.golemView?.eyeGlowCount ?? 0,
      golemHitboxCount: s.golemCollisionShapes?.length ?? 0,
      golemCollisionShapeCount: s.golemCollisionShapes?.length ?? 0,
      golemAlphaFootprint: s.golemAlphaFootprint,
      golemFacingDegrees: s.golemView?.facingAngles ?? [],
      collisionDebugEnabled: Boolean(s._collisionDebugEnabled),
      exitProximityAlpha: s.exitVisual?.proximityAlpha ?? null,
      exitActivated: s.exitVisual?.isActivated ?? false,
    },
    lives: game._lives, checkpoint: game._activeCheckpoint,
    lastCollisionCause: s._lastCollisionCause ?? null,
    lastCollisionDetails: s._lastCollisionDetails ?? null,
    renderer: game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
    world: { width: s.physics.world.bounds.width, height: s.physics.world.bounds.height },
    resources: resources(),
  };
}

async function ready() {
  for (let i = 0; i < 200; i += 1) {
    if (scene()?.player?.body && scene().coordText) return snapshot();
    await pause(50);
  }
  throw new Error('Actual scene did not become ready');
}

async function restart(level = game._currentLevel) {
  const s = scene();
  const oldPlayer = s.player;
  s.setLevel(level);
  for (let i = 0; i < 100; i += 1) {
    await pause(30);
    if (scene().player !== oldPlayer && scene().coordText) return snapshot();
  }
  throw new Error('Scene restart timed out');
}

// Explicit test setup only. Movement commands below always call actual scene methods.
function place(x, y, angle) {
  const s = scene();
  if (s.isMoving || s.isResetting || s.hasWon) {
    throw new Error(`Place requires idle scene (moving=${s.isMoving}, resetting=${s.isResetting}, won=${s.hasWon})`);
  }
  s.player.body.reset(x, y);
  s._lastGolemCollisionPosition = { x, y };
  s.playerSprite.setPosition(x, y);
  s.playerSprite._groundShadow?.setPosition(x + 2, y + 18);
  s.playerSprite._contactShadow?.setPosition(x, y + 17);
    s._syncPlayerVisuals();
  s.facingAngle = angle;
  s.playerSprite.setAngle(90 - angle);
  s.setPreviewAngle(angle);
  record('fixture-placement', { x, y, angle });
  return snapshot();
}

// Geometry-only probe for the visible player/golem footprints. It omits
// callbacks so each sample can reset without changing lives or scene state.
function probeGolemCollision(x, y, angle = 0) {
  const s = scene();
  if (!s.golemCollisionShapes?.length) {
    throw new Error('Level 2 golem hitboxes are unavailable');
  }
  s.player.body.reset(x, y);
  s._lastGolemCollisionPosition = { x, y };
  s.facingAngle = angle;
  s.setPreviewAngle(angle);
  s.playerSprite.setAngle(90 - angle);
  return {
    detected: s._pathOverlapsGolem(x, y, x, y),
    player: { x: s.player.x, y: s.player.y, angle: s.facingAngle },
    playerFootprint: s.playerGolemFootprint,
    golemFootprint: s.golemAlphaFootprint,
    golemShapes: s.golemCollisionShapes.map(shape => ({
      x: shape.x,
      y: shape.y,
      footprint: shape.footprint,
    })),
  };
}

function verifyGolemFootprint() {
  const s = scene();
  const footprint = s.playerGolemFootprint;
  const firstGolem = s.golemCollisionShapes?.[0];
  if (!firstGolem) throw new Error('Level 2 golem hitboxes are unavailable');
  const center = { x: firstGolem.x, y: firstGolem.y };
  const directions = [
    ['above', 0, -1], ['below', 0, 1], ['left', -1, 0], ['right', 1, 0],
    ['diagonal-nw', -Math.SQRT1_2, -Math.SQRT1_2],
    ['diagonal-se', Math.SQRT1_2, Math.SQRT1_2],
  ];
  const dot = (ax, ay, bx, by) => ax * bx + ay * by;
  const samples = directions.flatMap(([name, nx, ny]) => {
    const facingAngle = (Math.atan2(ny, -nx) * 180 / Math.PI + 360) % 360;
    const spriteAngle = (90 - facingAngle) * Math.PI / 180;
    const axisX = { x: Math.cos(spriteAngle), y: Math.sin(spriteAngle) };
    const axisY = { x: -axisX.y, y: axisX.x };
    const playerReach = footprint.polygon?.length
      ? Math.max(...footprint.polygon.map(point => dot(
        point.x * axisX.x + point.y * axisY.x,
        point.x * axisX.y + point.y * axisY.y,
        nx,
        ny,
      )))
      : Math.hypot(
        footprint.halfWidth * dot(nx, ny, axisX.x, axisX.y),
        footprint.halfHeight * dot(nx, ny, axisY.x, axisY.y),
      ) + footprint.offsetX * nx + footprint.offsetY * ny;
    const golemReach = Math.max(...getFootprintPolygon(firstGolem.footprint)
      .map(point => dot(point.x, point.y, nx, ny)));
    // Offset by enough to cover non-radial vertex contact on diagonal hull edges.
    const margin = 12;
    const sample = (gap) => ({
      x: center.x + nx * (playerReach + golemReach + gap),
      y: center.y + ny * (playerReach + golemReach + gap),
      angle: facingAngle,
    });
    return [
      { name: `${name}-gap`, expected: false, ...sample(margin) },
      { name: `${name}-contact`, expected: true, ...sample(-margin) },
    ];
  }).map(({ name, expected, x, y, angle }) => {
    const actual = probeGolemCollision(x, y, angle).detected;
    return { name, expected, actual, pass: actual === expected };
  });
  const rotations = [0, 45, 90, 135, 180, 225, 270, 315].map(angle => ({
    angle,
    detected: probeGolemCollision(center.x, center.y, angle).detected,
  }));
  probeGolemCollision(20, 295, 0);
  return {
    footprint,
    golemFootprint: s.golemAlphaFootprint,
    samples,
    rotations,
    swept: s._pathOverlapsGolem(20, 295, 220, 295),
  };
}

function verifyGolemTracking(playerX, playerY, frames = 90) {
  const s = scene();
  if (!s.golemView?.facePosition || !Number.isFinite(playerX) || !Number.isFinite(playerY)) {
    throw new Error('Golem visual tracking is unavailable');
  }
  const before = s.golemView.facingAngles;
  const previousPosition = { x: s.player.x, y: s.player.y };
  s.player.body.reset(playerX, playerY);
  s.playerSprite.setPosition(playerX, playerY);
  s.update(0, 16);
  const eased = s.golemView.facingAngles;
  for (let frame = 1; frame < frames; frame += 1) s.update(frame * 16, 16);
  const settled = s.golemView.facingAngles;
  const targets = s.golemCollisionShapes.map((golemShape) => {
    const golemCenter = golemShape;
    return Math.atan2(playerY - golemCenter.y, playerX - golemCenter.x) * 180 / Math.PI - 90;
  });
  const angularError = (actual, target) => Math.abs(Math.atan2(
    Math.sin((actual - target) * Math.PI / 180),
    Math.cos((actual - target) * Math.PI / 180),
  )) * 180 / Math.PI;
  s.player.body.reset(previousPosition.x, previousPosition.y);
  s.playerSprite.setPosition(previousPosition.x, previousPosition.y);
  s._lastGolemCollisionPosition = previousPosition;
  for (let frame = 0; frame < frames; frame += 1) s.update((frame + frames) * 16, 16);
  s._checkGolemCollision();
  return {
    before,
    eased,
    settled,
    targets,
    errors: settled.map((angle, index) => angularError(angle, targets[index])),
    movedSmoothly: eased.some((angle, index) => angularError(angle, before[index]) > 0.01 &&
      angularError(angle, targets[index]) < angularError(before[index], targets[index])),
    restoredTo: previousPosition,
  };
}

async function command(kind, value) {
  const s = scene();
  const before = snapshot();
  const eventStart = events.length;
  let result;
  if (kind === 'forward') {
    result = s.goForward(value, (x, y) => record('move-complete', { x, y }));
  } else if (kind === 'left') result = s.turnLeft(value);
  else if (kind === 'right') result = s.turnRight(value);
  else throw new Error('Unknown command');
  record('command', { kind, value, result: result ?? null });
  if (kind === 'forward' && result) {
    for (let i = 0; i < 200 && s.isMoving && !s.hasWon && !s.isResetting; i += 1) await pause(20);
  } else await pause(230);
  return { command: { kind, value, result: result ?? null }, before, after: snapshot(), events: events.slice(eventStart) };
}

function collisionInventory() {
  const s = scene();
  const statics = [...s.physics.world.staticBodies.entries].map(bounds);
  const walls = s.wallGroup.getChildren().map((item) => bounds(item.body));
  const hazards = wallsLevel2.filter((wall) => Math.abs(wall.x2 - wall.x1) === 1 && Math.abs(wall.y2 - wall.y1) === 1);
  return {
    staticBodies: statics,
    wallBodies: walls,
    golemHitboxes: s.golemCollisionShapes?.map(({ x, y, footprint }) => ({
      x, y, width: footprint.halfWidth * 2, height: footprint.halfHeight * 2, type: 'opaque-alpha-hull',
    })) ?? [],
    exitCandidates: statics.filter((body) => body.texture === 'exit' ||
      ((body.width === 40 || body.width === 64) && body.width === body.height)),
    enemyHazards: game._currentLevel === 2 ? hazards.map((source) => ({
      source,
      bodies: walls.filter((body) => body.width === 8 && body.height === 8 &&
        Math.hypot(body.cx - source.x1, body.cy - source.y1) < 8.1),
    })) : [],
  };
}

async function frameSample(durationMs) {
  const intervals = [];
  let previous = performance.now();
  const onFrame = () => {
    const now = performance.now();
    intervals.push(now - previous);
    previous = now;
  };
  scene().events.on('postupdate', onFrame);
  await pause(durationMs);
  scene().events.off('postupdate', onFrame);
  const sorted = intervals.slice(1).sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return { durationMs, frames: sorted.length, p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99), stallsOver50ms: sorted.filter((ms) => ms > 50).length, resources: resources() };
}

async function activeFrameSample(durationMs) {
  const s = scene();
  if (s.isMoving || s.isResetting || s.hasWon) throw new Error('Active sample requires an idle scene');
  const start = place(80, 530, 0);

  const intervals = [];
  let previous = performance.now();
  const startedAt = previous;
  const deadline = startedAt + durationMs;
  const onFrame = () => {
    const now = performance.now();
    intervals.push(now - previous);
    previous = now;
  };
  s.events.on('postupdate', onFrame);

  let moves = 0;
  let turns = 0;
  let rejectedReason = null;
  const firstMoves = [];
  const lastMoves = [];
  let minX = start.x;
  let maxX = start.x;
  const movementLoop = async () => {
    while (performance.now() < deadline && !s.isResetting && !s.hasWon) {
      // Recompute each leg from the authoritative physics position. This is a
      // realistic student adjustment after a measured move and prevents the
      // sampling harness from accumulating timer/frame rounding over many
      // reversals. The route remains inside x=80..180, y=530.
      const targetX = s.facingAngle === 0 ? 180 : 80;
      const distance = Math.abs(targetX - s.player.x);
      if (distance < 1) {
        const facing = s.turnRight(180);
        if (facing === undefined) {
          rejectedReason = 'turn-rejected-at-waypoint';
          break;
        }
        turns += 1;
        continue;
      }
      const completed = await new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          resolve(value);
        };
        const timeout = window.setTimeout(() => finish({ timeout: true }), 1500);
        const accepted = s.goForward(distance, (x, y) => finish({ accepted: true, x, y }));
        if (!accepted) finish({ accepted: false });
      });
      if (!completed.accepted) {
        rejectedReason = completed.timeout ? 'move-timeout' : 'move-rejected';
        break;
      }
      moves += 1;
      const point = { x: completed.x, y: completed.y, facing: s.facingAngle };
      if (firstMoves.length < 8) firstMoves.push(point);
      lastMoves.push(point);
      if (lastMoves.length > 8) lastMoves.shift();
      minX = Math.min(minX, completed.x);
      maxX = Math.max(maxX, completed.x);
      if (performance.now() < deadline) {
        const facing = s.turnRight(180);
        if (facing === undefined) {
          rejectedReason = `turn-rejected-moving-${s.isMoving}-resetting-${s.isResetting}-won-${s.hasWon}`;
          break;
        }
        turns += 1;
      }
    }
  };

  await Promise.all([movementLoop(), pause(durationMs)]);
  s.events.off('postupdate', onFrame);
  const sorted = intervals.slice(1).sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const after = snapshot();
  return {
    durationMs,
    frames: sorted.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    stallsOver50ms: sorted.filter((ms) => ms > 50).length,
    moves,
    turns,
    rejectedReason,
    startPosition: { x: start.x, y: start.y },
    firstMoves,
    lastMoves,
    xRange: { min: minX, max: maxX },
    finalPosition: { x: after.x, y: after.y },
    lives: after.lives,
    lastCollisionCause: after.lastCollisionCause,
    moving: after.moving,
    resetting: after.resetting,
    won: after.won,
    resources: resources(),
  };
}

window.anglemazeBaseline = { game, scene, ready, snapshot, resources, collisionInventory, restart, place, probeGolemCollision, verifyGolemFootprint, verifyGolemTracking, command, frameSample, activeFrameSample, events };

// Expose the actual Phaser backend to headless browser checks that use Chrome's
// --dump-dom mode instead of the stalled CDP Page domain.
ready().then((state) => {
  document.body.dataset.sceneReady = 'true';
  document.body.dataset.renderer = state.renderer.toLowerCase();
  document.body.dataset.premiumLighting = String(state.visuals.light2DEnabled);
  document.body.dataset.normalMappedTextures = state.visuals.normalMappedTextures.join(',');
}).catch((error) => {
  document.body.dataset.sceneReady = 'false';
  document.body.dataset.sceneError = String(error?.message ?? error);
});

if (params.get('probeWall') === '1') {
  (async () => {
    try {
      await ready();
      place(30, 60, 180);
      const wallScene = scene();
      const started = wallScene.goForward(30);
      const startTime = performance.now();
      let frames = 0;
      while (frames < 30 && !wallScene.isResetting) {
        wallScene.sys.step(startTime + frames * (1000 / 60), 1000 / 60);
        frames += 1;
      }
      const result = snapshot();
      document.body.dataset.wallProbePassed = String(
        started && result.lastCollisionCause === 'wall' && result.lives === 4 && result.resetting,
      );
      document.body.dataset.wallProbeResult = JSON.stringify({
        started,
        frames,
        lives: result.lives,
        cause: result.lastCollisionCause,
        contact: result.lastCollisionDetails,
        position: { x: result.x, y: result.y },
      });
    } catch (error) {
      document.body.dataset.wallProbePassed = 'false';
      document.body.dataset.wallProbeResult = String(error?.message ?? error);
    }
  })();
}
