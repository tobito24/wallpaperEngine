import Alea from 'alea';
import {
  CELL_SIZE_CHUNKS,
  CHUNK_SIZE,
  ROAD_EDGE_PROBABILITY,
  ROAD_MIN_NODE_DEGREE,
  SEED,
} from '../config/constants';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const CELL_SIZE_TILES = CELL_SIZE_CHUNKS * CHUNK_SIZE;

const NODE_AREA_MARGIN_TILES = CHUNK_SIZE;
const NODE_AREA_SIZE_TILES = CELL_SIZE_TILES - 2 * NODE_AREA_MARGIN_TILES;
const MAX_CACHED_ENTRIES = 20000;
const NEIGHBOUR_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const waypointCache = new Map<string, Point>();
const edgeValueCache = new Map<string, number>();

export function randomValue(key: string): number {
  return Alea(`${SEED}:${key}`)();
}

function remember<T>(cache: Map<string, T>, key: string, compute: () => T): T {
  const known = cache.get(key);
  if (known !== undefined) return known;
  if (cache.size >= MAX_CACHED_ENTRIES) cache.clear();
  const value = compute();
  cache.set(key, value);
  return value;
}

export function cellIndexOf(tile: number): number {
  return Math.floor(tile / CELL_SIZE_TILES);
}

export function waypointPosition(cx: number, cy: number): Point {
  return remember(waypointCache, `${cx},${cy}`, () => ({
    x:
      cx * CELL_SIZE_TILES +
      NODE_AREA_MARGIN_TILES +
      randomValue(`node:${cx}:${cy}:x`) * NODE_AREA_SIZE_TILES,
    y:
      cy * CELL_SIZE_TILES +
      NODE_AREA_MARGIN_TILES +
      randomValue(`node:${cx}:${cy}:y`) * NODE_AREA_SIZE_TILES,
  }));
}

export function edgeKey(ax: number, ay: number, bx: number, by: number): string {
  const swap = ax > bx || (ax === bx && ay > by);
  return swap ? `${bx},${by}-${ax},${ay}` : `${ax},${ay}-${bx},${by}`;
}

function edgeValue(ax: number, ay: number, bx: number, by: number): number {
  const key = edgeKey(ax, ay, bx, by);
  return remember(edgeValueCache, key, () => randomValue(`edge:${key}`));
}

function edgeValuesOf(cx: number, cy: number): number[] {
  return NEIGHBOUR_STEPS.map(([dx, dy]) => edgeValue(cx, cy, cx + dx, cy + dy));
}

function asksFor(cx: number, cy: number, nx: number, ny: number): boolean {
  const values = edgeValuesOf(cx, cy);
  const baseDegree = values.filter((value) => value < ROAD_EDGE_PROBABILITY).length;
  if (baseDegree >= ROAD_MIN_NODE_DEGREE) return false;

  const own = edgeValue(cx, cy, nx, ny);
  const lowerCount = values.filter((value) => value < own).length;
  return lowerCount < ROAD_MIN_NODE_DEGREE;
}

export function edgeExists(ax: number, ay: number, bx: number, by: number): boolean {
  if (edgeValue(ax, ay, bx, by) < ROAD_EDGE_PROBABILITY) return true;
  return asksFor(ax, ay, bx, by) || asksFor(bx, by, ax, ay);
}

export function nodeDegree(cx: number, cy: number): number {
  return NEIGHBOUR_STEPS.filter(([dx, dy]) => edgeExists(cx, cy, cx + dx, cy + dy)).length;
}
