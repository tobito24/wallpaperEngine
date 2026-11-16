import { CROSSING_HALF_LENGTH_TILES, ROAD_EDGE_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { cellIndexOf, edgeExists, edgeKey } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { centreOf, crossingCandidates, lowerSideLaneOffsetTiles, placeCrossing } from './roadCrossing';
import type { CrossingOutcome, RoadCrossing } from './roadCrossing';
import { edgeCurve } from './roadCurve';
import { CROSSING_SPACING_TILES, straightenThrough } from './roadStraightening';

export interface CandidateOutcome {
  readonly x: number;
  readonly y: number;
  readonly outcome: CrossingOutcome;
}

export interface RoadEdge {
  readonly polyline: readonly Point[];
  readonly crossings: readonly RoadCrossing[];
  readonly candidateOutcomes: readonly CandidateOutcome[];
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
  const laneSpread =
    Math.abs(next.lane - previous.lane) +
    Math.max(lowerSideLaneOffsetTiles(previous), lowerSideLaneOffsetTiles(next));
  return gapTiles >= 2 * laneSpread;
}

function buildEdge(ax: number, ay: number, bx: number, by: number): RoadEdge {
  const curve = edgeCurve(ax, ay, bx, by);
  const runs: RoadCrossing[][] = [];
  const candidateOutcomes: CandidateOutcome[] = [];
  let polylineBeforeLastRun = curve;
  let polyline = curve;

  for (const base of crossingCandidates(curve)) {
    const record = (outcome: CrossingOutcome): void => {
      candidateOutcomes.push({ ...centreOf(base), outcome });
    };
    const lastRun = runs.at(-1);
    const previous = lastRun?.[lastRun.length - 1];
    const accepted = runs.flat();
    const earlier = runs.slice(0, -1).flat();
    const chained =
      previous !== undefined && !isDisjoint(previous, base)
        ? placeCrossing(
            base,
            previous.lane,
            (placed) => chainsOnto(previous, placed) && earlier.every((other) => isDisjoint(other, placed)),
          )
        : null;
    const placement =
      chained !== null && 'placed' in chained
        ? chained
        : placeCrossing(base, base.lane, (placed) => accepted.every((other) => isDisjoint(other, placed)));
    if ('failure' in placement) {
      record(placement.failure);
      continue;
    }
    const candidate = placement.placed;

    if (lastRun === undefined || lastRun.every((other) => isDisjoint(other, candidate))) {
      const straightened = straightenThrough(polyline, [candidate]);
      if (straightened === null) {
        record('curve');
        continue;
      }
      polylineBeforeLastRun = polyline;
      polyline = straightened;
      runs.push([candidate]);
      record('stairs');
      continue;
    }

    const extendedRun = [...lastRun, candidate];
    const straightened = straightenThrough(polylineBeforeLastRun, extendedRun);
    if (straightened === null) {
      record('curve');
      continue;
    }
    polyline = straightened;
    runs[runs.length - 1] = extendedRun;
    record('stairs');
  }
  return { polyline, crossings: runs.flat(), candidateOutcomes };
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
