import { CROSSING_HALF_LENGTH_TILES, ROAD_EDGE_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { cellIndexOf, edgeExists, edgeKey } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { centreOf, crossingCandidates, placeCrossing } from './roadCrossing';
import type { RoadCrossing } from './roadCrossing';
import { edgeCurve } from './roadCurve';
import { CROSSING_SPACING_TILES, straightenThrough } from './roadStraightening';

export interface RoadEdge {
  readonly polyline: readonly Point[];
  readonly crossings: readonly RoadCrossing[];
}

const EDGE_DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];

const edgeCache = new Map<string, RoadEdge>();

function isDisjoint(a: RoadCrossing, b: RoadCrossing): boolean {
  const first = centreOf(a);
  const second = centreOf(b);
  return Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y)) >= CROSSING_SPACING_TILES;
}

function chainsOnto(previous: RoadCrossing, next: RoadCrossing): boolean {
  if (previous.travelAxis !== next.travelAxis) return false;
  const gapTiles = Math.abs(next.boundary - previous.boundary) - 2 * CROSSING_HALF_LENGTH_TILES;
  return gapTiles >= 2 * Math.abs(next.lane - previous.lane);
}

function buildEdge(ax: number, ay: number, bx: number, by: number): RoadEdge {
  const curve = edgeCurve(ax, ay, bx, by);
  const runs: RoadCrossing[][] = [];
  let polylineBeforeLastRun = curve;
  let polyline = curve;

  for (const base of crossingCandidates(curve)) {
    const lastRun = runs.at(-1);
    const previous = lastRun?.[lastRun.length - 1];
    const candidate =
      previous !== undefined && !isDisjoint(previous, base)
        ? placeCrossing(base, previous.lane, (placed) => chainsOnto(previous, placed))
        : placeCrossing(base, base.lane, () => true);
    if (candidate === null) continue;

    const earlierRuns = runs.slice(0, -1).flat();
    if (!earlierRuns.every((other) => isDisjoint(other, candidate))) continue;

    if (lastRun === undefined || lastRun.every((other) => isDisjoint(other, candidate))) {
      const straightened = straightenThrough(polyline, [candidate]);
      if (straightened === null) continue;
      polylineBeforeLastRun = polyline;
      polyline = straightened;
      runs.push([candidate]);
      continue;
    }

    if (!chainsOnto(lastRun[lastRun.length - 1], candidate)) continue;
    const extendedRun = [...lastRun, candidate];
    const straightened = straightenThrough(polylineBeforeLastRun, extendedRun);
    if (straightened === null) continue;
    polyline = straightened;
    runs[runs.length - 1] = extendedRun;
  }
  return { polyline, crossings: runs.flat() };
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
