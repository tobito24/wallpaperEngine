import { CHUNK_SIZE, TOWN_MARGIN_TILES } from '../config/constants';
import type { Town } from './townPlacement';

export function distanceToChunk(x: number, y: number, chunkX: number, chunkY: number): number {
  const minX = chunkX * CHUNK_SIZE;
  const minY = chunkY * CHUNK_SIZE;
  const dx = Math.max(minX - x, 0, x - (minX + CHUNK_SIZE));
  const dy = Math.max(minY - y, 0, y - (minY + CHUNK_SIZE));
  return Math.hypot(dx, dy);
}

export function distanceToCore(town: Town, x: number, y: number): number {
  let nearest = Infinity;
  for (const [chunkX, chunkY] of town.chunks) {
    nearest = Math.min(nearest, distanceToChunk(x, y, chunkX, chunkY));
  }
  return nearest;
}

export function isOnPlateauWithoutWobble(town: Town, x: number, y: number): boolean {
  return distanceToCore(town, x, y) < TOWN_MARGIN_TILES;
}
