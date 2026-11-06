/** Phaser texture-frame crops measured from the owner's transparent wall sheet. */
export const WALL_KIT_FRAMES = Object.freeze({
  horizontalLong: Object.freeze({ x: 58, y: 86, width: 665, height: 155 }),
  horizontalShort: Object.freeze({ x: 782, y: 88, width: 221, height: 153 }),
  verticalShort: Object.freeze({ x: 1064, y: 78, width: 131, height: 165 }),
  verticalLong: Object.freeze({ x: 68, y: 302, width: 149, height: 831 }),
  // Stop before the neighboring L-corner sprite, which begins at x=744.
  diagonal: Object.freeze({ x: 288, y: 470, width: 455, height: 425 }),
  cornerUpRight: Object.freeze({ x: 784, y: 300, width: 405, height: 387 }),
  cornerElbow: Object.freeze({ x: 744, y: 746, width: 435, height: 387 }),
});

const WALL_THICKNESS = 28;
const WALL_RASTER_SCALE = 2;
const MIN_VISIBLE_WALL_LENGTH = 2;
const AXIS_TOLERANCE = Math.sin(12 * Math.PI / 180);
const JOINT_OVERLAP = 1.035;
const JUNCTION_ANGLE_EPSILON = 1e-3;
const HORIZONTAL_DIAGONAL_KEY_SUFFIX = '.diagonal.horizontal';
// Screen-space light/view direction used by the authored bevels: the bright
// edge is upper-left and the visible thickness/shadow falls lower-right.
const WALL_PROJECTION_X = 1;
const WALL_PROJECTION_Y = 1;
// Measured along the two long edges of the supplied diagonal wall sprite.
const DIAGONAL_ART_ANGLE = Math.atan2(-381, 441);

/**
 * The normalized diagonal art has its visible side on local +Y. After rotation,
 * choose the side whose normal faces the same lower-right screen projection as
 * the horizontal and vertical wall frames. This avoids switching the bevel to
 * the far side when a maze segment changes slope.
 */
export function shouldFlipDiagonalWallSide(angle) {
  const undirectedAngle = normalizeUndirectedAngle(angle);
  const sideNormalX = -Math.sin(undirectedAngle);
  const sideNormalY = Math.cos(undirectedAngle);
  const projection = sideNormalX * WALL_PROJECTION_X + sideNormalY * WALL_PROJECTION_Y;
  return projection < -1e-8;
}

/** Add named frames to the loaded sheet once; original image data stays intact. */
export function registerWallKitFrames(scene, textureKey) {
  const texture = scene.textures.get(textureKey);
  if (!texture?.add) return false;

  for (const [name, bounds] of Object.entries(WALL_KIT_FRAMES)) {
    if (!texture.frames[name]) {
      texture.add(name, 0, bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }

  return Object.keys(WALL_KIT_FRAMES).every(name => Boolean(texture.frames[name]));
}

/**
 * Rotate the diagonal beam into a horizontal local frame once. This lets the
 * renderer scale length and thickness independently, keeping short maze edges
 * as substantial beams instead of shrinking them into slivers.
 */
function createHorizontalDiagonalTexture(scene, textureKey) {
  const key = `${textureKey}${HORIZONTAL_DIAGONAL_KEY_SUFFIX}`;
  if (scene.textures.exists(key)) return key;
  if (typeof document === 'undefined') return null;

  const sourceTexture = scene.textures.get(textureKey);
  const sourceImage = sourceTexture?.source?.[0]?.image;
  const frame = sourceTexture?.frames?.diagonal;
  if (!sourceImage || !frame) return null;

  const scratchSize = Math.ceil(Math.hypot(frame.width, frame.height)) + 8;
  const scratch = document.createElement('canvas');
  scratch.width = scratchSize;
  scratch.height = scratchSize;
  const context = scratch.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.translate(scratchSize / 2, scratchSize / 2);
  context.rotate(-DIAGONAL_ART_ANGLE);
  context.drawImage(
    sourceImage,
    frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight,
    -frame.cutWidth / 2, -frame.cutHeight / 2, frame.cutWidth, frame.cutHeight,
  );

  const { data, width, height } = context.getImageData(0, 0, scratchSize, scratchSize);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return null;

  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropWidth = Math.min(width - cropX, maxX - minX + padding * 2 + 1);
  const cropHeight = Math.min(height - cropY, maxY - minY + padding * 2 + 1);
  const horizontal = document.createElement('canvas');
  horizontal.width = cropWidth;
  horizontal.height = cropHeight;
  const horizontalContext = horizontal.getContext('2d');
  if (!horizontalContext) return null;
  horizontalContext.imageSmoothingEnabled = true;
  horizontalContext.drawImage(scratch, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  scene.textures.addCanvas(key, horizontal);
  return key;
}

function getAxisFrame(vertical, length) {
  const longName = vertical ? 'verticalLong' : 'horizontalLong';
  const shortName = vertical ? 'verticalShort' : 'horizontalShort';
  const long = WALL_KIT_FRAMES[longName];
  const short = WALL_KIT_FRAMES[shortName];
  const longLength = vertical
    ? WALL_THICKNESS * long.height / long.width
    : WALL_THICKNESS * long.width / long.height;
  const shortLength = vertical
    ? WALL_THICKNESS * short.height / short.width
    : WALL_THICKNESS * short.width / short.height;

  // Short-frame end caps are only useful for genuinely short runs. Once a run
  // is longer, use the full wall artwork and scale its grain along the beam.
  return length < Math.sqrt(longLength * shortLength)
    ? { name: shortName, bounds: short }
    : { name: longName, bounds: long };
}

function stampAxisWall(renderTexture, textureKey, segment, vertical, rasterScale) {
  const { name, bounds } = getAxisFrame(vertical, segment.length);
  const sourceLength = vertical ? bounds.height : bounds.width;
  const x = ((segment.x1 + segment.x2) / 2) * rasterScale;
  const y = ((segment.y1 + segment.y2) / 2) * rasterScale;
  const lengthScale = (segment.length * JOINT_OVERLAP) / sourceLength;
  const scaleX = vertical ? WALL_THICKNESS / bounds.width : lengthScale;
  const scaleY = vertical ? lengthScale : WALL_THICKNESS / bounds.height;
  const nativeAngle = vertical ? Math.PI / 2 : 0;
  const rotation = normalizeUndirectedAngle(segment.angle - nativeAngle);

  // Rotate near-axis segments too: dropping their small slope shifts joins sideways.
  // One stamp per segment also avoids repeated baked end shadows along a run.
  renderTexture.stamp(textureKey, name, x, y, {
    scaleX: scaleX * rasterScale,
    scaleY: scaleY * rasterScale,
    rotation,
    originX: 0.5,
    originY: 0.5,
  });
  return 1;
}

function normalizeUndirectedAngle(angle) {
  while (angle > Math.PI / 2) angle -= Math.PI;
  while (angle < -Math.PI / 2) angle += Math.PI;
  return angle;
}

/** Find non-collinear centerline intersections for rendered wall joins. */
export function findWallJunctions(walls) {
  const segments = (walls ?? []).flatMap((wall, index) => {
    if (!wall || ![wall.x1, wall.y1, wall.x2, wall.y2].every(Number.isFinite)) return [];
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    if (Math.hypot(dx, dy) < MIN_VISIBLE_WALL_LENGTH) return [];
    return [{ index, x1: wall.x1, y1: wall.y1, dx, dy, lengthSquared: dx * dx + dy * dy }];
  });
  const nodes = new Map();

  for (let firstIndex = 0; firstIndex < segments.length; firstIndex += 1) {
    const first = segments[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < segments.length; secondIndex += 1) {
      const second = segments[secondIndex];
      const offsetX = second.x1 - first.x1;
      const offsetY = second.y1 - first.y1;
      const denominator = first.dx * second.dy - first.dy * second.dx;
      if (Math.abs(denominator) < 1e-8) continue; // Parallel or collinear runs need no cap.

      const firstProgress = (offsetX * second.dy - offsetY * second.dx) / denominator;
      const secondProgress = (offsetX * first.dy - offsetY * first.dx) / denominator;
      const epsilonFirst = 1e-7 / Math.sqrt(first.lengthSquared);
      const epsilonSecond = 1e-7 / Math.sqrt(second.lengthSquared);
      if (firstProgress < -epsilonFirst || firstProgress > 1 + epsilonFirst ||
          secondProgress < -epsilonSecond || secondProgress > 1 + epsilonSecond) continue;

      const x = first.x1 + firstProgress * first.dx;
      const y = first.y1 + firstProgress * first.dy;
      const key = `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
      let node = nodes.get(key);
      if (!node) {
        node = { x, y, incidents: new Map() };
        nodes.set(key, node);
      }
      node.incidents.set(first.index, {
        angle: Math.atan2(first.dy, first.dx),
        progress: firstProgress,
        endpointEpsilon: epsilonFirst,
      });
      node.incidents.set(second.index, {
        angle: Math.atan2(second.dy, second.dx),
        progress: secondProgress,
        endpointEpsilon: epsilonSecond,
      });
    }
  }

  return [...nodes.values()]
    .map(({ x, y, incidents }) => {
      const arms = [...incidents.values()].flatMap(({ angle, progress, endpointEpsilon }) => {
        if (progress <= endpointEpsilon) return [angle];
        if (progress >= 1 - endpointEpsilon) return [angle + Math.PI];
        return [angle, angle + Math.PI];
      });
      return { x, y, arms };
    })
    .filter(({ arms }) => {
      const angles = arms.map(normalizeUndirectedAngle);
      return angles.some((angle, index) => angles.slice(index + 1)
        .some(other => Math.abs(Math.sin(angle - other)) > JUNCTION_ANGLE_EPSILON));
    })
    .map(({ x, y, arms }) => ({ x, y, degree: arms.length }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

function stampDiagonalWall(renderTexture, diagonalTextureKey, segment, rasterScale) {
  const texture = renderTexture.scene.textures.get(diagonalTextureKey);
  const sourceWidth = texture?.source?.[0]?.width;
  const sourceHeight = texture?.source?.[0]?.height;
  if (!sourceWidth || !sourceHeight) return 0;

  const angle = normalizeUndirectedAngle(segment.angle);
  const flipSide = shouldFlipDiagonalWallSide(angle);
  const x = ((segment.x1 + segment.x2) / 2) * rasterScale;
  const y = ((segment.y1 + segment.y2) / 2) * rasterScale;
  // Flip across the beam's local thickness axis when needed. This keeps the
  // authored bevel/shadow on the viewer-facing lower-right side; it does not
  // change the segment endpoints, length, collision geometry, or wall width.
  renderTexture.stamp(diagonalTextureKey, undefined, x, y, {
    rotation: angle,
    scaleX: (segment.length * JOINT_OVERLAP / sourceWidth) * rasterScale,
    scaleY: (flipSide ? -1 : 1) * (WALL_THICKNESS / sourceHeight) * rasterScale,
    originX: 0.5,
    originY: 0.5,
  });
  return 1;
}

function stampWallJunction(renderTexture, textureKey, junction, rasterScale) {
  const source = renderTexture.scene.textures.get(textureKey)?.source?.[0];
  if (!source?.width || !source?.height) return false;
  const x = junction.x * rasterScale;
  const y = junction.y * rasterScale;
  const scale = (WALL_THICKNESS / Math.min(source.width, source.height)) * rasterScale;
  renderTexture.stamp(textureKey, undefined, x, y, {
    scaleX: scale,
    scaleY: scale,
    originX: 0.5,
    originY: 0.5,
  });
  return true;
}

/** Compose the authored wall kit into one static Phaser render texture. */
export function drawWallKit(scene, walls, { textureKey, junctionTextureKey, width = 800, height = 600 } = {}) {
  if (!registerWallKitFrames(scene, textureKey)) return null;
  const diagonalTextureKey = createHorizontalDiagonalTexture(scene, textureKey);

  const renderTexture = scene.add.renderTexture(
    0,
    0,
    width * WALL_RASTER_SCALE,
    height * WALL_RASTER_SCALE,
  )
    .setOrigin(0, 0)
    .setDisplaySize(width, height)
    .setDepth(1);
  let wallModuleCount = 0;
  let renderedSegmentCount = 0;

  for (const wall of walls ?? []) {
    if (!wall || ![wall.x1, wall.y1, wall.x2, wall.y2].every(Number.isFinite)) continue;
    const dx = wall.x2 - wall.x1;
    const dy = wall.y2 - wall.y1;
    const length = Math.hypot(dx, dy);
    if (length < MIN_VISIBLE_WALL_LENGTH) continue;

    const segment = { ...wall, length, angle: Math.atan2(dy, dx) };
    const isHorizontal = Math.abs(dy) / length <= AXIS_TOLERANCE;
    const isVertical = Math.abs(dx) / length <= AXIS_TOLERANCE;
    const modules = (isHorizontal || isVertical)
      ? stampAxisWall(renderTexture, textureKey, segment, isVertical, WALL_RASTER_SCALE)
      : diagonalTextureKey
        ? stampDiagonalWall(renderTexture, diagonalTextureKey, segment, WALL_RASTER_SCALE)
        : 0;

    wallModuleCount += modules;
    renderedSegmentCount += modules > 0 ? 1 : 0;
  }

  // The selected 32px end-grain join fills acute, L, T and crossing seams with
  // one consistent connector after all beams are stamped. Unlike a rotated
  // corner beam, its projection is independent of wall direction, so it cannot
  // reverse the light/shadow side or stack another cast shadow.
  const wallJunctions = findWallJunctions(walls);
  const wallJunctionCount = junctionTextureKey && scene.textures.exists(junctionTextureKey)
    ? wallJunctions.filter(junction => stampWallJunction(
      renderTexture,
      junctionTextureKey,
      junction,
      WALL_RASTER_SCALE,
    )).length
    : 0;

  renderTexture.setData('wallSegmentCount', renderedSegmentCount);
  renderTexture.setData('wallModuleCount', wallModuleCount);
  renderTexture.setData('wallJunctionCount', wallJunctionCount);
  renderTexture.setData('wallJunctions', wallJunctionCount > 0 ? wallJunctions : []);
  renderTexture.setData('wallRasterWidth', width * WALL_RASTER_SCALE);
  return renderTexture;
}
