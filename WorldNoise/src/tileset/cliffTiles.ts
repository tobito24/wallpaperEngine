import { CLIFF_WALL_HEIGHT_FRACTION, TILESET_TILE_SIZE_PX } from '../config/constants';
import { drawOutsideRegion } from './outsideTileset';
import type { TileRegion } from './outsideTileset';

const SOUTH_WALL_REGION: TileRegion = {
  column: 1,
  row: 100,
  x: 0,
  y: TILESET_TILE_SIZE_PX / 2,
  width: TILESET_TILE_SIZE_PX,
  height: TILESET_TILE_SIZE_PX / 2,
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
