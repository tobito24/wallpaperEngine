import {
  ROAD_BEND_CONTROL_COUNT,
  ROAD_BEND_MAX_TILES,
  ROAD_SEGMENT_LENGTH_TILES,
  TOWN_STRAIGHT_ROAD_FADE_TILES,
} from '../config/constants';
import { randomValue } from '../core/keyedRandom';
import { edgeKey, isEdgeOrdered } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { nodePosition, straightRoadRadiusOf } from '../town/townNodes';

interface RoadEnd {
  readonly position: Point;
  readonly straightRadius: number | null;
}

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

function straightness(distanceFromEnd: number, straightRadius: number | null): number {
  if (straightRadius === null) return 1;
  return Math.min(1, Math.max(0, (distanceFromEnd - straightRadius) / TOWN_STRAIGHT_ROAD_FADE_TILES));
}

function buildPolyline(key: string, start: RoadEnd, end: RoadEnd): readonly Point[] {
  const dx = end.position.x - start.position.x;
  const dy = end.position.y - start.position.y;
  const length = Math.hypot(dx, dy);
  const normal = { x: -dy / length, y: dx / length };
  const offsets = bendOffsets(key);
  const segmentCount = Math.max(2, Math.ceil(length / ROAD_SEGMENT_LENGTH_TILES));

  const points: Point[] = [];
  for (let step = 0; step <= segmentCount; step++) {
    const t = step / segmentCount;
    const bend =
      bendAt(offsets, t) *
      straightness(t * length, start.straightRadius) *
      straightness((1 - t) * length, end.straightRadius);
    points.push({
      x: start.position.x + dx * t + normal.x * bend,
      y: start.position.y + dy * t + normal.y * bend,
    });
  }
  return points;
}

function roadEnd(cx: number, cy: number): RoadEnd {
  return { position: nodePosition(cx, cy), straightRadius: straightRoadRadiusOf(cx, cy) };
}

export function edgeCurve(ax: number, ay: number, bx: number, by: number): readonly Point[] {
  const key = edgeKey(ax, ay, bx, by);
  const ordered = isEdgeOrdered(ax, ay, bx, by);
  const start = ordered ? roadEnd(ax, ay) : roadEnd(bx, by);
  const end = ordered ? roadEnd(bx, by) : roadEnd(ax, ay);
  return buildPolyline(key, start, end);
}
