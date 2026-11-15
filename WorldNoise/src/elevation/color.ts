import { ELEVATION_SEA_LEVEL, HEIGHT_LEVEL_THRESHOLDS } from '../config/constants';

const DEEP_WATER_COLOR = '#1f4e79';
const SHALLOW_WATER_COLOR = '#2f6fa7';
const BEACH_COLOR = '#d9c88f';
const LOWLAND_COLOR = '#4c7a3d';
const HILLS_COLOR = '#6b6459';
const MOUNTAIN_COLOR = '#f2f2f2';

export const CLIFF_EDGE_COLOR = '#2b1d0e';

const SHADE_BY_HEIGHT_LEVEL: ReadonlyArray<string | null> = [
  null,
  'rgba(0, 0, 0, 0.18)',
  null,
  'rgba(255, 255, 255, 0.14)',
];

if (SHADE_BY_HEIGHT_LEVEL.length !== HEIGHT_LEVEL_THRESHOLDS.length + 2) {
  throw new RangeError('SHADE_BY_HEIGHT_LEVEL needs one entry for water and one per land level');
}

const ELEVATION_COLOR_STOPS: ReadonlyArray<{ readonly upTo: number; readonly color: string }> = [
  { upTo: 0.13, color: DEEP_WATER_COLOR },
  { upTo: ELEVATION_SEA_LEVEL, color: SHALLOW_WATER_COLOR },
  { upTo: 0.27, color: BEACH_COLOR },
  { upTo: 0.72, color: LOWLAND_COLOR },
  { upTo: 0.87, color: HILLS_COLOR },
  { upTo: Infinity, color: MOUNTAIN_COLOR },
];

export function colorForElevation(elevation: number): string {
  for (const stop of ELEVATION_COLOR_STOPS) {
    if (elevation <= stop.upTo) return stop.color;
  }
  return MOUNTAIN_COLOR;
}

export function shadeForHeightLevel(heightLevel: number): string | null {
  return SHADE_BY_HEIGHT_LEVEL[heightLevel] ?? null;
}
