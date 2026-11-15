import {
  ROAD_BEND_CONTROL_COUNT,
  ROAD_BEND_MAX_TILES,
  ROAD_POLYLINE_CACHE_MAX_ENTRIES,
  ROAD_SEGMENT_LENGTH_TILES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { randomValue } from '../core/keyedRandom';
import { edgeKey, isEdgeOrdered, waypointPosition } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';

const polylineCache = new Map<string, readonly Point[]>();

function smoothBetween(from: number, to: number, t: number): number {
  const eased = (1 - Math.cos(t * Math.PI)) / 2;
  return from + (to - from) * eased;
}

function bendOffsets(key: string): number[] {
  const interior = Array.from(
    { length: ROAD_BEND_CONTROL_COUNT },
    (_, index) => (randomValue(`bend:${key}:${index}`) * 2 - 1) * ROAD_BEND_MAX_TILES,
  );
  return [0, ...interior, 0];
}

function bendAt(offsets: readonly number[], t: number): number {
  const scaled = t * (offsets.length - 1);
  const index = Math.min(offsets.length - 2, Math.floor(scaled));
  return smoothBetween(offsets[index], offsets[index + 1], scaled - index);
}

function buildPolyline(key: string, start: Point, end: Point): readonly Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  const normal = { x: -dy / length, y: dx / length };
  const offsets = bendOffsets(key);
  const segmentCount = Math.max(2, Math.ceil(length / ROAD_SEGMENT_LENGTH_TILES));

  const points: Point[] = [];
  for (let step = 0; step <= segmentCount; step++) {
    const t = step / segmentCount;
    const bend = bendAt(offsets, t);
    points.push({ x: start.x + dx * t + normal.x * bend, y: start.y + dy * t + normal.y * bend });
  }
  return points;
}

export function edgePolyline(ax: number, ay: number, bx: number, by: number): readonly Point[] {
  const key = edgeKey(ax, ay, bx, by);
  return remember(polylineCache, ROAD_POLYLINE_CACHE_MAX_ENTRIES, key, () => {
    const ordered = isEdgeOrdered(ax, ay, bx, by);
    const start = ordered ? waypointPosition(ax, ay) : waypointPosition(bx, by);
    const end = ordered ? waypointPosition(bx, by) : waypointPosition(ax, ay);
    return buildPolyline(key, start, end);
  });
}
