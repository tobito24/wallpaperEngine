import {
  CELL_BUFFER_CHUNKS,
  CELL_SIZE_CHUNKS,
  CHUNK_SIZE,
  SEED,
  TOWN_OUTLINE_NOISE_FREQUENCY,
  TOWN_OUTLINE_NOISE_OCTAVES,
  TOWN_OUTLINE_WOBBLE_TILES,
  TOWN_RING_TERRACE_STEP_TILES,
  TOWN_RING_WIDTH_TILES,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import { WATER_LEVEL } from '../elevation/heightLevel';
import { cellIndexOf } from '../skeleton/cellGrid';
import { townOfCell } from './townPlacement';
import type { Town } from './townPlacement';
import { TOWN_BLOCK_CHUNKS } from './townShapes';

export interface TownTileInfo {
  readonly town: Town;
  readonly inside: boolean;
  readonly ringDistance: number;
}

function distanceToChunk(x: number, y: number, chunkX: number, chunkY: number): number {
  const minX = chunkX * CHUNK_SIZE;
  const minY = chunkY * CHUNK_SIZE;
  const dx = Math.max(minX - x, 0, x - (minX + CHUNK_SIZE));
  const dy = Math.max(minY - y, 0, y - (minY + CHUNK_SIZE));
  return Math.hypot(dx, dy);
}

const outlineNoise = createFractalNoise2D(
  `${SEED}:townOutline`,
  TOWN_OUTLINE_NOISE_OCTAVES,
  TOWN_OUTLINE_NOISE_FREQUENCY,
  0.5,
  2,
);

function outlineWobbleAt(x: number, y: number): number {
  const share = Math.min(1, Math.max(0, outlineNoise(x, y)));
  return Math.floor(share * (TOWN_OUTLINE_WOBBLE_TILES + 1));
}

const townMembershipCache = new WeakMap<Town, readonly boolean[]>();

function membershipOf(town: Town, blockX: number, blockY: number): readonly boolean[] {
  const cached = townMembershipCache.get(town);
  if (cached) return cached;
  const membership = new Array<boolean>(TOWN_BLOCK_CHUNKS * TOWN_BLOCK_CHUNKS).fill(false);
  for (const [chunkX, chunkY] of town.chunks) {
    membership[(chunkY - blockY) * TOWN_BLOCK_CHUNKS + (chunkX - blockX)] = true;
  }
  townMembershipCache.set(town, membership);
  return membership;
}

function distanceToOutsideOfTown(x: number, y: number, town: Town): number {
  const blockX = town.cx * CELL_SIZE_CHUNKS + CELL_BUFFER_CHUNKS;
  const blockY = town.cy * CELL_SIZE_CHUNKS + CELL_BUFFER_CHUNKS;
  const membership = membershipOf(town, blockX, blockY);
  let nearest = Infinity;
  for (let offsetY = -1; offsetY <= TOWN_BLOCK_CHUNKS; offsetY++) {
    for (let offsetX = -1; offsetX <= TOWN_BLOCK_CHUNKS; offsetX++) {
      const insideBlock =
        offsetX >= 0 && offsetX < TOWN_BLOCK_CHUNKS && offsetY >= 0 && offsetY < TOWN_BLOCK_CHUNKS;
      if (insideBlock && membership[offsetY * TOWN_BLOCK_CHUNKS + offsetX]) continue;
      nearest = Math.min(nearest, distanceToChunk(x, y, blockX + offsetX, blockY + offsetY));
    }
  }
  return nearest;
}

export function townInfoAt(tileX: number, tileY: number): TownTileInfo | null {
  const town = townOfCell(cellIndexOf(tileX), cellIndexOf(tileY));
  if (!town) return null;

  const x = tileX + 0.5;
  const y = tileY + 0.5;
  let nearest = Infinity;
  for (const [chunkX, chunkY] of town.chunks) {
    nearest = Math.min(nearest, distanceToChunk(x, y, chunkX, chunkY));
  }
  if (nearest === 0) {
    return { town, inside: distanceToOutsideOfTown(x, y, town) > outlineWobbleAt(x, y), ringDistance: 0 };
  }
  return nearest <= TOWN_RING_WIDTH_TILES ? { town, inside: false, ringDistance: nearest } : null;
}

export function levelWithTown(baseLevel: number, info: TownTileInfo | null): number {
  if (!info) return baseLevel;
  if (info.inside) return info.town.plateauLevel;
  if (baseLevel === WATER_LEVEL) return baseLevel;

  const plateau = info.town.plateauLevel;
  const allowedDifference = 1 + Math.floor(info.ringDistance / TOWN_RING_TERRACE_STEP_TILES);
  return Math.min(plateau + allowedDifference, Math.max(plateau - allowedDifference, baseLevel));
}
