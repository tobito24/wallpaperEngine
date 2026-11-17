import {
  CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES,
  CROSSING_HALF_LENGTH_TILES,
  CROSSING_LANES_AFTER_TILES,
  CROSSING_LANES_BEFORE_TILES,
  CROSSING_MAX_FLATTENED_TILES,
  CROSSING_MAX_CONVERTED_WATER_TILES,
  CROSSING_MAX_FLATTENED_TILES_AT_TOWN,
  CROSSING_RELAXED_MAX_FLATTENED_TILES,
  CROSSING_RELAXED_MAX_FLATTENED_TILES_AT_TOWN,
  CROSSING_WATER_TILE_FLATTEN_EQUIVALENT,
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

interface FootprintWork {
  readonly flattened: number;
  readonly convertedWater: number;
  readonly touchesTown: boolean;
}

export function waterReachTiles(crossing: RoadCrossing): number {
  const clearance = Math.max(
    waterClearanceTiles(crossing.upperLevel),
    waterClearanceTiles(crossing.lowerLevel),
  );
  return Math.max(0, clearance - 1);
}

export function waterZoneOf(crossing: RoadCrossing): TileRectangle {
  const { minX, minY, width, height } = footprintOf(crossing);
  const reach = waterReachTiles(crossing);
  return { minX: minX - reach, minY: minY - reach, width: width + 2 * reach, height: height + 2 * reach };
}

function isInside(rectangle: TileRectangle, tileX: number, tileY: number): boolean {
  return (
    tileX >= rectangle.minX &&
    tileX < rectangle.minX + rectangle.width &&
    tileY >= rectangle.minY &&
    tileY < rectangle.minY + rectangle.height
  );
}

function workOf(crossing: RoadCrossing): FootprintWork {
  const footprint = footprintOf(crossing);
  const zone = waterZoneOf(crossing);
  let flattened = 0;
  let convertedWater = 0;
  let touchesTown = false;
  for (let y = zone.minY; y < zone.minY + zone.height; y++) {
    for (let x = zone.minX; x < zone.minX + zone.width; x++) {
      const terrain = terrainLevelAt(x, y);
      if (terrain === WATER_LEVEL) convertedWater++;
      else if (isInside(footprint, x, y) && terrain !== straightLevelAt(crossing, x, y)) flattened++;
      if (isInside(footprint, x, y) && townInfoAt(x, y) !== null) touchesTown = true;
    }
  }
  return { flattened, convertedWater, touchesTown };
}

export function flattenCostOf(crossing: RoadCrossing, relaxed = false): number | null {
  const { flattened, convertedWater, touchesTown } = workOf(crossing);
  const limit = relaxed
    ? touchesTown
      ? CROSSING_RELAXED_MAX_FLATTENED_TILES_AT_TOWN
      : CROSSING_RELAXED_MAX_FLATTENED_TILES
    : touchesTown
      ? CROSSING_MAX_FLATTENED_TILES_AT_TOWN
      : CROSSING_MAX_FLATTENED_TILES;
  if (flattened > limit || convertedWater > CROSSING_MAX_CONVERTED_WATER_TILES) return null;
  return flattened + CROSSING_WATER_TILE_FLATTEN_EQUIVALENT * convertedWater;
}
