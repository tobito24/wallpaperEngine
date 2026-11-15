import {
  CLIFF_NORTH_RIM_HEIGHT_FRACTION,
  CLIFF_WALL_HEIGHT_FRACTION,
  TILESET_TILE_SIZE_PX,
} from '../config/constants';
import { drawOutsideRegion } from './outsideTileset';
import type { TileRegion } from './outsideTileset';

const NORTH_RIM_SOURCE_HEIGHT_PX = 8;

const SOUTH_WALL_REGION: TileRegion = {
  column: 1,
  row: 100,
  x: 0,
  y: TILESET_TILE_SIZE_PX / 2,
  width: TILESET_TILE_SIZE_PX,
  height: TILESET_TILE_SIZE_PX / 2,
};

const NORTH_RIM_REGION: TileRegion = {
  column: 0,
  row: 107,
  x: 0,
  y: 0,
  width: TILESET_TILE_SIZE_PX,
  height: NORTH_RIM_SOURCE_HEIGHT_PX,
};

const WEST_RIM_REGION: TileRegion = {
  column: 3,
  row: 102,
  x: 0,
  y: 0,
  width: TILESET_TILE_SIZE_PX,
  height: TILESET_TILE_SIZE_PX,
};

const EAST_RIM_REGION: TileRegion = {
  column: 5,
  row: 102,
  x: 0,
  y: 0,
  width: TILESET_TILE_SIZE_PX,
  height: TILESET_TILE_SIZE_PX,
};

export function drawCliffSouthWall(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  const wallHeight = Math.max(1, Math.floor(size * CLIFF_WALL_HEIGHT_FRACTION));
  return drawOutsideRegion(ctx, SOUTH_WALL_REGION, screenX, screenY + size - wallHeight, size, wallHeight);
}

export function drawCliffNorthRim(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  const rimHeight = Math.max(1, Math.floor(size * CLIFF_NORTH_RIM_HEIGHT_FRACTION));
  return drawOutsideRegion(ctx, NORTH_RIM_REGION, screenX, screenY, size, rimHeight);
}

export function drawCliffWestRim(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  return drawOutsideRegion(ctx, WEST_RIM_REGION, screenX, screenY, size, size);
}

export function drawCliffEastRim(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  return drawOutsideRegion(ctx, EAST_RIM_REGION, screenX, screenY, size, size);
}
