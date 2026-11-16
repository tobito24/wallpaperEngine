import Alea from 'alea';
import {
  CHUNK_SIZE,
  SEED,
  TOWN_BUILDING_MARGIN_TILES,
  TOWN_BUILDING_MAX_ROAD_DISTANCE_TILES,
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_HOUSES_PER_CHUNK,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { crossingsOf } from '../road/crossingTerrain';
import { footprintOf } from '../road/roadCrossing';
import { roadEdgesIn } from '../road/roadEdge';
import { ROAD_TILE_MARK, roadTilesIn } from '../road/roadMask';
import type { SheetTile } from '../tileset/outsideSheet';
import { BUILDING_TYPES } from './townBuildings';
import type { BuildingType } from './townBuildings';
import type { Town } from './townPlacement';
import { townInfoAt } from './townTerrain';

interface TownLayout {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly pieces: ReadonlyMap<number, SheetTile>;
}

interface Placement {
  readonly type: BuildingType;
  readonly x: number;
  readonly y: number;
}

const MIN_CHUNKS_FOR_MART = 2;

const layoutCache = new Map<string, TownLayout>();

function buildingsOf(town: Town, random: () => number): BuildingType[] {
  const byKind = (kind: BuildingType['kind']): BuildingType[] =>
    BUILDING_TYPES.filter((type) => type.kind === kind);

  const buildings = byKind('center');
  if (town.chunks.length >= MIN_CHUNKS_FOR_MART) buildings.push(...byKind('mart'));

  const houseTypes = byKind('house');
  const houseCount = Math.floor(town.chunks.length * TOWN_HOUSES_PER_CHUNK);
  for (let i = 0; i < houseCount; i++) buildings.push(houseTypes[Math.floor(random() * houseTypes.length)]);
  return buildings;
}

function shuffled<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function computeLayout(town: Town): TownLayout {
  const random = Alea(`${SEED}:townLayout:${town.cx}:${town.cy}`);
  const chunkXs = town.chunks.map(([chunkX]) => chunkX);
  const chunkYs = town.chunks.map(([, chunkY]) => chunkY);
  const minX = Math.min(...chunkXs) * CHUNK_SIZE;
  const minY = Math.min(...chunkYs) * CHUNK_SIZE;
  const width = (Math.max(...chunkXs) + 1) * CHUNK_SIZE - minX;
  const height = (Math.max(...chunkYs) + 1) * CHUNK_SIZE - minY;

  const roads = roadTilesIn(minX, minY, width, height);
  const free = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isInside = townInfoAt(minX + x, minY + y)?.inside === true;
      free[y * width + x] = isInside && roads[y * width + x] !== ROAD_TILE_MARK ? 1 : 0;
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
        free[(y - minY) * width + (x - minX)] = 0;
      }
    }
  }

  const nearRoad = (x: number, y: number): boolean => {
    const reach = TOWN_BUILDING_MAX_ROAD_DISTANCE_TILES;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (roads[ny * width + nx] === ROAD_TILE_MARK) return true;
      }
    }
    return false;
  };

  const fits = (type: BuildingType, x: number, y: number): boolean => {
    for (let dy = 0; dy < type.height; dy++) {
      for (let dx = 0; dx < type.width; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= width || ny >= height || !free[ny * width + nx]) return false;
      }
    }
    return nearRoad(x + Math.floor(type.width / 2), y + type.height);
  };

  const occupy = (type: BuildingType, x: number, y: number): void => {
    const margin = TOWN_BUILDING_MARGIN_TILES;
    for (let dy = -margin; dy < type.height + margin; dy++) {
      for (let dx = -margin; dx < type.width + margin; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) free[ny * width + nx] = 0;
      }
    }
  };

  const placements: Placement[] = [];
  for (const type of buildingsOf(town, random)) {
    const candidates: number[] = [];
    for (let i = 0; i < width * height; i++) candidates.push(i);
    for (const index of shuffled(candidates, random)) {
      const x = index % width;
      const y = Math.floor(index / width);
      if (!fits(type, x, y)) continue;
      placements.push({ type, x, y });
      occupy(type, x, y);
      break;
    }
  }

  const pieces = new Map<number, SheetTile>();
  for (const { type, x, y } of placements) {
    for (let dy = 0; dy < type.height; dy++) {
      for (let dx = 0; dx < type.width; dx++) {
        pieces.set((y + dy) * width + (x + dx), { column: type.column + dx, row: type.row + dy });
      }
    }
  }
  return { minX, minY, width, pieces };
}

export function townDecorationAt(town: Town, tileX: number, tileY: number): SheetTile | null {
  const layout = remember(layoutCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () =>
    computeLayout(town),
  );
  return layout.pieces.get((tileY - layout.minY) * layout.width + (tileX - layout.minX)) ?? null;
}
