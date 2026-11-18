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
import { URBAN_ITEMS } from '../urban/urbanTable';
import type { UrbanItem } from '../urban/urbanTable';
import type { UrbanInstance } from '../urban/urbanInstance';
import type { Town } from './townPlacement';
import { planPathNetwork } from './townPathNetwork';
import { townInfoAt } from './townTerrain';

interface TownLayout {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  readonly buildings: readonly UrbanInstance[];
  readonly paths: ReadonlySet<number>;
}

interface Placement {
  readonly type: UrbanItem;
  readonly x: number;
  readonly y: number;
}

const PATH_STEPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

const layoutCache = new Map<string, TownLayout>();

function pickByWeight(items: readonly UrbanItem[], random: () => number): UrbanItem {
  const total = items.reduce((sum, candidate) => sum + candidate.weight, 0);
  let remaining = random() * total;
  for (const candidate of items) {
    remaining -= candidate.weight;
    if (remaining < 0) return candidate;
  }
  return items[items.length - 1];
}

function buildingsOf(town: Town, random: () => number): UrbanItem[] {
  const eligible = URBAN_ITEMS.filter(
    (candidate) => candidate.kind === 'building' && candidate.minTownChunks <= town.chunks.length,
  );
  const buildings = eligible.filter((candidate) => candidate.unique);
  const pool = eligible.filter((candidate) => !candidate.unique);
  const houseCount = Math.floor(town.chunks.length * TOWN_HOUSES_PER_CHUNK);
  for (let i = 0; i < houseCount; i++) buildings.push(pickByWeight(pool, random));
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

  const isOnBuilding = (type: UrbanItem, x: number, y: number, tileX: number, tileY: number): boolean =>
    tileX >= x && tileX < x + type.sprite.width && tileY >= y && tileY < y + type.sprite.height;

  const stripMark = new Uint8Array(width * height);
  const isWalkable = (index: number): boolean =>
    free[index] === 1 || sidewalk[index] === 1 || stripMark[index] === 1;

  const frontStripOf = (type: UrbanItem, x: number, y: number): number[] | null => {
    const strip: number[] = [];
    for (let row = 0; row < TOWN_DOOR_PATH_WIDTH_TILES; row++) {
      for (let column = 0; column < type.sprite.width; column++) {
        const tileX = x + column;
        const tileY = y + type.sprite.height + row;
        if (tileX >= width || tileY >= height) return null;
        const index = tileY * width + tileX;
        if (free[index] !== 1 && sidewalk[index] !== 1) return null;
        strip.push(index);
      }
    }
    return strip;
  };

  const canConnect = (type: UrbanItem, x: number, y: number, strip: readonly number[]): boolean => {
    const isTarget = (index: number): boolean => sidewalk[index] === 1 || stripMark[index] === 1;
    if (strip.some(isTarget)) return true;
    const seen = new Set<number>(strip);
    let frontier = [...strip];
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
          if (seen.has(neighbour) || isOnBuilding(type, x, y, nx, ny) || !isWalkable(neighbour)) continue;
          if (isTarget(neighbour)) return true;
          seen.add(neighbour);
          next.push(neighbour);
        }
      }
      frontier = next;
    }
    return false;
  };

  const fits = (type: UrbanItem, x: number, y: number): boolean => {
    for (let dy = 0; dy < type.sprite.height; dy++) {
      for (let dx = 0; dx < type.sprite.width; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= width || ny >= height || !free[ny * width + nx]) return false;
      }
    }
    return true;
  };

  const occupy = (type: UrbanItem, x: number, y: number): void => {
    const margin = TOWN_BUILDING_MARGIN_TILES;
    for (let dy = -margin; dy < type.sprite.height + margin; dy++) {
      for (let dx = -margin; dx < type.sprite.width + margin; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) free[ny * width + nx] = 0;
      }
    }
  };

  const placements: Placement[] = [];
  const strips: number[][] = [];
  const buildingMask = new Uint8Array(width * height);
  for (const type of buildingsOf(town, random)) {
    const candidates: number[] = [];
    for (let i = 0; i < width * height; i++) candidates.push(i);
    for (const index of shuffled(candidates, random)) {
      const x = index % width;
      const y = Math.floor(index / width);
      if (!fits(type, x, y)) continue;
      const strip = frontStripOf(type, x, y);
      if (strip === null || !canConnect(type, x, y, strip)) continue;
      placements.push({ type, x, y });
      strips.push(strip);
      occupy(type, x, y);
      for (let dy = 0; dy < type.sprite.height; dy++) {
        for (let dx = 0; dx < type.sprite.width; dx++) buildingMask[(y + dy) * width + x + dx] = 1;
      }
      for (const stripIndex of strip) {
        stripMark[stripIndex] = 1;
        free[stripIndex] = 0;
      }
      break;
    }
  }

  const walkable = new Uint8Array(width * height);
  for (let i = 0; i < walkable.length; i++) walkable[i] = placeable[i] === 1 && buildingMask[i] === 0 ? 1 : 0;
  const streetTiles: number[] = [];
  for (let i = 0; i < sidewalk.length; i++) if (sidewalk[i]) streetTiles.push(i);
  const network = planPathNetwork({
    width,
    height,
    walkable,
    streetTiles,
    strips,
    maxLength: TOWN_DOOR_PATH_MAX_TILES,
  });

  const buildings: UrbanInstance[] = [];
  placements.forEach(({ type, x, y }, placementIndex) => {
    if (!network.connected[placementIndex]) return;
    buildings.push({ item: type, x: minX + x, y: minY + y, level: town.plateauLevel });
  });
  return { minX, minY, width, height, buildings, paths: network.tiles };
}

function layoutOf(town: Town): TownLayout {
  return remember(layoutCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () => computeLayout(town));
}

function isInLayout(layout: TownLayout, tileX: number, tileY: number): boolean {
  return (
    tileX >= layout.minX &&
    tileX < layout.minX + layout.width &&
    tileY >= layout.minY &&
    tileY < layout.minY + layout.height
  );
}

export function townPathAt(town: Town, tileX: number, tileY: number): boolean {
  const layout = layoutOf(town);
  if (!isInLayout(layout, tileX, tileY)) return false;
  return layout.paths.has((tileY - layout.minY) * layout.width + (tileX - layout.minX));
}

export function townBuildingsOf(town: Town): readonly UrbanInstance[] {
  return layoutOf(town).buildings;
}
