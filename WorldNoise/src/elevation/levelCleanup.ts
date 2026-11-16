import { MAX_HEIGHT_LEVEL, WATER_LEVEL, maxLevelAtWaterDistance, waterClearanceTiles } from './heightLevel';

export const LEVEL_CLEANUP_REACH_TILES = 2;
export const WATER_LIMIT_REACH_TILES = waterClearanceTiles(MAX_HEIGHT_LEVEL) - 1;

function erode(mask: Uint8Array, size: number): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const index = y * size + x;
      result[index] = mask[index] & mask[index + 1] & mask[index + size] & mask[index + size + 1];
    }
  }
  return result;
}

function dilate(mask: Uint8Array, size: number): Uint8Array {
  const result = new Uint8Array(mask.length);
  for (let y = 1; y < size; y++) {
    for (let x = 1; x < size; x++) {
      const index = y * size + x;
      result[index] = mask[index] | mask[index - 1] | mask[index - size] | mask[index - size - 1];
    }
  }
  return result;
}

function open(mask: Uint8Array, size: number): Uint8Array {
  return dilate(erode(mask, size), size);
}

function close(mask: Uint8Array, size: number): Uint8Array {
  return erode(dilate(mask, size), size);
}

export function cleanHeightLevels(levels: Uint8Array, size: number): Uint8Array {
  const cleaned = new Uint8Array(levels.length);
  for (let index = 0; index < levels.length; index++) {
    if (levels[index] > WATER_LEVEL) cleaned[index] = WATER_LEVEL + 1;
  }
  for (let level = WATER_LEVEL + 2; level <= MAX_HEIGHT_LEVEL; level++) {
    const mask = new Uint8Array(levels.length);
    for (let index = 0; index < levels.length; index++) mask[index] = levels[index] >= level ? 1 : 0;
    const smoothed = close(open(mask, size), size);
    for (let index = 0; index < levels.length; index++) {
      if (levels[index] > WATER_LEVEL && smoothed[index]) cleaned[index]++;
    }
  }
  return cleaned;
}

export function limitLevelsNearWater(levels: Uint8Array, size: number): Uint8Array {
  const limited = levels.slice();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      if (levels[index] <= maxLevelAtWaterDistance(1)) continue;
      let nearestWater = WATER_LIMIT_REACH_TILES + 1;
      for (let dy = -WATER_LIMIT_REACH_TILES; dy <= WATER_LIMIT_REACH_TILES; dy++) {
        for (let dx = -WATER_LIMIT_REACH_TILES; dx <= WATER_LIMIT_REACH_TILES; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          if (levels[ny * size + nx] === WATER_LEVEL)
            nearestWater = Math.min(nearestWater, Math.max(Math.abs(dx), Math.abs(dy)));
        }
      }
      limited[index] = Math.min(levels[index], maxLevelAtWaterDistance(nearestWater));
    }
  }
  return limited;
}
