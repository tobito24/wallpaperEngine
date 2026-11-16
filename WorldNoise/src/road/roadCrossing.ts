import {
  CELL_BUFFER_CHUNKS,
  CHUNK_SIZE,
  CROSSING_BOUNDARY_SEARCH_TILES,
  CROSSING_HALF_LENGTH_TILES,
  CROSSING_HALF_WIDTH_TILES,
  CROSSING_MAX_LANE_SHIFT_TILES,
  CROSSING_SAMPLE_STEP_TILES,
  ROAD_BEND_MAX_TILES,
} from '../config/constants';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import { WATER_LIMIT_REACH_TILES } from '../elevation/levelCleanup';
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

export interface TileRectangle {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

const FIRST_CLIFF_LEVEL = 2;
const SUPPORT_DISTANCES_TILES = [2, CROSSING_HALF_LENGTH_TILES];
const SUPPORT_LANE_OFFSETS = [-CROSSING_HALF_WIDTH_TILES, 0, CROSSING_HALF_WIDTH_TILES];
const LANE_SHIFTS = Array.from({ length: 2 * CROSSING_MAX_LANE_SHIFT_TILES + 1 }, (_, index) =>
  index % 2 === 0 ? index / 2 : -(index + 1) / 2,
);
const MAX_FOOTPRINT_REACH_TILES = CELL_BUFFER_CHUNKS * CHUNK_SIZE - ROAD_BEND_MAX_TILES;

if (
  Math.max(
    CROSSING_HALF_LENGTH_TILES + CROSSING_BOUNDARY_SEARCH_TILES,
    CROSSING_HALF_WIDTH_TILES + CROSSING_MAX_LANE_SHIFT_TILES,
  ) >= MAX_FOOTPRINT_REACH_TILES
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
  const alongLane = crossing.lane - CROSSING_HALF_WIDTH_TILES;
  const lengthTiles = 2 * CROSSING_HALF_LENGTH_TILES;
  const widthTiles = 2 * CROSSING_HALF_WIDTH_TILES + 1;
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

function isSupportedByTerrain(crossing: RoadCrossing): boolean {
  for (const side of [crossing.upperSide, oppositeOf(crossing.upperSide)]) {
    const expectedLevel = side === crossing.upperSide ? crossing.upperLevel : crossing.lowerLevel;
    for (const distance of SUPPORT_DISTANCES_TILES) {
      const along = side === 1 ? crossing.boundary + distance - 1 : crossing.boundary - distance;
      for (const laneOffset of SUPPORT_LANE_OFFSETS) {
        const lane = crossing.lane + laneOffset;
        if (levelAtLane(crossing, along, lane) !== expectedLevel) return false;
      }
    }
  }
  return true;
}

function isBuildable(crossing: RoadCrossing): boolean {
  const { minX, minY, width, height } = footprintOf(crossing);
  const reach = WATER_LIMIT_REACH_TILES;
  for (let y = minY - reach; y < minY + height + reach; y++) {
    for (let x = minX - reach; x < minX + width + reach; x++) {
      if (heightLevelAt(x, y, elevationNoise(x, y)) === WATER_LEVEL) return false;
    }
  }
  for (let y = minY; y < minY + height; y++) {
    for (let x = minX; x < minX + width; x++) {
      if (townInfoAt(x, y) !== null) return false;
    }
  }
  return true;
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

function shiftedAlongBoundary(candidate: RoadCrossing): RoadCrossing | null {
  for (const shift of LANE_SHIFTS) {
    const lane = candidate.lane + shift;
    const boundary = boundaryAtLane(candidate, lane);
    if (boundary === null) continue;
    const shifted = { ...candidate, id: `${candidate.travelAxis}:${boundary}:${lane}`, boundary, lane };
    if (isSupportedByTerrain(shifted) && isBuildable(shifted)) return shifted;
  }
  return null;
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
  return candidates.flatMap((candidate) => shiftedAlongBoundary(candidate) ?? []);
}
