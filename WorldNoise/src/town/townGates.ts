import {
  CHUNK_SIZE,
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_GATE_WATER_DEPTH_TILES,
  TOWN_GATE_WATER_HALF_WIDTH_TILES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { randomValue } from '../core/keyedRandom';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import type { Point } from '../skeleton/cellGrid';
import type { Town } from './townPlacement';

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

export function gateDirection(side: GateSide): readonly [number, number] {
  const { alongX, outward } = SIDE_GEOMETRY[side];
  return alongX ? [0, outward] : [outward, 0];
}

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

interface EdgeLane {
  readonly lane: number;
  readonly point: Point;
}

function edgeLanes(town: Town, side: GateSide): EdgeLane[] {
  const { alongX, outward } = SIDE_GEOMETRY[side];
  const bounds = footprintBounds(town);
  const laneFirst = alongX ? bounds.minX : bounds.minY;
  const laneLast = alongX ? bounds.maxX : bounds.maxY;
  const depthEdge = outward === 1 ? (alongX ? bounds.maxY : bounds.maxX) : alongX ? bounds.minY : bounds.minX;
  const lanes: EdgeLane[] = [];
  for (let lane = laneFirst; lane <= laneLast; lane++) {
    const x = alongX ? lane : depthEdge;
    const y = alongX ? depthEdge : lane;
    if (isFootprintTile(town, x, y)) lanes.push({ lane, point: { x: x + 0.5, y: y + 0.5 } });
  }
  return lanes;
}

function isFootprintTile(town: Town, tileX: number, tileY: number): boolean {
  const chunkX = Math.floor(tileX / CHUNK_SIZE);
  const chunkY = Math.floor(tileY / CHUNK_SIZE);
  return town.chunks.some(([x, y]) => x === chunkX && y === chunkY);
}

function waterNear(lane: EdgeLane, side: GateSide): number {
  const { alongX, outward } = SIDE_GEOMETRY[side];
  let count = 0;
  for (let across = -TOWN_GATE_WATER_HALF_WIDTH_TILES; across <= TOWN_GATE_WATER_HALF_WIDTH_TILES; across++) {
    for (let depth = 1; depth <= TOWN_GATE_WATER_DEPTH_TILES; depth++) {
      const x = Math.floor(lane.point.x) + (alongX ? across : outward * depth);
      const y = Math.floor(lane.point.y) + (alongX ? outward * depth : across);
      if (heightLevelAt(x, y, elevationNoise(x, y)) === WATER_LEVEL) count++;
    }
  }
  return count;
}

function findGate(town: Town, side: GateSide): Point {
  const lanes = edgeLanes(town, side);
  const firstLane = lanes[0].lane;
  const span = lanes[lanes.length - 1].lane - firstLane + 1;
  const middle = lanes.filter(
    (candidate) => candidate.lane >= firstLane + span / 3 && candidate.lane <= firstLane + (2 * span) / 3,
  );
  const scored = (middle.length > 0 ? middle : lanes).map((candidate) => ({
    candidate,
    water: waterNear(candidate, side),
  }));
  const fewestWater = Math.min(...scored.map((entry) => entry.water));
  const best = scored.filter((entry) => entry.water === fewestWater);
  const pick = Math.floor(randomValue(`gate:${town.cx}:${town.cy}:${side}`) * best.length);
  return best[pick].candidate.point;
}

export function townGate(town: Town, side: GateSide): Point {
  return remember(gateCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}:${side}`, () =>
    findGate(town, side),
  );
}

export const GATE_SIDES: readonly GateSide[] = ['east', 'west', 'south', 'north'];

export function gateSideGeometry(side: GateSide): SideGeometry {
  return SIDE_GEOMETRY[side];
}
