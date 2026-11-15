import { ROAD_HALF_WIDTH_TILES } from '../config/constants';
import { cellIndexOf, edgeExists, waypointPosition } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { edgePolyline } from './roadCurve';

const EDGE_DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];

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
          mask[(y - minY) * width + (x - minX)] = 1;
        }
      }
    }
  }
}

export function roadTilesIn(minX: number, minY: number, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  const firstCellX = cellIndexOf(minX) - 1;
  const lastCellX = cellIndexOf(minX + width - 1) + 1;
  const firstCellY = cellIndexOf(minY) - 1;
  const lastCellY = cellIndexOf(minY + height - 1) + 1;

  for (let cy = firstCellY; cy <= lastCellY; cy++) {
    for (let cx = firstCellX; cx <= lastCellX; cx++) {
      for (const [dx, dy] of EDGE_DIRECTIONS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!edgeExists(cx, cy, nx, ny)) continue;
        const polyline = edgePolyline(cx, cy, nx, ny, waypointPosition(cx, cy), waypointPosition(nx, ny));
        markPolyline(mask, polyline, minX, minY, width, height);
      }
    }
  }
  return mask;
}
