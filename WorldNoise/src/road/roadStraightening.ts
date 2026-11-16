import {
  CROSSING_APPROACH_TILES,
  CROSSING_BOUNDARY_SEARCH_TILES,
  CROSSING_MAX_LANE_SHIFT_TILES,
  CROSSING_HALF_LENGTH_TILES,
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

function easedWeight(distanceFromBoundary: number): number {
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

export function straightenAt(polyline: readonly Point[], crossing: RoadCrossing): readonly Point[] | null {
  const throughIndex = indexOfSegmentThroughBoundary(polyline, crossing);
  if (throughIndex < 0) return null;

  const direction = Math.sign(
    alongTravel(polyline[throughIndex + 1], crossing) - alongTravel(polyline[throughIndex], crossing),
  );
  const progressOf = (index: number): number =>
    direction * (alongTravel(polyline[index], crossing) - crossing.boundary);

  let firstOutside = throughIndex;
  while (progressOf(firstOutside) >= -WINDOW_HALF_LENGTH_TILES) {
    if (firstOutside === 0 || progressOf(firstOutside - 1) >= progressOf(firstOutside)) return null;
    firstOutside--;
  }
  let lastOutside = throughIndex + 1;
  while (progressOf(lastOutside) <= WINDOW_HALF_LENGTH_TILES) {
    if (lastOutside === polyline.length - 1 || progressOf(lastOutside + 1) <= progressOf(lastOutside))
      return null;
    lastOutside++;
  }

  const laneAtProgress = (progress: number): number => {
    let index = firstOutside;
    while (progressOf(index + 1) < progress) index++;
    const from = progressOf(index);
    const t = (progress - from) / (progressOf(index + 1) - from);
    return laneBetween(polyline[index], polyline[index + 1], t, crossing);
  };

  const laneCentre = crossing.lane + 0.5;
  const straightened: Point[] = polyline.slice(0, firstOutside + 1);
  const stepCount = (2 * WINDOW_HALF_LENGTH_TILES) / CROSSING_STRAIGHTENING_STEP_TILES;
  for (let step = 0; step <= stepCount; step++) {
    const progress = -WINDOW_HALF_LENGTH_TILES + step * CROSSING_STRAIGHTENING_STEP_TILES;
    const weight = easedWeight(Math.abs(progress));
    const lane = laneAtProgress(progress) * (1 - weight) + laneCentre * weight;
    straightened.push(pointAt(crossing.boundary + direction * progress, lane, crossing));
  }
  straightened.push(...polyline.slice(lastOutside));
  return straightened;
}
