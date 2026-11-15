const ELEVATION_COLOR_STOPS: ReadonlyArray<{ readonly upTo: number; readonly color: string }> = [
  { upTo: 0.13, color: '#1f4e79' }, // deep water
  { upTo: 0.22, color: '#2f6fa7' }, // shallow water
  { upTo: 0.27, color: '#d9c88f' }, // beach
  { upTo: 0.72, color: '#4c7a3d' }, // lowland
  { upTo: 0.87, color: '#6b6459' }, // hills
  { upTo: Infinity, color: '#f2f2f2' }, // mountain / snow
];

export function colorForElevation(elevation: number): string {
  for (const stop of ELEVATION_COLOR_STOPS) {
    if (elevation <= stop.upTo) return stop.color;
  }
  return ELEVATION_COLOR_STOPS[ELEVATION_COLOR_STOPS.length - 1].color;
}
