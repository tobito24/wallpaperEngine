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

export type CliffType =
  | 'northEdge'
  | 'eastEdge'
  | 'southEdge'
  | 'westEdge'
  | 'northWestOuter'
  | 'northEastOuter'
  | 'southEastOuter'
  | 'southWestOuter'
  | 'northWestInner'
  | 'northEastInner'
  | 'southEastInner'
  | 'southWestInner';

export interface NeighbourLevels {
  readonly north: number;
  readonly northEast: number;
  readonly east: number;
  readonly southEast: number;
  readonly south: number;
  readonly southWest: number;
  readonly west: number;
  readonly northWest: number;
}

export function cliffTypeOf(level: number, neighbours: NeighbourLevels): CliffType | null {
  if (level <= WATER_LEVEL) return null;

  const n = neighbours.north > level;
  const e = neighbours.east > level;
  const s = neighbours.south > level;
  const w = neighbours.west > level;
  const nw = neighbours.northWest > level;
  const ne = neighbours.northEast > level;
  const se = neighbours.southEast > level;
  const sw = neighbours.southWest > level;

  if (!n && e && s && !w) return 'northWestInner';
  if (!n && !e && s && w) return 'northEastInner';
  if (n && e && !s && !w) return 'southWestInner';
  if (n && !e && !s && w) return 'southEastInner';

  if (n) return 'southEdge';
  if (s) return 'northEdge';
  if (e) return 'westEdge';
  if (w) return 'eastEdge';

  if (nw) return 'southEastOuter';
  if (ne) return 'southWestOuter';
  if (se) return 'northWestOuter';
  if (sw) return 'northEastOuter';

  return null;
}
