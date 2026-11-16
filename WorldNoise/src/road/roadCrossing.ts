import {
  CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES,
  CROSSING_HALF_LENGTH_TILES,
  CROSSING_LANES_AFTER_TILES,
  CROSSING_LANES_BEFORE_TILES,
  CROSSING_MAX_FLATTENED_TILES,
} from '../config/constants';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt, waterClearanceTiles } from '../elevation/heightLevel';
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

export type CrossingOutcome = 'stairs' | 'unplanned';

export interface TileRectangle {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

export const EAST_WEST_STAIRS_ROWS = 4;
export const EAST_WEST_STAIRS_FIRST_ROW_OFFSET_TILES = -1;

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

export function flattenCostOf(crossing: RoadCrossing): number | null {
  const cost = tilesToFlatten(crossing);
  if (cost > CROSSING_MAX_FLATTENED_TILES || hasWaterNear(crossing)) return null;
  return cost;
}
