import { ROAD_BEND_CONTROL_COUNT, ROAD_BEND_MAX_TILES, ROAD_SEGMENT_LENGTH_TILES } from '../config/constants';
import { randomValue } from '../core/keyedRandom';
import { edgeKey, isEdgeOrdered } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { gateSideOf, townGate } from '../town/townGates';
import { nodePosition } from '../town/townNodes';
import { townOfCell } from '../town/townPlacement';

interface RoadEnd {
  readonly outer: Point;
  readonly townNode: Point | null;
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

function buildPolyline(key: string, start: RoadEnd, end: RoadEnd): readonly Point[] {
  const dx = end.outer.x - start.outer.x;
  const dy = end.outer.y - start.outer.y;
  const length = Math.hypot(dx, dy);
  const normal = { x: -dy / length, y: dx / length };
  const offsets = bendOffsets(key);
  const segmentCount = Math.max(2, Math.ceil(length / ROAD_SEGMENT_LENGTH_TILES));

  const points: Point[] = [];
  for (let step = 0; step <= segmentCount; step++) {
    const t = step / segmentCount;
    const bend = bendAt(offsets, t);
    points.push({
      x: start.outer.x + dx * t + normal.x * bend,
      y: start.outer.y + dy * t + normal.y * bend,
    });
  }
  return points;
}

function roadEnd(cx: number, cy: number, towardCx: number, towardCy: number): RoadEnd {
  const town = townOfCell(cx, cy);
  if (!town) return { outer: nodePosition(cx, cy), townNode: null };
  return { outer: townGate(town, gateSideOf(towardCx - cx, towardCy - cy)), townNode: town.center };
}

export function edgeCurve(ax: number, ay: number, bx: number, by: number): readonly Point[] {
  const key = edgeKey(ax, ay, bx, by);
  const ordered = isEdgeOrdered(ax, ay, bx, by);
  const start = ordered ? roadEnd(ax, ay, bx, by) : roadEnd(bx, by, ax, ay);
  const end = ordered ? roadEnd(bx, by, ax, ay) : roadEnd(ax, ay, bx, by);
  const bent = buildPolyline(key, start, end);
  return [...(start.townNode ? [start.townNode] : []), ...bent, ...(end.townNode ? [end.townNode] : [])];
}
