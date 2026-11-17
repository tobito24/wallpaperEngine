import {
  CROSSING_HALF_LENGTH_TILES,
  ROAD_CORNER_RADIUS_TILES,
  ROAD_WAVE_AMPLITUDE_TILES,
  ROAD_WAVE_LENGTH_TILES,
  ROAD_WAVE_MARGIN_TILES,
  ROAD_WAVE_MIN_LENGTH_TILES,
  ROAD_WAVE_SAMPLE_STEP_TILES,
} from '../config/constants';
import type { Point } from '../skeleton/cellGrid';
import type { RoadCrossing } from './roadCrossing';

export interface GroundProbe {
  levelAt(tileX: number, tileY: number): number;
  isTown(tileX: number, tileY: number): boolean;
}

const MIN_CORNER_RADIUS_TILES = 0.5;
const CORNER_SAMPLES = 6;
const WAVE_CORRIDOR_HALF_WIDTH_TILES = 2;
const WAVE_AMPLITUDES: readonly number[] = [ROAD_WAVE_AMPLITUDE_TILES, ROAD_WAVE_AMPLITUDE_TILES / 2];

interface Segment {
  readonly horizontal: boolean;
  readonly from: number;
  readonly to: number;
  readonly lateral: number;
}

function segmentOf(start: Point, end: Point): Segment {
  const horizontal = start.y === end.y;
  return horizontal
    ? { horizontal, from: start.x, to: end.x, lateral: start.y }
    : { horizontal, from: start.y, to: end.y, lateral: start.x };
}

function crossingsOnSegment(segment: Segment, crossings: readonly RoadCrossing[]): RoadCrossing[] {
  const low = Math.min(segment.from, segment.to);
  const high = Math.max(segment.from, segment.to);
  return crossings.filter(
    (crossing) =>
      crossing.travelAxis === (segment.horizontal ? 'x' : 'y') &&
      crossing.boundary >= low &&
      crossing.boundary <= high &&
      Math.abs(crossing.lane + 0.5 - segment.lateral) <= 1.5,
  );
}

function isStepPoint(point: Point, crossings: readonly RoadCrossing[]): boolean {
  return crossings.some(
    (crossing) =>
      crossing.travelAxis === 'x' &&
      point.x === crossing.boundary &&
      (point.y === crossing.lane + 0.5 || point.y === crossing.lane + 1.5),
  );
}

function cornerRadii(points: readonly Point[], crossings: readonly RoadCrossing[]): number[] {
  const radii = points.map(() => 0);
  for (let index = 1; index + 1 < points.length; index++) {
    if (isStepPoint(points[index], crossings)) continue;
    let radius = ROAD_CORNER_RADIUS_TILES;
    for (const neighbour of [points[index - 1], points[index + 1]]) {
      const segment = segmentOf(points[index], neighbour);
      radius = Math.min(radius, Math.abs(segment.to - segment.from) / 2);
      const corner = segment.from;
      for (const crossing of crossingsOnSegment(segment, crossings)) {
        radius = Math.min(radius, Math.abs(corner - crossing.boundary) - CROSSING_HALF_LENGTH_TILES);
      }
    }
    radii[index] = radius >= MIN_CORNER_RADIUS_TILES ? radius : 0;
  }
  return radii;
}

function roundedCorner(before: Point, corner: Point, after: Point, radius: number): Point[] {
  if (radius === 0) return [corner];
  const lengthIn = Math.hypot(corner.x - before.x, corner.y - before.y);
  const lengthOut = Math.hypot(after.x - corner.x, after.y - corner.y);
  const entry = {
    x: corner.x - ((corner.x - before.x) / lengthIn) * radius,
    y: corner.y - ((corner.y - before.y) / lengthIn) * radius,
  };
  const exit = {
    x: corner.x + ((after.x - corner.x) / lengthOut) * radius,
    y: corner.y + ((after.y - corner.y) / lengthOut) * radius,
  };
  const points: Point[] = [];
  for (let sample = 0; sample <= CORNER_SAMPLES; sample++) {
    const t = sample / CORNER_SAMPLES;
    const weights = [(1 - t) * (1 - t), 2 * (1 - t) * t, t * t];
    points.push({
      x: weights[0] * entry.x + weights[1] * corner.x + weights[2] * exit.x,
      y: weights[0] * entry.y + weights[1] * corner.y + weights[2] * exit.y,
    });
  }
  return points;
}

function pointAt(segment: Segment, along: number, offset: number): Point {
  return segment.horizontal
    ? { x: along, y: segment.lateral + offset }
    : { x: segment.lateral + offset, y: along };
}

function tileAt(segment: Segment, along: number, offset: number): [number, number] {
  const point = pointAt(segment, along, offset);
  return [Math.floor(point.x), Math.floor(point.y)];
}

function offsetAt(along: number, start: number, end: number, amplitude: number, sign: number): number {
  const progress = (along - start) / (end - start);
  const window = Math.sin(Math.PI * progress) ** 2;
  return sign * amplitude * window * Math.sin((2 * Math.PI * (along - start)) / ROAD_WAVE_LENGTH_TILES);
}

function isCorridorClear(
  segment: Segment,
  start: number,
  end: number,
  amplitude: number,
  sign: number,
  ground: GroundProbe,
  level: number,
): boolean {
  for (let along = start; along <= end; along += 1) {
    const centre = offsetAt(along, start, end, amplitude, sign);
    for (let side = -WAVE_CORRIDOR_HALF_WIDTH_TILES; side <= WAVE_CORRIDOR_HALF_WIDTH_TILES; side++) {
      const [x, y] = tileAt(segment, along, centre + side);
      if (ground.levelAt(x, y) !== level || ground.isTown(x, y)) return false;
    }
  }
  return true;
}

function freeIntervals(
  low: number,
  high: number,
  crossings: readonly RoadCrossing[],
): readonly (readonly [number, number])[] {
  let intervals: [number, number][] = [[low, high]];
  for (const crossing of [...crossings].sort((a, b) => a.boundary - b.boundary)) {
    const next: [number, number][] = [];
    for (const [first, last] of intervals) {
      const cutFrom = crossing.boundary - ROAD_WAVE_MARGIN_TILES;
      const cutTo = crossing.boundary + ROAD_WAVE_MARGIN_TILES;
      if (cutTo <= first || cutFrom >= last) next.push([first, last]);
      else {
        if (cutFrom > first) next.push([first, cutFrom]);
        if (cutTo < last) next.push([cutTo, last]);
      }
    }
    intervals = next;
  }
  return intervals.filter(([first, last]) => last - first >= ROAD_WAVE_MIN_LENGTH_TILES);
}

function waveSign(segment: Segment, start: number): number {
  const hash = Math.imul(Math.floor(start), 73856093) ^ Math.imul(Math.floor(segment.lateral), 19349663);
  return ((hash >>> 7) & 1) === 0 ? 1 : -1;
}

function wavePoints(
  segment: Segment,
  from: number,
  to: number,
  crossings: readonly RoadCrossing[],
  ground: GroundProbe,
): Point[] {
  const direction = Math.sign(segment.to - segment.from);
  const low = Math.min(from, to) + ROAD_WAVE_MARGIN_TILES;
  const high = Math.max(from, to) - ROAD_WAVE_MARGIN_TILES;
  if (high - low < ROAD_WAVE_MIN_LENGTH_TILES) return [];
  const runs: Point[][] = [];
  for (const [start, end] of freeIntervals(low, high, crossings)) {
    const [centreX, centreY] = tileAt(segment, (start + end) / 2, 0);
    const level = ground.levelAt(centreX, centreY);
    if (level <= 0 || ground.isTown(centreX, centreY)) continue;
    const sign = waveSign(segment, start);
    const amplitude = WAVE_AMPLITUDES.find((candidate) =>
      isCorridorClear(segment, start, end, candidate, sign, ground, level),
    );
    if (amplitude === undefined) continue;
    const run: Point[] = [];
    for (let along = start; along < end; along += ROAD_WAVE_SAMPLE_STEP_TILES) {
      run.push(pointAt(segment, along, offsetAt(along, start, end, amplitude, sign)));
    }
    run.push(pointAt(segment, end, 0));
    runs.push(run);
  }
  if (direction < 0) {
    runs.reverse();
    for (const run of runs) run.reverse();
  }
  return runs.flat();
}

export function smoothPolyline(
  points: readonly Point[],
  crossings: readonly RoadCrossing[],
  ground: GroundProbe,
): Point[] {
  if (points.length < 2) return [...points];
  const radii = cornerRadii(points, crossings);
  const smoothed: Point[] = [points[0]];
  for (let index = 0; index + 1 < points.length; index++) {
    const segment = segmentOf(points[index], points[index + 1]);
    const direction = Math.sign(segment.to - segment.from);
    const from = segment.from + direction * radii[index];
    const to = segment.to - direction * radii[index + 1];
    if (direction !== 0 && (to - from) * direction > 0) {
      smoothed.push(...wavePoints(segment, from, to, crossingsOnSegment(segment, crossings), ground));
    }
    const next = index + 1;
    smoothed.push(
      ...(next + 1 < points.length
        ? roundedCorner(points[next - 1], points[next], points[next + 1], radii[next])
        : [points[next]]),
    );
  }
  return smoothed;
}
