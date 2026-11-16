import {
  CROSSING_APPROACH_TILES,
  CROSSING_BOUNDARY_SEARCH_TILES,
  CROSSING_HALF_LENGTH_TILES,
  CROSSING_MAX_LANE_SHIFT_TILES,
  CROSSING_MIN_APPROACH_TILES,
  CROSSING_STRAIGHTENING_STEP_TILES,
} from '../config/constants';
import type { Point } from '../skeleton/cellGrid';
import { lowerSideLaneOffsetTiles } from './roadCrossing';
import type { RoadCrossing, Side } from './roadCrossing';

const WINDOW_HALF_LENGTH_TILES = CROSSING_HALF_LENGTH_TILES + CROSSING_APPROACH_TILES;
const MAX_LANE_DISTANCE_TO_CROSSING_TILES =
  CROSSING_MAX_LANE_SHIFT_TILES + CROSSING_BOUNDARY_SEARCH_TILES + 1;

export const CROSSING_SPACING_TILES = 2 * WINDOW_HALF_LENGTH_TILES + 1;

function alongTravel(point: Point, crossing: RoadCrossing): number {
  return crossing.travelAxis === 'x' ? point.x : point.y;
}

function alongLane(point: Point, crossing: RoadCrossing): number {
  return crossing.travelAxis === 'x' ? point.y : point.x;
}

function pointAt(travel: number, lane: number, crossing: RoadCrossing): Point {
  return crossing.travelAxis === 'x' ? { x: travel, y: lane } : { x: lane, y: travel };
}

function weightAt(distanceFromBoundary: number, approachTiles: number): number {
  const fade = (distanceFromBoundary - CROSSING_HALF_LENGTH_TILES) / approachTiles;
  if (fade <= 0) return 1;
  return (1 + Math.cos(Math.min(1, fade) * Math.PI)) / 2;
}

function laneBetween(from: Point, to: Point, t: number, crossing: RoadCrossing): number {
  const fromLane = alongLane(from, crossing);
  return fromLane + (alongLane(to, crossing) - fromLane) * t;
}

function indexOfSegmentThroughBoundary(polyline: readonly Point[], crossing: RoadCrossing): number {
  const laneCentre = crossing.lane + 0.5;
  let best = -1;
  let bestLaneDistance = MAX_LANE_DISTANCE_TO_CROSSING_TILES;
  for (let index = 0; index + 1 < polyline.length; index++) {
    const from = alongTravel(polyline[index], crossing) - crossing.boundary;
    const to = alongTravel(polyline[index + 1], crossing) - crossing.boundary;
    if (from === to || from * to > 0) continue;
    const lane = laneBetween(polyline[index], polyline[index + 1], from / (from - to), crossing);
    const laneDistance = Math.abs(lane - laneCentre);
    if (laneDistance <= bestLaneDistance) {
      best = index;
      bestLaneDistance = laneDistance;
    }
  }
  return best;
}

interface CrossingInRun {
  readonly progress: number;
  readonly laneBefore: number;
  readonly laneAfter: number;
  readonly approachBefore: number;
  readonly approachAfter: number;
}

interface Sample {
  readonly progress: number;
  readonly isAfterBoundary: boolean;
}

function laneOnSide(crossing: RoadCrossing, side: Side): number {
  const upperLane = crossing.lane + 0.5;
  return side === crossing.upperSide ? upperLane : upperLane + lowerSideLaneOffsetTiles(crossing);
}

function crossingInRun(
  crossing: RoadCrossing,
  anchor: RoadCrossing,
  direction: number,
  curveStartProgress: number,
  curveEndProgress: number,
): CrossingInRun | null {
  const sideBeforeBoundary: Side = direction === 1 ? -1 : 1;
  const progress = direction * (crossing.boundary - anchor.boundary);
  const approachBefore = Math.min(
    CROSSING_APPROACH_TILES,
    progress - CROSSING_HALF_LENGTH_TILES - curveStartProgress,
  );
  const approachAfter = Math.min(
    CROSSING_APPROACH_TILES,
    curveEndProgress - progress - CROSSING_HALF_LENGTH_TILES,
  );
  if (approachBefore < CROSSING_MIN_APPROACH_TILES || approachAfter < CROSSING_MIN_APPROACH_TILES) {
    return null;
  }
  return {
    progress,
    laneBefore: laneOnSide(crossing, sideBeforeBoundary),
    laneAfter: laneOnSide(crossing, direction === 1 ? 1 : -1),
    approachBefore,
    approachAfter,
  };
}

function targetLane(crossing: CrossingInRun, sample: Sample): number {
  if (sample.progress === crossing.progress) {
    return sample.isAfterBoundary ? crossing.laneAfter : crossing.laneBefore;
  }
  return sample.progress < crossing.progress ? crossing.laneBefore : crossing.laneAfter;
}

function blendedLane(sample: Sample, rawLane: number, crossings: readonly CrossingInRun[]): number {
  let untouched = 1;
  let sharpenedSum = 0;
  let sharpenedLaneSum = 0;
  for (const crossing of crossings) {
    const approach = sample.progress < crossing.progress ? crossing.approachBefore : crossing.approachAfter;
    const weight = weightAt(Math.abs(sample.progress - crossing.progress), approach);
    const lane = targetLane(crossing, sample);
    if (weight === 1) return lane;
    untouched *= 1 - weight;
    const sharpened = weight / (1 - weight);
    sharpenedSum += sharpened;
    sharpenedLaneSum += sharpened * lane;
  }
  if (sharpenedSum === 0) return rawLane;
  return rawLane * untouched + (sharpenedLaneSum / sharpenedSum) * (1 - untouched);
}

function samplesOf(crossings: readonly CrossingInRun[]): Sample[] {
  const firstCrossing = crossings[0];
  const lastCrossing = crossings[crossings.length - 1];
  const first = firstCrossing.progress - CROSSING_HALF_LENGTH_TILES - firstCrossing.approachBefore;
  const last = lastCrossing.progress + CROSSING_HALF_LENGTH_TILES + lastCrossing.approachAfter;
  const samples = new Map<string, Sample>();
  const add = (progress: number, isAfterBoundary: boolean): void => {
    samples.set(`${progress}:${isAfterBoundary}`, { progress, isAfterBoundary });
  };
  add(last, false);
  for (let progress = first; progress < last; progress += CROSSING_STRAIGHTENING_STEP_TILES) {
    add(progress, false);
  }
  for (const crossing of crossings) {
    add(crossing.progress - CROSSING_HALF_LENGTH_TILES, false);
    add(crossing.progress + CROSSING_HALF_LENGTH_TILES, false);
    add(crossing.progress, false);
    if (crossing.laneBefore !== crossing.laneAfter) add(crossing.progress, true);
  }
  return [...samples.values()].sort(
    (a, b) => a.progress - b.progress || Number(a.isAfterBoundary) - Number(b.isAfterBoundary),
  );
}

export function straightenThrough(
  polyline: readonly Point[],
  run: readonly RoadCrossing[],
): readonly Point[] | null {
  const anchor = run[0];
  const throughIndex = indexOfSegmentThroughBoundary(polyline, anchor);
  if (throughIndex < 0) return null;

  const direction = Math.sign(
    alongTravel(polyline[throughIndex + 1], anchor) - alongTravel(polyline[throughIndex], anchor),
  );
  const progressOf = (index: number): number =>
    direction * (alongTravel(polyline[index], anchor) - anchor.boundary);
  const curveStartProgress = progressOf(0);
  const curveEndProgress = progressOf(polyline.length - 1);
  const crossings: CrossingInRun[] = [];
  for (const crossing of run) {
    const inRun = crossingInRun(crossing, anchor, direction, curveStartProgress, curveEndProgress);
    if (inRun === null) return null;
    crossings.push(inRun);
  }
  for (let index = 1; index < crossings.length; index++) {
    if (crossings[index].progress <= crossings[index - 1].progress) return null;
  }
  const windowStart = Math.max(
    curveStartProgress,
    crossings[0].progress - CROSSING_HALF_LENGTH_TILES - crossings[0].approachBefore,
  );
  const lastCrossing = crossings[crossings.length - 1];
  const windowEnd = Math.min(
    curveEndProgress,
    lastCrossing.progress + CROSSING_HALF_LENGTH_TILES + lastCrossing.approachAfter,
  );

  let firstOutside = throughIndex;
  while (progressOf(firstOutside) >= windowStart) {
    if (firstOutside === 0) {
      firstOutside = -1;
      break;
    }
    if (progressOf(firstOutside - 1) >= progressOf(firstOutside)) return null;
    firstOutside--;
  }
  let lastOutside = throughIndex + 1;
  while (progressOf(lastOutside) <= windowEnd) {
    if (lastOutside === polyline.length - 1) {
      lastOutside = polyline.length;
      break;
    }
    if (progressOf(lastOutside + 1) <= progressOf(lastOutside)) return null;
    lastOutside++;
  }

  const rawLaneAtProgress = (progress: number): number => {
    let index = Math.max(firstOutside, 0);
    while (index < polyline.length - 2 && progressOf(index + 1) < progress) index++;
    const from = progressOf(index);
    const t = (progress - from) / (progressOf(index + 1) - from);
    return laneBetween(polyline[index], polyline[index + 1], t, anchor);
  };

  const straightened: Point[] = polyline.slice(0, firstOutside + 1);
  for (const sample of samplesOf(crossings)) {
    const lane = blendedLane(sample, rawLaneAtProgress(sample.progress), crossings);
    straightened.push(pointAt(anchor.boundary + direction * sample.progress, lane, anchor));
  }
  straightened.push(...polyline.slice(lastOutside));
  return straightened;
}
