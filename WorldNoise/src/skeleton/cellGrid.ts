import {
  CELL_BUFFER_CHUNKS,
  CELL_SIZE_CHUNKS,
  CHUNK_SIZE,
  ROAD_EDGE_PROBABILITY,
  ROAD_MIN_NODE_DEGREE,
  SKELETON_CACHE_MAX_ENTRIES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { randomValue } from '../core/keyedRandom';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const CELL_SIZE_TILES = CELL_SIZE_CHUNKS * CHUNK_SIZE;

const NODE_AREA_MARGIN_TILES = CELL_BUFFER_CHUNKS * CHUNK_SIZE;
const NODE_AREA_SIZE_TILES = CELL_SIZE_TILES - 2 * NODE_AREA_MARGIN_TILES;
const NEIGHBOUR_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const edgeValueCache = new Map<string, number>();

export function cellIndexOf(tile: number): number {
  return Math.floor(tile / CELL_SIZE_TILES);
}

export function nodeAreaOf(
  cx: number,
  cy: number,
): { readonly minX: number; readonly minY: number; readonly size: number } {
  return {
    minX: cx * CELL_SIZE_TILES + NODE_AREA_MARGIN_TILES,
    minY: cy * CELL_SIZE_TILES + NODE_AREA_MARGIN_TILES,
    size: NODE_AREA_SIZE_TILES,
  };
}

export function isEdgeOrdered(ax: number, ay: number, bx: number, by: number): boolean {
  return ax < bx || (ax === bx && ay <= by);
}

export function edgeKey(ax: number, ay: number, bx: number, by: number): string {
  return isEdgeOrdered(ax, ay, bx, by) ? `${ax},${ay}-${bx},${by}` : `${bx},${by}-${ax},${ay}`;
}

function edgeValue(ax: number, ay: number, bx: number, by: number): number {
  const key = edgeKey(ax, ay, bx, by);
  return remember(edgeValueCache, SKELETON_CACHE_MAX_ENTRIES, key, () => randomValue(`edge:${key}`));
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
