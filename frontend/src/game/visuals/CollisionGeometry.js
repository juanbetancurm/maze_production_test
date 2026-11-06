const alphaFootprintCache = new Map();

function cross(origin, first, second) {
  return (first.x - origin.x) * (second.y - origin.y) -
    (first.y - origin.y) * (second.x - origin.x);
}

function convexHull(points) {
  const sorted = points
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((point, index, list) => index === 0 || point.x !== list[index - 1].x || point.y !== list[index - 1].y);
  if (sorted.length <= 2) return sorted;
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Measure visible pixels and retain a conservative convex physical footprint. */
export function measureAlphaFootprint(scene, textureKey, displayWidth, displayHeight, { excludeGreenFoliage = false } = {}) {
  const texture = scene.textures.get(textureKey);
  const frame = texture?.get?.();
  const image = texture?.source?.[0]?.image;
  const frameWidth = frame?.width ?? 0;
  const frameHeight = frame?.height ?? 0;
  const cacheKey = `${textureKey}:${frameWidth}x${frameHeight}:foliage-${excludeGreenFoliage}`;
  let normalized = alphaFootprintCache.get(cacheKey);

  if (!normalized && frameWidth > 0 && frameHeight > 0 && image && typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas alpha readback unavailable');
      context.drawImage(
        image,
        frame.cutX ?? 0,
        frame.cutY ?? 0,
        frame.cutWidth ?? frameWidth,
        frame.cutHeight ?? frameHeight,
        0,
        0,
        frameWidth,
        frameHeight,
      );
      const pixels = context.getImageData(0, 0, frameWidth, frameHeight).data;
      const ignored = new Uint8Array(frameWidth * frameHeight);
      if (excludeGreenFoliage) {
        // The golem's attached lime moss is decorative. Exclude green pixels
        // and a narrow dilation that removes its dark painted outline too.
        const foliageBorder = Math.max(2, Math.ceil(Math.min(frameWidth, frameHeight) * 0.008));
        const borderSquared = foliageBorder * foliageBorder;
        for (let y = 0; y < frameHeight; y += 1) {
          for (let x = 0; x < frameWidth; x += 1) {
            const pixel = (y * frameWidth + x) * 4;
            const red = pixels[pixel];
            const green = pixels[pixel + 1];
            const blue = pixels[pixel + 2];
            if (pixels[pixel + 3] < 8 || green < 80 || green <= red * 1.12 || green <= blue * 1.25) continue;
            const minY = Math.max(0, y - foliageBorder);
            const maxY = Math.min(frameHeight - 1, y + foliageBorder);
            const minX = Math.max(0, x - foliageBorder);
            const maxX = Math.min(frameWidth - 1, x + foliageBorder);
            for (let markY = minY; markY <= maxY; markY += 1) {
              for (let markX = minX; markX <= maxX; markX += 1) {
                if ((markX - x) ** 2 + (markY - y) ** 2 <= borderSquared) {
                  ignored[markY * frameWidth + markX] = 1;
                }
              }
            }
          }
        }
      }
      let minX = frameWidth;
      let minY = frameHeight;
      let maxX = -1;
      let maxY = -1;
      const boundaryPoints = [];
      for (let y = 0; y < frameHeight; y += 1) {
        let rowMin = frameWidth;
        let rowMax = -1;
        for (let x = 0; x < frameWidth; x += 1) {
          const pixelIndex = y * frameWidth + x;
          if (pixels[pixelIndex * 4 + 3] < 8 || ignored[pixelIndex]) continue;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          rowMin = Math.min(rowMin, x);
          rowMax = Math.max(rowMax, x);
        }
        if (rowMax >= rowMin) {
          boundaryPoints.push(
            { x: rowMin, y }, { x: rowMax + 1, y },
            { x: rowMin, y: y + 1 }, { x: rowMax + 1, y: y + 1 },
          );
        }
      }
      if (maxX >= minX && maxY >= minY) {
        normalized = {
          halfWidth: (maxX - minX + 1) / frameWidth / 2,
          halfHeight: (maxY - minY + 1) / frameHeight / 2,
          offsetX: ((minX + maxX + 1) / 2 - frameWidth / 2) / frameWidth,
          offsetY: ((minY + maxY + 1) / 2 - frameHeight / 2) / frameHeight,
          alphaBounds: { minX, minY, maxX, maxY, frameWidth, frameHeight },
          polygon: convexHull(boundaryPoints).map(point => ({
            x: point.x - frameWidth / 2,
            y: point.y - frameHeight / 2,
          })),
        };
        alphaFootprintCache.set(cacheKey, normalized);
      }
    } catch {
      // Browser canvas readback can be unavailable; the frame rectangle is the fallback.
    }
  }

  const footprint = normalized ?? {
    halfWidth: 0.5,
    halfHeight: 0.5,
    offsetX: 0,
    offsetY: 0,
    alphaBounds: null,
    polygon: null,
  };
  return {
    halfWidth: footprint.halfWidth * displayWidth,
    halfHeight: footprint.halfHeight * displayHeight,
    offsetX: footprint.offsetX * displayWidth,
    offsetY: footprint.offsetY * displayHeight,
    alphaBounds: footprint.alphaBounds,
    polygon: footprint.polygon?.map(point => ({
      x: point.x / (footprint.alphaBounds?.frameWidth ?? 1) * displayWidth,
      y: point.y / (footprint.alphaBounds?.frameHeight ?? 1) * displayHeight,
    })) ?? null,
  };
}

/** Get the measured alpha hull, or a box for a fallback texture-less actor. */
export function getFootprintPolygon(footprint) {
  return footprint.polygon ?? [
    { x: -footprint.halfWidth, y: -footprint.halfHeight },
    { x: footprint.halfWidth, y: -footprint.halfHeight },
    { x: footprint.halfWidth, y: footprint.halfHeight },
    { x: -footprint.halfWidth, y: footprint.halfHeight },
  ];
}

function rotatedPolygon(footprint, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return getFootprintPolygon(footprint).map(point => ({
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  }));
}

function projection(points, x, y, axisX, axisY) {
  let minimum = Infinity;
  let maximum = -Infinity;
  points.forEach((point) => {
    const value = (point.x + x) * axisX + (point.y + y) * axisY;
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  });
  return { minimum, maximum };
}

function sweptIntervalsOverlap(moving, staticRange, speed) {
  if (Math.abs(speed) < 1e-10) {
    return moving.maximum >= staticRange.minimum && moving.minimum <= staticRange.maximum
      ? { start: -Infinity, end: Infinity }
      : null;
  }
  const first = (staticRange.minimum - moving.maximum) / speed;
  const second = (staticRange.maximum - moving.minimum) / speed;
  return { start: Math.min(first, second), end: Math.max(first, second) };
}

/**
 * Continuous SAT sweep of the player's rotated alpha hull against one static
 * golem alpha hull. It handles movement between physics frames without adding
 * a detection radius or changing either actor's gameplay position.
 */
export function sweptFootprintsContact({
  startX,
  startY,
  endX,
  endY,
  playerAngle,
  playerFootprint,
  targetX,
  targetY,
  targetFootprint,
}) {
  const playerPolygon = rotatedPolygon(playerFootprint, playerAngle);
  const targetPolygon = getFootprintPolygon(targetFootprint);
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const axes = [];
  [playerPolygon, targetPolygon].forEach((polygon) => {
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      axes.push({ x: -(next.y - point.y), y: next.x - point.x });
    });
  });

  let entryTime = 0;
  let exitTime = 1;
  let contactAxis = null;
  for (const axis of axes) {
    const playerStartRange = projection(playerPolygon, startX, startY, axis.x, axis.y);
    const targetRange = projection(targetPolygon, targetX, targetY, axis.x, axis.y);
    const interval = sweptIntervalsOverlap(playerStartRange, targetRange, deltaX * axis.x + deltaY * axis.y);
    if (!interval) return { overlaps: false, progress: null, axis: null };
    if (interval.start > entryTime) {
      entryTime = interval.start;
      contactAxis = axis;
    }
    exitTime = Math.min(exitTime, interval.end);
    if (entryTime > exitTime + 1e-8) return { overlaps: false, progress: null, axis: null };
  }

  const progress = Math.max(0, entryTime);
  if (progress > 1 || exitTime < 0) return { overlaps: false, progress: null, axis: null };
  return {
    overlaps: true,
    progress,
    axis: contactAxis,
    playerAnchor: { x: startX + deltaX * progress, y: startY + deltaY * progress },
  };
}

/** Vertices used by the debug view, transformed exactly like collision hulls. */
export function getFootprintOutline(centerX, centerY, angle, footprint) {
  return rotatedPolygon(footprint, angle).map(point => ({ x: centerX + point.x, y: centerY + point.y }));
}
