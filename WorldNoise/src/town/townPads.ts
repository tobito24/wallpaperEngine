import {
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_GATE_LANDING_DEPTH_TILES,
  TOWN_GATE_LANDING_SAMPLE_DEPTH_TILES,
  TOWN_GATE_PAD_DEPTH_TILES,
  TOWN_GATE_PAD_TILES_BEFORE_LANE,
  TOWN_GATE_PAD_WIDTH_TILES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
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

export interface Landing extends Pad {
  readonly level: number;
}

const landingCache = new Map<string, readonly Landing[]>();

function landingLevelOf(town: Town, landing: Pad): number {
  const [outwardX, outwardY] = gateDirection(landing.side);
  const counts = new Map<number, number>();
  for (let lateral = 0; lateral < TOWN_GATE_PAD_WIDTH_TILES; lateral++) {
    for (let depth = 1; depth <= TOWN_GATE_LANDING_SAMPLE_DEPTH_TILES; depth++) {
      const x =
        outwardX !== 0
          ? (outwardX > 0 ? landing.maxX : landing.minX) + outwardX * depth
          : landing.minX + lateral;
      const y =
        outwardY !== 0
          ? (outwardY > 0 ? landing.maxY : landing.minY) + outwardY * depth
          : landing.minY + lateral;
      const level = heightLevelAt(x, y, elevationNoise(x, y));
      if (level === WATER_LEVEL) continue;
      const limited = Math.min(town.plateauLevel + 1, Math.max(town.plateauLevel - 1, level));
      counts.set(limited, (counts.get(limited) ?? 0) + 1);
    }
  }
  let best = town.plateauLevel;
  let bestCount = 0;
  for (const [level, count] of counts) {
    if (
      count > bestCount ||
      (count === bestCount && Math.abs(level - town.plateauLevel) < Math.abs(best - town.plateauLevel))
    ) {
      best = level;
      bestCount = count;
    }
  }
  return best;
}

function landingAt(town: Town, pad: Pad): Landing {
  const [outwardX, outwardY] = gateDirection(pad.side);
  const rectangle: Pad =
    outwardX !== 0
      ? {
          side: pad.side,
          minX: outwardX > 0 ? pad.maxX + 1 : pad.minX - TOWN_GATE_LANDING_DEPTH_TILES,
          maxX: outwardX > 0 ? pad.maxX + TOWN_GATE_LANDING_DEPTH_TILES : pad.minX - 1,
          minY: pad.minY,
          maxY: pad.maxY,
        }
      : {
          side: pad.side,
          minX: pad.minX,
          maxX: pad.maxX,
          minY: outwardY > 0 ? pad.maxY + 1 : pad.minY - TOWN_GATE_LANDING_DEPTH_TILES,
          maxY: outwardY > 0 ? pad.maxY + TOWN_GATE_LANDING_DEPTH_TILES : pad.minY - 1,
        };
  return { ...rectangle, level: landingLevelOf(town, rectangle) };
}

export function landingsOf(town: Town): readonly Landing[] {
  return remember(landingCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () =>
    padsOf(town).map((pad) => landingAt(town, pad)),
  );
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

export interface LevelSource {
  readonly distance: number;
  readonly level: number;
}

function distanceToRectangle(pad: Pad, x: number, y: number): number {
  const dx = Math.max(pad.minX - x, 0, x - (pad.maxX + 1));
  const dy = Math.max(pad.minY - y, 0, y - (pad.maxY + 1));
  return Math.hypot(dx, dy);
}

export function levelSourcesAt(town: Town, x: number, y: number): LevelSource[] {
  return [
    ...padsOf(town).map((pad) => ({ distance: distanceToRectangle(pad, x, y), level: town.plateauLevel })),
    ...landingsOf(town).map((landing) => ({
      distance: distanceToRectangle(landing, x, y),
      level: landing.level,
    })),
  ];
}

export function distanceToPads(town: Town, x: number, y: number): number {
  let nearest = Infinity;
  for (const pad of [...padsOf(town), ...landingsOf(town)]) {
    nearest = Math.min(nearest, distanceToRectangle(pad, x, y));
  }
  return nearest;
}
