import {
  CELL_BUFFER_CHUNKS,
  CHUNK_SIZE,
  CROSSING_BOUNDARY_SEARCH_TILES,
  CROSSING_HALF_LENGTH_TILES,
  CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES,
  CROSSING_LANES_AFTER_TILES,
  CROSSING_LANES_BEFORE_TILES,
  CROSSING_MAX_FLATTENED_TILES,
  CROSSING_MAX_LANE_SHIFT_TILES,
  CROSSING_SAMPLE_STEP_TILES,
  ROAD_BEND_MAX_TILES,
} from '../config/constants';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt, waterClearanceTiles } from '../elevation/heightLevel';
import type { Point } from '../skeleton/cellGrid';
import { levelWithTown, townInfoAt } from '../town/townTerrain';

export type TravelAxis = 'x' | 'y';
export type Side = 1 | -1;

export interface RoadCrossing {
  readonly id: string;
  readonly travelAxis: TravelAxis;
  readonly boundary: number;
  readonly lane: number;
  readonly upperSide: Side;
  readonly upperLevel: number;
  readonly lowerLevel: number;
}

export type CrossingOutcome = 'stairs' | 'noBoundary' | 'overlap' | 'tooExpensive' | 'water' | 'curve';
export type PlacementFailure = 'noBoundary' | 'overlap' | 'tooExpensive' | 'water';
export type Placement = { readonly placed: RoadCrossing } | { readonly failure: PlacementFailure };

export interface TileRectangle {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

const FIRST_CLIFF_LEVEL = 2;
const FAILURE_STAGE: Readonly<Record<PlacementFailure, number>> = {
  noBoundary: 0,
  overlap: 1,
  tooExpensive: 2,
  water: 3,
};
export const EAST_WEST_STAIRS_ROWS = 4;
export const EAST_WEST_STAIRS_FIRST_ROW_OFFSET_TILES = -1;
const MAX_FOOTPRINT_REACH_TILES = CELL_BUFFER_CHUNKS * CHUNK_SIZE - ROAD_BEND_MAX_TILES;

if (
  Math.max(
    CROSSING_HALF_LENGTH_TILES + CROSSING_BOUNDARY_SEARCH_TILES,
    CROSSING_LANES_AFTER_TILES + CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES + CROSSING_MAX_LANE_SHIFT_TILES,
  ) +
    1 >
  MAX_FOOTPRINT_REACH_TILES
) {
  throw new Error('A crossing footprint must stay closer to its road than a road to the edge of its cell');
}

export function centreOf(crossing: RoadCrossing): { readonly x: number; readonly y: number } {
  return crossing.travelAxis === 'x'
    ? { x: crossing.boundary, y: crossing.lane }
    : { x: crossing.lane, y: crossing.boundary };
}

export function footprintOf(crossing: RoadCrossing): TileRectangle {
  const alongTravel = crossing.boundary - CROSSING_HALF_LENGTH_TILES;
  const alongLane = crossing.lane - CROSSING_LANES_BEFORE_TILES;
  const lengthTiles = 2 * CROSSING_HALF_LENGTH_TILES;
  const lanesAfter =
    CROSSING_LANES_AFTER_TILES +
    (crossing.travelAxis === 'x' ? CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES : 0);
  const widthTiles = CROSSING_LANES_BEFORE_TILES + lanesAfter + 1;
  return crossing.travelAxis === 'x'
    ? { minX: alongTravel, minY: alongLane, width: lengthTiles, height: widthTiles }
    : { minX: alongLane, minY: alongTravel, width: widthTiles, height: lengthTiles };
}

export function terrainLevelAt(tileX: number, tileY: number): number {
  return levelWithTown(heightLevelAt(tileX, tileY, elevationNoise(tileX, tileY)), townInfoAt(tileX, tileY));
}

function levelAtLane(crossing: RoadCrossing, along: number, lane: number): number {
  return crossing.travelAxis === 'x' ? terrainLevelAt(along, lane) : terrainLevelAt(lane, along);
}

function boundaryAtLane(crossing: RoadCrossing, lane: number): number | null {
  const lowerFirst = crossing.upperSide === 1;
  const firstLevel = lowerFirst ? crossing.lowerLevel : crossing.upperLevel;
  const secondLevel = lowerFirst ? crossing.upperLevel : crossing.lowerLevel;
  for (let offset = 0; offset <= CROSSING_BOUNDARY_SEARCH_TILES; offset++) {
    for (const candidate of [crossing.boundary + offset, crossing.boundary - offset]) {
      if (
        levelAtLane(crossing, candidate - 1, lane) === firstLevel &&
        levelAtLane(crossing, candidate, lane) === secondLevel
      ) {
        return candidate;
      }
    }
  }
  return null;
}

export function lowerSideLaneOffsetTiles(crossing: RoadCrossing): number {
  return crossing.travelAxis === 'x' ? 1 : 0;
}

export function bulgeColumnOf(crossing: RoadCrossing): number {
  return crossing.upperSide === -1 ? crossing.boundary : crossing.boundary - 1;
}

function straightLevelAt(crossing: RoadCrossing, tileX: number, tileY: number): number {
  const along = crossing.travelAxis === 'x' ? tileX : tileY;
  const side: Side = along >= crossing.boundary ? 1 : -1;
  return side === crossing.upperSide ? crossing.upperLevel : crossing.lowerLevel;
}

export function plannedLevelAt(crossing: RoadCrossing, tileX: number, tileY: number): number {
  const inBulge =
    crossing.travelAxis === 'x' &&
    tileX === bulgeColumnOf(crossing) &&
    tileY >= crossing.lane + EAST_WEST_STAIRS_FIRST_ROW_OFFSET_TILES &&
    tileY < crossing.lane + EAST_WEST_STAIRS_FIRST_ROW_OFFSET_TILES + EAST_WEST_STAIRS_ROWS;
  return inBulge ? crossing.upperLevel : straightLevelAt(crossing, tileX, tileY);
}

function tilesToFlatten(crossing: RoadCrossing): number {
  const { minX, minY, width, height } = footprintOf(crossing);
  let count = 0;
  for (let y = minY; y < minY + height; y++) {
    for (let x = minX; x < minX + width; x++) {
      if (terrainLevelAt(x, y) !== straightLevelAt(crossing, x, y)) count++;
    }
  }
  return count;
}

function waterReachTiles(crossing: RoadCrossing): number {
  const clearance = Math.max(
    waterClearanceTiles(crossing.upperLevel),
    waterClearanceTiles(crossing.lowerLevel),
  );
  return Math.max(0, clearance - 1);
}

function hasWaterNear(crossing: RoadCrossing): boolean {
  const { minX, minY, width, height } = footprintOf(crossing);
  const reach = waterReachTiles(crossing);
  for (let y = minY - reach; y < minY + height + reach; y++) {
    for (let x = minX - reach; x < minX + width + reach; x++) {
      if (heightLevelAt(x, y, elevationNoise(x, y)) === WATER_LEVEL) return true;
    }
  }
  return false;
}

function oppositeOf(side: Side): Side {
  return side === 1 ? -1 : 1;
}

function crossingBetween(
  previous: Point,
  current: Point,
  previousLevel: number,
  currentLevel: number,
): RoadCrossing {
  const dx = current.x - previous.x;
  const dy = current.y - previous.y;
  const travelAxis: TravelAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  const travelStep = travelAxis === 'x' ? dx : dy;
  const middleAlongTravel = (travelAxis === 'x' ? previous.x + current.x : previous.y + current.y) / 2;
  const middleAlongLane = (travelAxis === 'x' ? previous.y + current.y : previous.x + current.x) / 2;
  const boundary = Math.round(middleAlongTravel);
  const lane = Math.floor(middleAlongLane);
  const travelDirection: Side = travelStep >= 0 ? 1 : -1;
  const upperLevel = Math.max(previousLevel, currentLevel);
  return {
    id: `${travelAxis}:${boundary}:${lane}`,
    travelAxis,
    boundary,
    lane,
    upperSide: currentLevel > previousLevel ? travelDirection : oppositeOf(travelDirection),
    upperLevel,
    lowerLevel: upperLevel - 1,
  };
}

function lanesNear(candidate: RoadCrossing, preferredLane: number): number[] {
  const lanes = Array.from(
    { length: 2 * CROSSING_MAX_LANE_SHIFT_TILES + 1 },
    (_, index) => candidate.lane - CROSSING_MAX_LANE_SHIFT_TILES + index,
  );
  return lanes.sort((a, b) => Math.abs(a - preferredLane) - Math.abs(b - preferredLane) || a - b);
}

export function placeCrossing(
  candidate: RoadCrossing,
  preferredLane: number,
  isAllowed: (placed: RoadCrossing) => boolean,
): Placement {
  let best: RoadCrossing | null = null;
  let bestCost = CROSSING_MAX_FLATTENED_TILES + 1;
  let failure: PlacementFailure = 'noBoundary';
  const fail = (reason: PlacementFailure): void => {
    if (FAILURE_STAGE[reason] > FAILURE_STAGE[failure]) failure = reason;
  };
  for (const lane of lanesNear(candidate, preferredLane)) {
    const boundary = boundaryAtLane(candidate, lane);
    if (boundary === null) continue;
    const placed = { ...candidate, id: `${candidate.travelAxis}:${boundary}:${lane}`, boundary, lane };
    if (!isAllowed(placed)) {
      fail('overlap');
      continue;
    }
    const cost = tilesToFlatten(placed);
    if (cost > CROSSING_MAX_FLATTENED_TILES) {
      fail('tooExpensive');
      continue;
    }
    if (cost >= bestCost) continue;
    if (hasWaterNear(placed)) {
      fail('water');
      continue;
    }
    best = placed;
    bestCost = cost;
  }
  return best === null ? { failure } : { placed: best };
}

export function crossingCandidates(curve: readonly Point[]): RoadCrossing[] {
  const candidates: RoadCrossing[] = [];
  let previous = curve[0];
  let previousLevel = terrainLevelAt(Math.floor(previous.x), Math.floor(previous.y));
  for (let index = 0; index + 1 < curve.length; index++) {
    const from = curve[index];
    const to = curve[index + 1];
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / CROSSING_SAMPLE_STEP_TILES),
    );
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const current = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      const currentLevel = terrainLevelAt(Math.floor(current.x), Math.floor(current.y));
      if (currentLevel !== previousLevel) {
        const upperLevel = Math.max(previousLevel, currentLevel);
        const lowerLevel = Math.min(previousLevel, currentLevel);
        if (upperLevel >= FIRST_CLIFF_LEVEL && lowerLevel > WATER_LEVEL) {
          candidates.push(crossingBetween(previous, current, previousLevel, currentLevel));
        }
      }
      previous = current;
      previousLevel = currentLevel;
    }
  }
  return candidates;
}
