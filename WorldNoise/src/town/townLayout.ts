import Alea from 'alea';
import {
  CHUNK_SIZE,
  SEED,
  TOWN_BUILDING_MARGIN_TILES,
  TOWN_BUILDING_STREET_MARGIN_TILES,
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_DOOR_PATH_MAX_TILES,
  TOWN_DOOR_PATH_WIDTH_TILES,
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
  readonly paths: ReadonlySet<number>;
}

interface Placement {
  readonly type: BuildingType;
  readonly x: number;
  readonly y: number;
}

const MIN_CHUNKS_FOR_MART = 2;
const PATH_STEPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

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

  const placeable = free.slice();
  const sidewalk = new Uint8Array(width * height);
  const reach = TOWN_BUILDING_STREET_MARGIN_TILES;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (roads[y * width + x] !== ROAD_TILE_MARK) continue;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < width && ny < height && placeable[ny * width + nx]) {
            sidewalk[ny * width + nx] = 1;
          }
        }
      }
    }
  }
  for (let i = 0; i < free.length; i++) if (sidewalk[i]) free[i] = 0;

  const isOnBuilding = (type: BuildingType, x: number, y: number, tileX: number, tileY: number): boolean =>
    tileX >= x && tileX < x + type.width && tileY >= y && tileY < y + type.height;

  const isWalkable = (index: number): boolean => free[index] === 1 || sidewalk[index] === 1;

  const frontStripOf = (type: BuildingType, x: number, y: number): number[] | null => {
    const strip: number[] = [];
    for (let row = 0; row < TOWN_DOOR_PATH_WIDTH_TILES; row++) {
      for (let column = 0; column < type.width; column++) {
        const tileX = x + column;
        const tileY = y + type.height + row;
        if (tileX >= width || tileY >= height) return null;
        const index = tileY * width + tileX;
        if (!isWalkable(index)) return null;
        strip.push(index);
      }
    }
    return strip;
  };

  const widened = (type: BuildingType, x: number, y: number, tiles: ReadonlySet<number>): Set<number> => {
    const result = new Set(tiles);
    const canTake = (tileX: number, tileY: number): boolean =>
      tileX >= 0 &&
      tileY >= 0 &&
      tileX < width &&
      tileY < height &&
      isWalkable(tileY * width + tileX) &&
      !isOnBuilding(type, x, y, tileX, tileY);
    const take = (first: readonly [number, number], second: readonly [number, number]): void => {
      const [tileX, tileY] = canTake(first[0], first[1]) ? first : second;
      if (canTake(tileX, tileY)) result.add(tileY * width + tileX);
    };
    for (const index of tiles) {
      const tileX = index % width;
      const tileY = Math.floor(index / width);
      const runsVertically = tiles.has(index - width) || tiles.has(index + width);
      const runsHorizontally = tiles.has(index - 1) || tiles.has(index + 1);
      if (runsVertically) take([tileX + 1, tileY], [tileX - 1, tileY]);
      if (runsHorizontally) take([tileX, tileY + 1], [tileX, tileY - 1]);
    }
    return result;
  };

  const pathFromFront = (type: BuildingType, x: number, y: number): Set<number> | null => {
    const strip = frontStripOf(type, x, y);
    if (strip === null) return null;
    if (strip.some((index) => sidewalk[index])) return new Set(strip);
    const cameFrom = new Map<number, number>(strip.map((index) => [index, -1]));
    let frontier = strip;
    for (let length = 1; length <= TOWN_DOOR_PATH_MAX_TILES && frontier.length > 0; length++) {
      const next: number[] = [];
      for (const index of frontier) {
        const tileX = index % width;
        const tileY = Math.floor(index / width);
        for (const [dx, dy] of PATH_STEPS) {
          const nx = tileX + dx;
          const ny = tileY + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbour = ny * width + nx;
          if (cameFrom.has(neighbour) || isOnBuilding(type, x, y, nx, ny) || !isWalkable(neighbour)) continue;
          cameFrom.set(neighbour, index);
          if (sidewalk[neighbour]) {
            const connection = new Set<number>();
            for (let step = neighbour; step !== -1; step = cameFrom.get(step) as number) connection.add(step);
            return new Set([...strip, ...widened(type, x, y, connection)]);
          }
          next.push(neighbour);
        }
      }
      frontier = next;
    }
    return null;
  };

  const fits = (type: BuildingType, x: number, y: number): boolean => {
    for (let dy = 0; dy < type.height; dy++) {
      for (let dx = 0; dx < type.width; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= width || ny >= height || !free[ny * width + nx]) return false;
      }
    }
    return true;
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

  const paths = new Set<number>();
  const placements: Placement[] = [];
  for (const type of buildingsOf(town, random)) {
    const candidates: number[] = [];
    for (let i = 0; i < width * height; i++) candidates.push(i);
    for (const index of shuffled(candidates, random)) {
      const x = index % width;
      const y = Math.floor(index / width);
      if (!fits(type, x, y)) continue;
      const path = pathFromFront(type, x, y);
      if (path === null) continue;
      placements.push({ type, x, y });
      occupy(type, x, y);
      for (const index of path) {
        paths.add(index);
        free[index] = 0;
      }
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
  return { minX, minY, width, pieces, paths };
}

function layoutOf(town: Town): TownLayout {
  return remember(layoutCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () => computeLayout(town));
}

export function townPathAt(town: Town, tileX: number, tileY: number): boolean {
  const layout = layoutOf(town);
  return layout.paths.has((tileY - layout.minY) * layout.width + (tileX - layout.minX));
}

export function townDecorationAt(town: Town, tileX: number, tileY: number): SheetTile | null {
  const layout = layoutOf(town);
  return layout.pieces.get((tileY - layout.minY) * layout.width + (tileX - layout.minX)) ?? null;
}
