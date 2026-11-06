import { applyPremiumLighting } from './assetManifest.js';
import { drawWallKit } from './WallKit.js';

// The fixed maze is 800 world units wide: one full-resolution authored tile
// fills the playfield, avoiding the visible 512-unit flower/leaf repeat grid.
const GRASS_WORLD_TILE_SIZE = 800;

/** Display-only terrain and authored timber; maze physics remains in MazeScene. */
export function EnvironmentView(scene, options = {}) {
  const { width = 800, height = 600, textureKeys = {} } = options;
  const keys = {
    grass: textureKeys.grass ?? 'premium.grass',
    wallKit: textureKeys.wallKit ?? 'premium.wall.kit',
    wallJoin: textureKeys.wallJoin ?? 'premium.wall.join',
  };
  const ownedObjects = [];
  let wallSegmentCount = 0;
  let wallModuleCount = 0;
  let wallJunctionCount = 0;
  let wallJunctions = [];
  let wallRasterWidth = 0;
  let destroyed = false;

  const remember = object => {
    if (object) ownedObjects.push(object);
    return object;
  };

  function drawBackground() {
    if (destroyed) return null;
    const background = remember(scene.add.tileSprite(0, 0, width, height, keys.grass)
      .setOrigin(0, 0)
      .setTileScale(GRASS_WORLD_TILE_SIZE / 1254)
      .setDepth(-10));
    applyPremiumLighting(scene, background, keys.grass);
    return background;
  }

  function drawWalls(walls = []) {
    if (destroyed) return null;
    const wallComposite = drawWallKit(scene, walls, {
      textureKey: keys.wallKit,
      junctionTextureKey: keys.wallJoin,
      width,
      height,
    });
    remember(wallComposite);
    wallSegmentCount = wallComposite?.getData('wallSegmentCount') ?? 0;
    wallModuleCount = wallComposite?.getData('wallModuleCount') ?? 0;
    wallJunctionCount = wallComposite?.getData('wallJunctionCount') ?? 0;
    wallJunctions = wallComposite?.getData('wallJunctions') ?? [];
    wallRasterWidth = wallComposite?.getData('wallRasterWidth') ?? 0;
    return wallComposite;
  }

  return {
    drawBackground,
    drawWalls,
    get wallSegmentCount() { return wallSegmentCount; },
    get wallModuleCount() { return wallModuleCount; },
    get wallJunctionCount() { return wallJunctionCount; },
    get wallJunctions() { return wallJunctions; },
    get wallRasterWidth() { return wallRasterWidth; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ownedObjects.forEach(object => object.destroy());
      ownedObjects.length = 0;
    },
  };
}

export default EnvironmentView;
