import {
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_GATE_LANDING_AREA_VOTE_WEIGHT,
  TOWN_GATE_LANDING_DEPTH_TILES,
  TOWN_GATE_LANDING_SAMPLE_DEPTH_TILES,
  TOWN_GATE_LANDING_TILES_BEFORE_LANE,
  TOWN_GATE_LANDING_WIDTH_TILES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import { edgeExists } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { GATE_SIDES, gateDirection, townGate } from './townGates';
import type { GateSide } from './townGates';
import type { Town } from './townPlacement';

export interface Rectangle {
  readonly side: GateSide;
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function rectangleBeyond(side: GateSide, gate: Point): Rectangle {
  const [outwardX, outwardY] = gateDirection(side);
  const gateX = Math.floor(gate.x);
  const gateY = Math.floor(gate.y);
  const lateralMinX = gateX - TOWN_GATE_LANDING_TILES_BEFORE_LANE;
  const lateralMaxX = lateralMinX + TOWN_GATE_LANDING_WIDTH_TILES - 1;
  const lateralMinY = gateY - TOWN_GATE_LANDING_TILES_BEFORE_LANE;
  const lateralMaxY = lateralMinY + TOWN_GATE_LANDING_WIDTH_TILES - 1;
  if (outwardX !== 0) {
    const nearX = gateX + outwardX;
    const farX = gateX + outwardX * TOWN_GATE_LANDING_DEPTH_TILES;
    return {
      side,
      minX: Math.min(nearX, farX),
      maxX: Math.max(nearX, farX),
      minY: lateralMinY,
      maxY: lateralMaxY,
    };
  }
  const nearY = gateY + outwardY;
  const farY = gateY + outwardY * TOWN_GATE_LANDING_DEPTH_TILES;
  return {
    side,
    minX: lateralMinX,
    maxX: lateralMaxX,
    minY: Math.min(nearY, farY),
    maxY: Math.max(nearY, farY),
  };
}

export interface Landing extends Rectangle {
  readonly level: number;
}

const landingCache = new Map<string, readonly Landing[]>();

function landingLevelOf(town: Town, landing: Rectangle): number {
  const [outwardX, outwardY] = gateDirection(landing.side);
  const lowestLevel = Math.max(town.plateauLevel - 1, WATER_LEVEL + 1);
  const highestLevel = town.plateauLevel + 1;
  const votes = new Map<number, number>();
  const vote = (x: number, y: number, weight: number): void => {
    const level = heightLevelAt(x, y, elevationNoise(x, y));
    const limited =
      level === WATER_LEVEL ? lowestLevel : Math.min(highestLevel, Math.max(lowestLevel, level));
    votes.set(limited, (votes.get(limited) ?? 0) + weight);
  };
  for (let y = landing.minY; y <= landing.maxY; y++) {
    for (let x = landing.minX; x <= landing.maxX; x++) vote(x, y, TOWN_GATE_LANDING_AREA_VOTE_WEIGHT);
  }
  for (let lateral = 0; lateral < TOWN_GATE_LANDING_WIDTH_TILES; lateral++) {
    for (let depth = 1; depth <= TOWN_GATE_LANDING_SAMPLE_DEPTH_TILES; depth++) {
      const x =
        outwardX !== 0
          ? (outwardX > 0 ? landing.maxX : landing.minX) + outwardX * depth
          : landing.minX + lateral;
      const y =
        outwardY !== 0
          ? (outwardY > 0 ? landing.maxY : landing.minY) + outwardY * depth
          : landing.minY + lateral;
      vote(x, y, TOWN_GATE_LANDING_SAMPLE_DEPTH_TILES + 1 - depth);
    }
  }
  let best = lowestLevel;
  let bestVotes = -1;
  for (const level of [lowestLevel, town.plateauLevel, highestLevel]) {
    const count = votes.get(level) ?? 0;
    if (count > bestVotes) {
      best = level;
      bestVotes = count;
    }
  }
  return best;
}

function landingAt(town: Town, side: GateSide): Landing {
  const rectangle = rectangleBeyond(side, townGate(town, side));
  return { ...rectangle, level: landingLevelOf(town, rectangle) };
}

export function landingsOf(town: Town): readonly Landing[] {
  return remember(landingCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () =>
    GATE_SIDES.filter((side) => hasGate(town, side)).map((side) => landingAt(town, side)),
  );
}

export function hasGate(town: Town, side: GateSide): boolean {
  const [stepX, stepY] = gateDirection(side);
  return edgeExists(town.cx, town.cy, town.cx + stepX, town.cy + stepY);
}

export interface LevelSource {
  readonly distance: number;
  readonly level: number;
}

function distanceToRectangle(pad: Rectangle, x: number, y: number): number {
  const dx = Math.max(pad.minX - x, 0, x - (pad.maxX + 1));
  const dy = Math.max(pad.minY - y, 0, y - (pad.maxY + 1));
  return Math.hypot(dx, dy);
}

export function levelSourcesAt(town: Town, x: number, y: number): LevelSource[] {
  return [
    ...landingsOf(town).map((landing) => ({
      distance: distanceToRectangle(landing, x, y),
      level: landing.level,
    })),
  ];
}

export function distanceToLandings(town: Town, x: number, y: number): number {
  let nearest = Infinity;
  for (const landing of landingsOf(town)) {
    nearest = Math.min(nearest, distanceToRectangle(landing, x, y));
  }
  return nearest;
}
