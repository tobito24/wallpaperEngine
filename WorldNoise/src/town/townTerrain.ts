import { CHUNK_SIZE, TOWN_RING_WIDTH_TILES } from '../config/constants';
import { WATER_LEVEL } from '../elevation/heightLevel';
import { cellIndexOf } from '../skeleton/cellGrid';
import { townOfCell } from './townPlacement';
import type { Town } from './townPlacement';

export interface TownTileInfo {
  readonly town: Town;
  readonly inside: boolean;
}

function distanceToChunk(x: number, y: number, chunkX: number, chunkY: number): number {
  const minX = chunkX * CHUNK_SIZE;
  const minY = chunkY * CHUNK_SIZE;
  const dx = Math.max(minX - x, 0, x - (minX + CHUNK_SIZE));
  const dy = Math.max(minY - y, 0, y - (minY + CHUNK_SIZE));
  return Math.hypot(dx, dy);
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
  if (nearest === 0) return { town, inside: true };
  return nearest <= TOWN_RING_WIDTH_TILES ? { town, inside: false } : null;
}

export function levelWithTown(baseLevel: number, info: TownTileInfo | null): number {
  if (!info) return baseLevel;
  if (info.inside) return info.town.plateauLevel;
  if (baseLevel === WATER_LEVEL) return baseLevel;

  const plateau = info.town.plateauLevel;
  return Math.min(plateau + 1, Math.max(plateau - 1, baseLevel));
}
