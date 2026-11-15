const DEEP_WATER_COLOR = '#1f4e79';
const SHALLOW_WATER_COLOR = '#2f6fa7';
const BEACH_COLOR = '#d9c88f';
const LOWLAND_COLOR = '#4c7a3d';
const HILLS_COLOR = '#6b6459';
const MOUNTAIN_COLOR = '#f2f2f2';

const ELEVATION_COLOR_STOPS: ReadonlyArray<{ readonly upTo: number; readonly color: string }> = [
  { upTo: 0.13, color: DEEP_WATER_COLOR },
  { upTo: 0.22, color: SHALLOW_WATER_COLOR },
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
