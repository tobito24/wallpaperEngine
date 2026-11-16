import {
  CROSSING_APPROACH_TILES,
  CROSSING_BOUNDARY_SEARCH_TILES,
  CROSSING_HALF_LENGTH_TILES,
  CROSSING_MAX_LANE_SHIFT_TILES,
  CROSSING_STRAIGHTENING_STEP_TILES,
} from '../config/constants';
import type { Point } from '../skeleton/cellGrid';
import type { RoadCrossing } from './roadCrossing';

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

function weightAt(distanceFromBoundary: number): number {
  const fade = (distanceFromBoundary - CROSSING_HALF_LENGTH_TILES) / CROSSING_APPROACH_TILES;
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

function blendedLane(
  progress: number,
  rawLane: number,
  crossingProgresses: readonly number[],
  crossingLanes: readonly number[],
): number {
  let untouched = 1;
  let sharpenedSum = 0;
  let sharpenedLaneSum = 0;
  for (let index = 0; index < crossingProgresses.length; index++) {
    const weight = weightAt(Math.abs(progress - crossingProgresses[index]));
    if (weight === 1) return crossingLanes[index];
    untouched *= 1 - weight;
    const sharpened = weight / (1 - weight);
    sharpenedSum += sharpened;
    sharpenedLaneSum += sharpened * crossingLanes[index];
  }
  if (sharpenedSum === 0) return rawLane;
  return rawLane * untouched + (sharpenedLaneSum / sharpenedSum) * (1 - untouched);
}

function sampleProgresses(crossingProgresses: readonly number[]): number[] {
  const first = crossingProgresses[0] - WINDOW_HALF_LENGTH_TILES;
  const last = crossingProgresses[crossingProgresses.length - 1] + WINDOW_HALF_LENGTH_TILES;
  const samples = new Set<number>([last]);
  for (let progress = first; progress < last; progress += CROSSING_STRAIGHTENING_STEP_TILES) {
    samples.add(progress);
  }
  for (const crossingProgress of crossingProgresses) {
    samples.add(crossingProgress - CROSSING_HALF_LENGTH_TILES);
    samples.add(crossingProgress + CROSSING_HALF_LENGTH_TILES);
  }
  return [...samples].sort((a, b) => a - b);
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
  const crossingProgresses = run.map((crossing) => direction * (crossing.boundary - anchor.boundary));
  const crossingLanes = run.map((crossing) => crossing.lane + 0.5);
  for (let index = 1; index < crossingProgresses.length; index++) {
    if (crossingProgresses[index] <= crossingProgresses[index - 1]) return null;
  }
  const windowStart = crossingProgresses[0] - WINDOW_HALF_LENGTH_TILES;
  const windowEnd = crossingProgresses[crossingProgresses.length - 1] + WINDOW_HALF_LENGTH_TILES;

  let firstOutside = throughIndex;
  while (progressOf(firstOutside) >= windowStart) {
    if (firstOutside === 0 || progressOf(firstOutside - 1) >= progressOf(firstOutside)) return null;
    firstOutside--;
  }
  let lastOutside = throughIndex + 1;
  while (progressOf(lastOutside) <= windowEnd) {
    if (lastOutside === polyline.length - 1 || progressOf(lastOutside + 1) <= progressOf(lastOutside))
      return null;
    lastOutside++;
  }

  const rawLaneAtProgress = (progress: number): number => {
    let index = firstOutside;
    while (progressOf(index + 1) < progress) index++;
    const from = progressOf(index);
    const t = (progress - from) / (progressOf(index + 1) - from);
    return laneBetween(polyline[index], polyline[index + 1], t, anchor);
  };

  const straightened: Point[] = polyline.slice(0, firstOutside + 1);
  for (const progress of sampleProgresses(crossingProgresses)) {
    const lane = blendedLane(progress, rawLaneAtProgress(progress), crossingProgresses, crossingLanes);
    straightened.push(pointAt(anchor.boundary + direction * progress, lane, anchor));
  }
  straightened.push(...polyline.slice(lastOutside));
  return straightened;
}
