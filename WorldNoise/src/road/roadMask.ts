import { ROAD_HALF_WIDTH_TILES } from '../config/constants';
import type { Point } from '../skeleton/cellGrid';
import { roadEdgesIn } from './roadEdge';

export const ROAD_TILE_MARK = 1;

function distanceToSegment(px: number, py: number, from: Point, to: Point): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.min(1, Math.max(0, ((px - from.x) * dx + (py - from.y) * dy) / lengthSquared));
  return Math.hypot(px - (from.x + dx * t), py - (from.y + dy * t));
}

function markPolyline(
  mask: Uint8Array,
  polyline: readonly Point[],
  minX: number,
  minY: number,
  width: number,
  height: number,
): void {
  for (let index = 0; index + 1 < polyline.length; index++) {
    const from = polyline[index];
    const to = polyline[index + 1];
    const firstX = Math.max(minX, Math.floor(Math.min(from.x, to.x) - ROAD_HALF_WIDTH_TILES));
    const lastX = Math.min(minX + width - 1, Math.ceil(Math.max(from.x, to.x) + ROAD_HALF_WIDTH_TILES));
    const firstY = Math.max(minY, Math.floor(Math.min(from.y, to.y) - ROAD_HALF_WIDTH_TILES));
    const lastY = Math.min(minY + height - 1, Math.ceil(Math.max(from.y, to.y) + ROAD_HALF_WIDTH_TILES));

    for (let y = firstY; y <= lastY; y++) {
      for (let x = firstX; x <= lastX; x++) {
        if (distanceToSegment(x + 0.5, y + 0.5, from, to) <= ROAD_HALF_WIDTH_TILES) {
          mask[(y - minY) * width + (x - minX)] = ROAD_TILE_MARK;
        }
      }
    }
  }
}

export function roadTilesIn(minX: number, minY: number, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (const edge of roadEdgesIn(minX, minY, width, height)) {
    markPolyline(mask, edge.polyline, minX, minY, width, height);
  }
  return mask;
}
