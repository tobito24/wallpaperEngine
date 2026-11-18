import {
  URBAN_LOT_MAX_DEPTH_TILES,
  URBAN_LOT_MAX_WIDTH_TILES,
  URBAN_LOT_MIN_DEPTH_TILES,
  URBAN_LOT_MIN_WIDTH_TILES,
} from '../config/constants';
import type { TownGrid } from './townGrid';

export type Frontage = 'through' | 'side' | null;

export interface Block {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  readonly area: number;
}

export interface Lot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly depth: number;
  readonly block: number;
  readonly frontage: Frontage;
}

export interface TownLots {
  readonly blocks: readonly Block[];
  readonly lots: readonly Lot[];
}

const NEIGHBOURS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function splitSpan(length: number, min: number, max: number, random: () => number): number[] | null {
  const fewest = Math.ceil(length / max);
  const most = Math.floor(length / min);
  if (length < min || fewest > most) return null;
  const count = fewest + Math.floor(random() * (most - fewest + 1));
  const sizes: number[] = [];
  let remaining = length;
  for (let index = 0; index < count; index++) {
    const following = count - index - 1;
    const low = Math.max(min, remaining - max * following);
    const high = Math.min(max, remaining - min * following);
    const size = low + Math.floor(random() * (high - low + 1));
    sizes.push(size);
    remaining -= size;
  }
  return sizes;
}

export function planLots(grid: TownGrid, sideStreets: Uint8Array, random: () => number): TownLots {
  const { minX, minY, width, height, usable, roads } = grid;
  const isFree = (index: number): boolean => usable[index] === 1 && sideStreets[index] === 0;
  const blockOf = new Int32Array(width * height).fill(-1);
  const covered = new Uint8Array(width * height);
  const blocks: Block[] = [];
  const lots: Lot[] = [];

  const frontageOf = (x: number, y: number, lotWidth: number, depth: number): Frontage => {
    const row = y + depth - minY;
    if (row >= height) return null;
    let through = 0;
    let side = 0;
    for (let column = x - minX; column < x - minX + lotWidth; column++) {
      if (roads[row * width + column] === 1) through++;
      else if (sideStreets[row * width + column] === 1) side++;
    }
    if (Math.max(through, side) * 2 < lotWidth) return null;
    return through >= side ? 'through' : 'side';
  };

  const cutBlock = (block: number, first: number): void => {
    const tiles: number[] = [first];
    blockOf[first] = block;
    for (let next = 0; next < tiles.length; next++) {
      const tileX = tiles[next] % width;
      const tileY = Math.floor(tiles[next] / width);
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbour = ny * width + nx;
        if (blockOf[neighbour] !== -1 || !isFree(neighbour)) continue;
        blockOf[neighbour] = block;
        tiles.push(neighbour);
      }
    }
    const xs = tiles.map((index) => index % width);
    const ys = tiles.map((index) => Math.floor(index / width));
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    blocks.push({
      minX: minX + left,
      minY: minY + top,
      width: right - left + 1,
      height: bottom - top + 1,
      area: tiles.length,
    });

    const isOpen = (x: number, y: number): boolean => {
      const index = y * width + x;
      return blockOf[index] === block && covered[index] === 0;
    };
    for (let y = bottom; y >= top; y--) {
      for (let x = left; x <= right; x++) {
        if (!isOpen(x, y)) continue;
        let runLength = 0;
        while (x + runLength <= right && isOpen(x + runLength, y)) runLength++;
        const lotWidth = splitSpan(
          runLength,
          URBAN_LOT_MIN_WIDTH_TILES,
          URBAN_LOT_MAX_WIDTH_TILES,
          random,
        )?.[0];
        if (!lotWidth) continue;
        let reach = 0;
        const isRowOpen = (row: number): boolean => {
          for (let column = x; column < x + lotWidth; column++) if (!isOpen(column, row)) return false;
          return true;
        };
        while (y - reach >= top && isRowOpen(y - reach)) reach++;
        const depth = splitSpan(reach, URBAN_LOT_MIN_DEPTH_TILES, URBAN_LOT_MAX_DEPTH_TILES, random)?.[0];
        if (!depth) continue;
        for (let row = y - depth + 1; row <= y; row++) {
          for (let column = x; column < x + lotWidth; column++) covered[row * width + column] = 1;
        }
        lots.push({
          x: minX + x,
          y: minY + y - depth + 1,
          width: lotWidth,
          depth,
          block,
          frontage: frontageOf(minX + x, minY + y - depth + 1, lotWidth, depth),
        });
        x += lotWidth - 1;
      }
    }
  };

  for (let index = 0; index < width * height; index++) {
    if (isFree(index) && blockOf[index] === -1) cutBlock(blocks.length, index);
  }
  return { blocks, lots };
}
