import {
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_GATE_PAD_DEPTH_TILES,
  TOWN_GATE_PAD_TILES_BEFORE_LANE,
  TOWN_GATE_PAD_WIDTH_TILES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { edgeExists } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { GATE_SIDES, gateDirection, townGate } from './townGates';
import type { GateSide } from './townGates';
import type { Town } from './townPlacement';

export interface Pad {
  readonly side: GateSide;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

const padCache = new Map<string, readonly Pad[]>();

function padAt(side: GateSide, gate: Point): Pad {
  const [outwardX, outwardY] = gateDirection(side);
  const gateX = Math.floor(gate.x);
  const gateY = Math.floor(gate.y);
  const lateralMinX = gateX - TOWN_GATE_PAD_TILES_BEFORE_LANE;
  const lateralMaxX = lateralMinX + TOWN_GATE_PAD_WIDTH_TILES - 1;
  const lateralMinY = gateY - TOWN_GATE_PAD_TILES_BEFORE_LANE;
  const lateralMaxY = lateralMinY + TOWN_GATE_PAD_WIDTH_TILES - 1;
  if (outwardX !== 0) {
    const nearX = gateX + outwardX;
    const farX = gateX + outwardX * TOWN_GATE_PAD_DEPTH_TILES;
    return {
      side,
      minX: Math.min(nearX, farX),
      maxX: Math.max(nearX, farX),
      minY: lateralMinY,
      maxY: lateralMaxY,
    };
  }
  const nearY = gateY + outwardY;
  const farY = gateY + outwardY * TOWN_GATE_PAD_DEPTH_TILES;
  return {
    side,
    minX: lateralMinX,
    maxX: lateralMaxX,
    minY: Math.min(nearY, farY),
    maxY: Math.max(nearY, farY),
  };
}

export function hasGate(town: Town, side: GateSide): boolean {
  const [stepX, stepY] = gateDirection(side);
  return edgeExists(town.cx, town.cy, town.cx + stepX, town.cy + stepY);
}

export function padsOf(town: Town): readonly Pad[] {
  return remember(padCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () =>
    GATE_SIDES.filter((side) => hasGate(town, side)).map((side) => padAt(side, townGate(town, side))),
  );
}

export function padEndPoint(gate: Point, side: GateSide): Point {
  const [outwardX, outwardY] = gateDirection(side);
  return {
    x: gate.x + outwardX * TOWN_GATE_PAD_DEPTH_TILES,
    y: gate.y + outwardY * TOWN_GATE_PAD_DEPTH_TILES,
  };
}

export function distanceToPads(town: Town, x: number, y: number): number {
  let nearest = Infinity;
  for (const pad of padsOf(town)) {
    const dx = Math.max(pad.minX - x, 0, x - (pad.maxX + 1));
    const dy = Math.max(pad.minY - y, 0, y - (pad.maxY + 1));
    nearest = Math.min(nearest, Math.hypot(dx, dy));
  }
  return nearest;
}
