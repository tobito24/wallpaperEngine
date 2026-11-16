import { CHUNK_SIZE, TOWN_CACHE_MAX_ENTRIES, TOWN_OUTLINE_WOBBLE_TILES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { randomValue } from '../core/keyedRandom';
import type { Point } from '../skeleton/cellGrid';
import type { Town } from './townPlacement';
import { townInfoAt } from './townTerrain';

export type GateSide = 'east' | 'west' | 'south' | 'north';

interface SideGeometry {
  readonly alongX: boolean;
  readonly outward: 1 | -1;
}

const SIDE_GEOMETRY: Readonly<Record<GateSide, SideGeometry>> = {
  east: { alongX: false, outward: 1 },
  west: { alongX: false, outward: -1 },
  south: { alongX: true, outward: 1 },
  north: { alongX: true, outward: -1 },
};

const gateCache = new Map<string, Point>();

export function gateSideOf(cellStepX: number, cellStepY: number): GateSide {
  if (cellStepX !== 0) return cellStepX > 0 ? 'east' : 'west';
  return cellStepY > 0 ? 'south' : 'north';
}

function footprintBounds(town: Town): { minX: number; minY: number; maxX: number; maxY: number } {
  const chunkXs = town.chunks.map(([chunkX]) => chunkX);
  const chunkYs = town.chunks.map(([, chunkY]) => chunkY);
  return {
    minX: Math.min(...chunkXs) * CHUNK_SIZE,
    minY: Math.min(...chunkYs) * CHUNK_SIZE,
    maxX: (Math.max(...chunkXs) + 1) * CHUNK_SIZE - 1,
    maxY: (Math.max(...chunkYs) + 1) * CHUNK_SIZE - 1,
  };
}

interface OutlineTile {
  readonly lane: number;
  readonly depth: number;
  readonly point: Point;
}

function outlineTiles(town: Town, side: GateSide): OutlineTile[] {
  const { alongX, outward } = SIDE_GEOMETRY[side];
  const bounds = footprintBounds(town);
  const laneFirst = alongX ? bounds.minX : bounds.minY;
  const laneLast = alongX ? bounds.maxX : bounds.maxY;
  const depthFirst = alongX ? bounds.minY : bounds.minX;
  const depthLast = alongX ? bounds.maxY : bounds.maxX;
  const tiles: OutlineTile[] = [];
  for (let lane = laneFirst; lane <= laneLast; lane++) {
    for (let step = 0; depthFirst + step <= depthLast; step++) {
      const depth = outward === 1 ? depthLast - step : depthFirst + step;
      const x = alongX ? lane : depth;
      const y = alongX ? depth : lane;
      if (townInfoAt(x, y)?.inside) {
        tiles.push({ lane, depth: outward * depth, point: { x: x + 0.5, y: y + 0.5 } });
        break;
      }
    }
  }
  return tiles;
}

function findGate(town: Town, side: GateSide): Point {
  const tiles = outlineTiles(town, side);
  const deepest = Math.max(...tiles.map((tile) => tile.depth));
  const facing = tiles.filter((tile) => tile.depth >= deepest - TOWN_OUTLINE_WOBBLE_TILES);
  const firstLane = facing[0].lane;
  const span = facing[facing.length - 1].lane - firstLane + 1;
  const middle = facing.filter(
    (tile) => tile.lane >= firstLane + span / 3 && tile.lane <= firstLane + (2 * span) / 3,
  );
  const candidates = middle.length > 0 ? middle : facing;
  const pick = Math.floor(randomValue(`gate:${town.cx}:${town.cy}:${side}`) * candidates.length);
  return candidates[pick].point;
}

export function townGate(town: Town, side: GateSide): Point {
  return remember(gateCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}:${side}`, () =>
    findGate(town, side),
  );
}
