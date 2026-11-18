import { CHUNK_SIZE, TOWN_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { crossingsOf } from '../road/crossingTerrain';
import { footprintOf } from '../road/roadCrossing';
import { roadEdgesIn } from '../road/roadEdge';
import { ROAD_TILE_MARK, roadTilesIn } from '../road/roadMask';
import type { Town } from './townPlacement';
import { townInfoAt } from './townTerrain';

export interface TownGrid {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  readonly roads: Uint8Array;
  readonly usable: Uint8Array;
}

const gridCache = new Map<string, TownGrid>();

function computeGrid(town: Town): TownGrid {
  const chunkXs = town.chunks.map(([chunkX]) => chunkX);
  const chunkYs = town.chunks.map(([, chunkY]) => chunkY);
  const minX = Math.min(...chunkXs) * CHUNK_SIZE;
  const minY = Math.min(...chunkYs) * CHUNK_SIZE;
  const width = (Math.max(...chunkXs) + 1) * CHUNK_SIZE - minX;
  const height = (Math.max(...chunkYs) + 1) * CHUNK_SIZE - minY;

  const roads = roadTilesIn(minX, minY, width, height);
  const usable = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isInside = townInfoAt(minX + x, minY + y)?.zone === 'core';
      usable[y * width + x] = isInside && roads[y * width + x] !== ROAD_TILE_MARK ? 1 : 0;
    }
  }
  for (const crossing of crossingsOf(roadEdgesIn(minX, minY, width, height))) {
    const footprint = footprintOf(crossing);
    for (
      let y = Math.max(footprint.minY, minY);
      y < Math.min(footprint.minY + footprint.height, minY + height);
      y++
    ) {
      for (
        let x = Math.max(footprint.minX, minX);
        x < Math.min(footprint.minX + footprint.width, minX + width);
        x++
      ) {
        usable[(y - minY) * width + (x - minX)] = 0;
      }
    }
  }
  return { minX, minY, width, height, roads, usable };
}

export function townGridOf(town: Town): TownGrid {
  return remember(gridCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () => computeGrid(town));
}
