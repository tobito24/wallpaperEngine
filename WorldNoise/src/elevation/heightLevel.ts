import {
  ELEVATION_BASE_FREQUENCY,
  ELEVATION_LACUNARITY,
  ELEVATION_PERSISTENCE,
  ELEVATION_SEA_LEVEL,
  HEIGHT_LEVEL_OCTAVES,
  HEIGHT_LEVEL_THRESHOLDS,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import { ELEVATION_SEED } from './elevationNoise';
import { redistributeElevation } from './redistribute';

export const WATER_LEVEL = 0;

export interface CliffEdges {
  readonly north: boolean;
  readonly east: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

const smoothedElevationNoise = createFractalNoise2D(
  ELEVATION_SEED,
  HEIGHT_LEVEL_OCTAVES,
  ELEVATION_BASE_FREQUENCY,
  ELEVATION_PERSISTENCE,
  ELEVATION_LACUNARITY,
);

export function heightLevelAt(worldX: number, worldY: number, elevation: number): number {
  if (elevation <= ELEVATION_SEA_LEVEL) return WATER_LEVEL;

  const smoothedElevation = redistributeElevation(smoothedElevationNoise(worldX, worldY));
  let level = WATER_LEVEL + 1;
  for (const threshold of HEIGHT_LEVEL_THRESHOLDS) {
    if (smoothedElevation > threshold) level++;
  }
  return level;
}

function dropsTo(level: number, neighbourLevel: number): boolean {
  return neighbourLevel > WATER_LEVEL && neighbourLevel < level;
}

export function cliffEdgesOf(
  level: number,
  northLevel: number,
  eastLevel: number,
  southLevel: number,
  westLevel: number,
): CliffEdges {
  return {
    north: dropsTo(level, northLevel),
    east: dropsTo(level, eastLevel),
    south: dropsTo(level, southLevel),
    west: dropsTo(level, westLevel),
  };
}
