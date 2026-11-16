import { NEIGHBOUR_OFFSETS, autotileIndexFor } from '../tileset/autotile';
import { cliffTypeOf } from './heightLevel';
import type { CliffType } from './heightLevel';

export const CLIFF_LAYOUT_REACH_TILES = 3;
export const NO_INNER_RING = -1;

const FIRST_CLIFF_LEVEL = 2;

export interface CliffLayout {
  readonly cliffTypes: readonly (CliffType | null)[];
  readonly innerRingIndices: Int8Array;
}

export function layoutCliffs(levels: Uint8Array, size: number): CliffLayout {
  const cliffTypes = new Array<CliffType | null>(size * size).fill(null);
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const index = y * size + x;
      cliffTypes[index] = cliffTypeOf(levels[index], {
        north: levels[index - size],
        northEast: levels[index - size + 1],
        east: levels[index + 1],
        southEast: levels[index + size + 1],
        south: levels[index + size],
        southWest: levels[index + size - 1],
        west: levels[index - 1],
        northWest: levels[index - size - 1],
      });
    }
  }

  const isInnerRing = new Uint8Array(size * size);
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      const index = y * size + x;
      const level = levels[index];
      if (level < FIRST_CLIFF_LEVEL || cliffTypes[index]) continue;
      for (const { dx, dy } of NEIGHBOUR_OFFSETS) {
        const neighbour = index + dy * size + dx;
        if (cliffTypes[neighbour] && levels[neighbour] === level) {
          isInnerRing[index] = 1;
          break;
        }
      }
    }
  }

  const innerRingIndices = new Int8Array(size * size).fill(NO_INNER_RING);
  for (let y = 3; y < size - 3; y++) {
    for (let x = 3; x < size - 3; x++) {
      const index = y * size + x;
      if (!isInnerRing[index]) continue;
      let neighbourMask = 0;
      for (const { dx, dy, bit } of NEIGHBOUR_OFFSETS) {
        const neighbour = index + dy * size + dx;
        const isBand = cliffTypes[neighbour] !== null || isInnerRing[neighbour] === 1;
        if (isBand && levels[neighbour] === levels[index]) neighbourMask |= bit;
      }
      innerRingIndices[index] = autotileIndexFor(neighbourMask);
    }
  }

  return { cliffTypes, innerRingIndices };
}
