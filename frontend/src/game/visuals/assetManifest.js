import Phaser from 'phaser';

/**
 * Optional production art used by the premium scene views.
 * Paths are served from Vite's public directory. Legacy theme assets remain
 * available as a complete fallback while this group loads or when an image is
 * missing.
 */
export const VISUAL_TEXTURES = Object.freeze({
  grass: 'premium.grass',
  wallKit: 'premium.wall.kit',
  wallJoin: 'premium.wall.join',
  playerTopDown: 'player',
  playerWalk: 'premium.player.walk',
  golem: 'premium.golem.static',
  golemEyeGlow: 'premium.golem.eye-glow',
  exit: 'premium.exit.base',
  checkpointActive: 'premium.checkpoint.active',
  checkpointClaimed: 'premium.checkpoint.claimed',
});

const VISUAL_ASSETS = Object.freeze({
  grass: {
    key: VISUAL_TEXTURES.grass,
    path: '/assets/premium/environment/grass-reference-v4.jpg',
    normalMapPath: '/assets/premium/environment/grass-reference-v4-normal.png',
  },
  wallKit: {
    key: VISUAL_TEXTURES.wallKit,
    path: '/assets/premium/environment/walls-reference-kit.png',
  },
  wallJoin: {
    key: VISUAL_TEXTURES.wallJoin,
    path: '/assets/premium/environment/wall-join-v1.png',
  },
  player: {
    key: VISUAL_TEXTURES.playerTopDown,
    path: '/assets/premium/characters/player-topdown-v2.png',
    normalMapPath: '/assets/premium/characters/player-normal.png',
  },
  playerWalk: {
    key: VISUAL_TEXTURES.playerWalk,
    path: '/assets/premium/characters/player-walk-cycle-v2-2x.png',
    spriteSheet: { frameWidth: 192, frameHeight: 192 },
  },
  golem: {
    key: VISUAL_TEXTURES.golem,
    path: '/assets/premium/characters/golem-static-v2.png',
  },
  exit: {
    key: VISUAL_TEXTURES.exit,
    path: '/assets/premium/objects/exit-base-v1.png',
  },
  checkpointActive: {
    key: VISUAL_TEXTURES.checkpointActive,
    path: '/assets/premium/objects/checkpoint-active-v3.webp',
  },
  checkpointClaimed: {
    key: VISUAL_TEXTURES.checkpointClaimed,
    path: '/assets/premium/objects/checkpoint-claimed-v3.webp',
  },
});

export const VISUAL_ASSET_GROUPS = Object.freeze({
  environment: Object.freeze(['grass', 'wallKit', 'wallJoin']),
  actors: Object.freeze(['player', 'playerWalk', 'golem']),
  objective: Object.freeze(['exit']),
  checkpoints: Object.freeze(['checkpointActive', 'checkpointClaimed']),
});

const NORMAL_MAPPED_TEXTURE_KEYS = new Set(
  Object.values(VISUAL_ASSETS)
    .filter(asset => asset.normalMapPath)
    .map(asset => asset.key),
);

/** Normal maps and Light2D are WebGL-only; Canvas keeps the painted base art. */
export function supportsPremiumLighting(scene) {
  return scene?.sys?.renderer?.type === Phaser.WEBGL;
}

/** Queue a base image and its optional Phaser-linked normal map. */
export function preloadImageWithNormalMap(scene, key, path, normalMapPath) {
  if (scene.textures.exists(key)) return;
  const url = supportsPremiumLighting(scene) && normalMapPath
    ? [path, normalMapPath]
    : path;
  scene.load.image(key, url);
}

/** Queue optional art without making a missing premium image fatal. */
export function preloadVisualAssets(scene) {
  const selectedLevel = scene.game?._currentLevel ??
    (typeof window !== 'undefined' ? Number(window.__anglemazeInitialLevel) : undefined);

  for (const asset of Object.values(VISUAL_ASSETS)) {
    if (asset.key === VISUAL_TEXTURES.golem && selectedLevel === 1) {
      // Level 1 has no golems; defer this 1 MB texture until Level 2 is selected.
      continue;
    }
    if (asset.spriteSheet) {
      if (!scene.textures.exists(asset.key)) {
        scene.load.spritesheet(asset.key, asset.path, asset.spriteSheet);
      }
    } else {
      preloadImageWithNormalMap(scene, asset.key, asset.path, asset.normalMapPath);
    }
  }
}

/**
 * Enable restrained scene lighting when the browser supports WebGL.
 * The ambient term keeps the existing painted colors readable; one broad,
 * warm key light adds a small amount of form to the supplied normal maps.
 */
export function enablePremiumLighting(scene) {
  if (!supportsPremiumLighting(scene) || !scene.lights) return false;

  scene.lights.enable();
  scene.lights.setAmbientColor(0xcac6bb);
  scene.lights.addLight(110, 80, 1120, 0xfff0d5, 0.32);
  return true;
}

/** Build a small emissive eye overlay from the approved golem art itself. */
export function prepareGolemEyeGlowTexture(scene) {
  const glowKey = VISUAL_TEXTURES.golemEyeGlow;
  if (scene.textures.exists(glowKey)) return true;
  if (!scene.textures.exists(VISUAL_TEXTURES.golem) || typeof document === 'undefined') return false;

  const source = scene.textures.get(VISUAL_TEXTURES.golem)?.source?.[0]?.image;
  if (!source) return false;

  // The golem is displayed at 100px. Build this aligned mask at 2x display
  // resolution so it remains crisp while avoiding a second full-size texture.
  const size = 200;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = size;
  maskCanvas.height = size;
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskContext) return false;
  maskContext.drawImage(source, 0, 0, size, size);

  const mask = maskContext.getImageData(0, 0, size, size);
  let eyePixels = 0;
  const minX = Math.floor(size * 0.36);
  const maxX = Math.ceil(size * 0.64);
  const minY = Math.floor(size * 0.6);
  const maxY = Math.ceil(size * 0.78);
  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      const pixel = (y * size + x) * 4;
      const red = mask.data[pixel];
      const green = mask.data[pixel + 1];
      const blue = mask.data[pixel + 2];
      const alpha = mask.data[pixel + 3];
      if (alpha < 32 || red < 190 || green < 90 || green > 235 || blue > 105 ||
          red < green * 1.08 || green < blue * 1.5) continue;

      // Keep only the warm gold pixels in the lower central face. Tinting
      // these sampled pixels preserves the authored eye shape and alignment.
      mask.data[pixel] = 255;
      mask.data[pixel + 1] = 174;
      mask.data[pixel + 2] = 35;
      mask.data[pixel + 3] = Math.round(alpha * 0.72);
      eyePixels += 1;
    }
  }
  if (eyePixels < 8) return false;
  maskContext.putImageData(mask, 0, 0);

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = size;
  glowCanvas.height = size;
  const glowContext = glowCanvas.getContext('2d');
  if (!glowContext) return false;
  if ('filter' in glowContext) glowContext.filter = 'blur(5px)';
  glowContext.globalAlpha = 0.65;
  glowContext.drawImage(maskCanvas, 0, 0);
  glowContext.filter = 'none';
  glowContext.globalAlpha = 0.35;
  glowContext.drawImage(maskCanvas, 0, 0);

  const texture = scene.textures.addCanvas(glowKey, glowCanvas);
  texture?.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
  return scene.textures.exists(glowKey);
}

/** Release golem-only textures when the current level has no golems. */
export function releaseGolemVisualTextures(scene) {
  const keys = [VISUAL_TEXTURES.golemEyeGlow, VISUAL_TEXTURES.golem];
  for (const key of keys) {
    if (!scene.textures.exists(key)) continue;
    const inUse = scene.children.list.some((child) => child.active && child.texture?.key === key);
    if (inUse) return false;
    scene.textures.remove(key);
  }
  return true;
}

/** Apply Light2D only to loaded assets that have a paired normal map. */
export function applyPremiumLighting(scene, gameObject, textureKey) {
  if (!gameObject?.setPipeline || !supportsPremiumLighting(scene) ||
      !scene.lights?.active || !NORMAL_MAPPED_TEXTURE_KEYS.has(textureKey)) {
    return false;
  }

  const texture = scene.textures.get(textureKey);
  if (!texture?.dataSource?.[0]?.image) return false;

  gameObject.setPipeline('Light2D');
  return true;
}

/** Returns true only when every texture required by a named group is present. */
export function areVisualAssetsLoaded(scene, group) {
  const names = VISUAL_ASSET_GROUPS[group];
  if (!names) return false;
  return names.every(name => scene.textures.exists(VISUAL_ASSETS[name].key));
}

/** Use smooth resampling for painted premium art without changing legacy pixels. */
export function applyVisualAssetFiltering(scene) {
  for (const key of Object.values(VISUAL_TEXTURES)) {
    if (scene.textures.exists(key)) {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
}
