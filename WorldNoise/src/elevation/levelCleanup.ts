import { MAX_HEIGHT_LEVEL, WATER_LEVEL } from './heightLevel';

export const LEVEL_CLEANUP_REACH_TILES = 2;

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
