import { ROAD_EDGE_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { cellIndexOf, edgeExists, edgeKey } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { crossingCandidates } from './roadCrossing';
import type { RoadCrossing } from './roadCrossing';
import { edgeCurve } from './roadCurve';
import { CROSSING_SPACING_TILES, straightenAt } from './roadStraightening';

export interface RoadEdge {
  readonly polyline: readonly Point[];
  readonly crossings: readonly RoadCrossing[];
}

const EDGE_DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];

const edgeCache = new Map<string, RoadEdge>();

function isFarFromAll(candidate: RoadCrossing, accepted: readonly RoadCrossing[]): boolean {
  return accepted.every(
    (other) =>
      Math.abs(candidate.boundary - other.boundary) >= CROSSING_SPACING_TILES ||
      Math.abs(candidate.lane - other.lane) >= CROSSING_SPACING_TILES,
  );
}

function buildEdge(ax: number, ay: number, bx: number, by: number): RoadEdge {
  const curve = edgeCurve(ax, ay, bx, by);
  let polyline = curve;
  const crossings: RoadCrossing[] = [];
  for (const candidate of crossingCandidates(curve)) {
    if (!isFarFromAll(candidate, crossings)) continue;
    const straightened = straightenAt(polyline, candidate);
    if (straightened === null) continue;
    polyline = straightened;
    crossings.push(candidate);
  }
  return { polyline, crossings };
}

export function roadEdge(ax: number, ay: number, bx: number, by: number): RoadEdge {
  return remember(edgeCache, ROAD_EDGE_CACHE_MAX_ENTRIES, edgeKey(ax, ay, bx, by), () =>
    buildEdge(ax, ay, bx, by),
  );
}

export function roadEdgesIn(minX: number, minY: number, width: number, height: number): RoadEdge[] {
  const edges: RoadEdge[] = [];
  const firstCellX = cellIndexOf(minX) - 1;
  const lastCellX = cellIndexOf(minX + width - 1) + 1;
  const firstCellY = cellIndexOf(minY) - 1;
  const lastCellY = cellIndexOf(minY + height - 1) + 1;
  for (let cy = firstCellY; cy <= lastCellY; cy++) {
    for (let cx = firstCellX; cx <= lastCellX; cx++) {
      for (const [dx, dy] of EDGE_DIRECTIONS) {
        if (edgeExists(cx, cy, cx + dx, cy + dy)) edges.push(roadEdge(cx, cy, cx + dx, cy + dy));
      }
    }
  }
  return edges;
}
