import { SKELETON_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { randomValue } from '../core/keyedRandom';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import { nodeAreaOf } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';

const CANDIDATE_COUNT = 48;
const CLEARANCE_SEARCH_RADIUS_TILES = 8;

const waypointCache = new Map<string, Point>();

function baseLevelAt(tileX: number, tileY: number): number {
  return heightLevelAt(tileX, tileY, elevationNoise(tileX, tileY));
}

function clearanceAt(tileX: number, tileY: number): number {
  const level = baseLevelAt(tileX, tileY);
  if (level === WATER_LEVEL) return 0;
  for (let radius = 1; radius <= CLEARANCE_SEARCH_RADIUS_TILES; radius++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const isEdgeRow = Math.abs(dy) === radius;
      const step = isEdgeRow ? 1 : 2 * radius;
      for (let dx = -radius; dx <= radius; dx += step) {
        if (baseLevelAt(tileX + dx, tileY + dy) !== level) return radius;
      }
    }
  }
  return CLEARANCE_SEARCH_RADIUS_TILES + 1;
}

export function waypointPosition(cx: number, cy: number): Point {
  return remember(waypointCache, SKELETON_CACHE_MAX_ENTRIES, `${cx},${cy}`, () => {
    const area = nodeAreaOf(cx, cy);
    let best: Point = { x: area.minX + 0.5, y: area.minY + 0.5 };
    let bestClearance = -1;
    for (let candidate = 0; candidate < CANDIDATE_COUNT; candidate++) {
      const tileX = area.minX + Math.floor(randomValue(`node:${cx}:${cy}:${candidate}:x`) * area.size);
      const tileY = area.minY + Math.floor(randomValue(`node:${cx}:${cy}:${candidate}:y`) * area.size);
      const clearance = clearanceAt(tileX, tileY);
      if (clearance > bestClearance) {
        bestClearance = clearance;
        best = { x: tileX + 0.5, y: tileY + 0.5 };
      }
    }
    return best;
  });
}
