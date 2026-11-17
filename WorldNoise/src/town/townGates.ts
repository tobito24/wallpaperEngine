import {
  CHUNK_SIZE,
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_GATE_LEVEL_DEPTH_TILES,
  TOWN_GATE_LEVEL_HALF_WIDTH_TILES,
  TOWN_GATE_PAD_DEPTH_TILES,
  TOWN_GATE_WATER_COST,
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

const OPPOSITE_SIDE: Readonly<Record<GateSide, GateSide>> = {
  east: 'west',
  west: 'east',
  south: 'north',
  north: 'south',
};

function middleThird(lanes: readonly EdgeLane[]): EdgeLane[] {
  const firstLane = lanes[0].lane;
  const span = lanes[lanes.length - 1].lane - firstLane + 1;
  const middle = lanes.filter(
    (candidate) => candidate.lane >= firstLane + span / 3 && candidate.lane <= firstLane + (2 * span) / 3,
  );
  return middle.length > 0 ? middle : [...lanes];
}

function pickWithFewestWater(
  candidates: readonly EdgeLane[],
  waterOf: (candidate: EdgeLane) => number,
  key: string,
): EdgeLane {
  const scored = candidates.map((candidate) => ({ candidate, water: waterOf(candidate) }));
  const fewestWater = Math.min(...scored.map((entry) => entry.water));
  const best = scored.filter((entry) => entry.water === fewestWater);
  return best[Math.floor(randomValue(key) * best.length)].candidate;
}

function sharedLaneKey(town: Town, side: GateSide): string {
  const pair = [side, OPPOSITE_SIDE[side]].sort().join('-');
  return `gate:${town.cx}:${town.cy}:${pair}`;
}

function gateCost(town: Town, lane: EdgeLane, side: GateSide): number {
  return waterNear(lane, side) * TOWN_GATE_WATER_COST + levelVariation(town, lane, side);
}

function ringLevelBeyond(town: Town, x: number, y: number): number {
  const baseLevel = heightLevelAt(x, y, elevationNoise(x, y));
  if (baseLevel === WATER_LEVEL) return WATER_LEVEL;
  return Math.min(town.plateauLevel + 1, Math.max(town.plateauLevel - 1, baseLevel));
}

function levelVariation(town: Town, lane: EdgeLane, side: GateSide): number {
  const { alongX, outward } = SIDE_GEOMETRY[side];
  const centreX = Math.floor(lane.point.x);
  const centreY = Math.floor(lane.point.y);
  const levelAt = (across: number, depth: number): number =>
    ringLevelBeyond(
      town,
      centreX + (alongX ? across : outward * depth),
      centreY + (alongX ? outward * depth : across),
    );
  const firstDepth = TOWN_GATE_PAD_DEPTH_TILES + 1;
  const referenceLevel = levelAt(0, firstDepth);
  let varying = 0;
  for (let across = -TOWN_GATE_LEVEL_HALF_WIDTH_TILES; across <= TOWN_GATE_LEVEL_HALF_WIDTH_TILES; across++) {
    for (let depth = firstDepth; depth < firstDepth + TOWN_GATE_LEVEL_DEPTH_TILES; depth++) {
      if (levelAt(across, depth) !== referenceLevel) varying++;
    }
  }
  return varying;
}

function findGate(town: Town, side: GateSide): Point {
  const opposite = OPPOSITE_SIDE[side];
  const ownLanes = edgeLanes(town, side);
  const oppositeLanes = edgeLanes(town, opposite);
  const oppositeByLane = new Map(oppositeLanes.map((candidate) => [candidate.lane, candidate]));
  const commonLanes = ownLanes.filter((candidate) => oppositeByLane.has(candidate.lane));

  if (commonLanes.length > 0) {
    const ownMiddle = new Set(middleThird(ownLanes).map((candidate) => candidate.lane));
    const oppositeMiddle = new Set(middleThird(oppositeLanes).map((candidate) => candidate.lane));
    const preferred = commonLanes.filter(
      (candidate) => ownMiddle.has(candidate.lane) && oppositeMiddle.has(candidate.lane),
    );
    const costOnBothSides = (candidate: EdgeLane): number =>
      gateCost(town, candidate, side) +
      gateCost(town, oppositeByLane.get(candidate.lane) as EdgeLane, opposite);
    const cheapestOf = (candidates: readonly EdgeLane[]): number =>
      Math.min(...candidates.map(costOnBothSides));
    const searched =
      preferred.length > 0 && cheapestOf(preferred) <= cheapestOf(commonLanes) ? preferred : commonLanes;
    return pickWithFewestWater(searched, costOnBothSides, sharedLaneKey(town, side)).point;
  }

  return pickWithFewestWater(
    middleThird(ownLanes),
    (candidate) => gateCost(town, candidate, side),
    `gate:${town.cx}:${town.cy}:${side}`,
  ).point;
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
