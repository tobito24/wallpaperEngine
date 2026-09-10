export type BiomeId =
  | 'ocean' // reserved: not produced in Phase 1, Phase 2 (rivers/lakes) will start emitting it
  | 'beach'
  | 'grassland'
  | 'dryGrassland'
  | 'forest'
  | 'denseForest'
  | 'badlands'
  | 'mountainRock'
  | 'snowPeak';

type ElevationBand = 'lowland' | 'hills' | 'mountain' | 'peak';
type MoistureBand = 'arid' | 'normal' | 'humid';

const ELEVATION_BANDS: { max: number; id: ElevationBand }[] = [
  { max: 0.3, id: 'lowland' },
  { max: 0.6, id: 'hills' },
  { max: 0.85, id: 'mountain' },
  { max: 1.01, id: 'peak' },
];

const MOISTURE_BANDS: { max: number; id: MoistureBand }[] = [
  { max: 0.33, id: 'arid' },
  { max: 0.66, id: 'normal' },
  { max: 1.01, id: 'humid' },
];

/** Elevation at/below this is beach, regardless of moisture — placeholder until Phase 2 introduces a real sea level. */
const BEACH_ELEVATION_MAX = 0.06;

function bandFor<T extends string>(value: number, bands: { max: number; id: T }[]): T {
  for (const band of bands) {
    if (value <= band.max) return band.id;
  }
  return bands[bands.length - 1]!.id;
}

/** (elevation, moisture) -> biome. Temperature is sampled and stored per-tile but not yet part of this
 * lookup — adding it later is a change to this function only, not to how climate is sampled. */
export function resolveBiome(elevation: number, moisture: number): BiomeId {
  if (elevation <= BEACH_ELEVATION_MAX) return 'beach';

  const elevationBand = bandFor(elevation, ELEVATION_BANDS);
  const moistureBand = bandFor(moisture, MOISTURE_BANDS);

  if (elevationBand === 'peak') return 'snowPeak';
  if (elevationBand === 'mountain') return 'mountainRock';

  if (elevationBand === 'hills') {
    if (moistureBand === 'arid') return 'badlands';
    if (moistureBand === 'humid') return 'denseForest';
    return 'forest';
  }

  // lowland
  if (moistureBand === 'arid') return 'dryGrassland';
  if (moistureBand === 'humid') return 'forest';
  return 'grassland';
}
