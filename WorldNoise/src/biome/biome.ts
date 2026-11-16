import {
  ELEVATION_BEACH_LEVEL,
  ELEVATION_DEEP_WATER_LEVEL,
  ELEVATION_ROCK_LEVEL,
  ELEVATION_SEA_LEVEL,
  MOISTURE_BAND_THRESHOLDS,
  TEMPERATURE_BAND_THRESHOLDS,
} from '../config/constants';
import { temperatureAtElevation } from '../temperature/temperatureAtElevation';

export type BiomeId =
  | 'deepWater'
  | 'shallowWater'
  | 'beach'
  | 'snowField'
  | 'tundra'
  | 'snowForest'
  | 'steppe'
  | 'meadow'
  | 'forest'
  | 'desert'
  | 'savanna'
  | 'jungle'
  | 'mountain'
  | 'snowPeak';

export interface Biome {
  readonly id: BiomeId;
}

function biome(id: BiomeId): Biome {
  return { id };
}

const DEEP_WATER = biome('deepWater');
const SHALLOW_WATER = biome('shallowWater');
const BEACH = biome('beach');

const SNOW_FIELD = biome('snowField');
const TUNDRA = biome('tundra');
const SNOW_FOREST = biome('snowForest');

const STEPPE = biome('steppe');
const MEADOW = biome('meadow');
export const TOWN_BIOME = MEADOW;
const FOREST = biome('forest');

const DESERT = biome('desert');
const SAVANNA = biome('savanna');
const JUNGLE = biome('jungle');

const MOUNTAIN = biome('mountain');
const SNOW_PEAK = biome('snowPeak');

const COLD_BAND = 0;

const LAND_BIOMES_BY_TEMPERATURE_THEN_MOISTURE: ReadonlyArray<readonly Biome[]> = [
  [SNOW_FIELD, TUNDRA, SNOW_FOREST],
  [STEPPE, MEADOW, FOREST],
  [DESERT, SAVANNA, JUNGLE],
];

if (
  LAND_BIOMES_BY_TEMPERATURE_THEN_MOISTURE.length !== TEMPERATURE_BAND_THRESHOLDS.length + 1 ||
  LAND_BIOMES_BY_TEMPERATURE_THEN_MOISTURE.some((row) => row.length !== MOISTURE_BAND_THRESHOLDS.length + 1)
) {
  throw new RangeError(
    'The land biome table needs one row per temperature band and one column per moisture band',
  );
}

function bandOf(value: number, thresholds: readonly number[]): number {
  let band = 0;
  for (const threshold of thresholds) {
    if (value > threshold) band++;
  }
  return band;
}

export function biomeAt(elevation: number, moisture: number, temperature: number): Biome {
  if (elevation <= ELEVATION_DEEP_WATER_LEVEL) return DEEP_WATER;
  if (elevation <= ELEVATION_SEA_LEVEL) return SHALLOW_WATER;
  if (elevation <= ELEVATION_BEACH_LEVEL) return BEACH;

  const temperatureBand = bandOf(temperatureAtElevation(temperature, elevation), TEMPERATURE_BAND_THRESHOLDS);
  if (elevation > ELEVATION_ROCK_LEVEL) return temperatureBand === COLD_BAND ? SNOW_PEAK : MOUNTAIN;

  return LAND_BIOMES_BY_TEMPERATURE_THEN_MOISTURE[temperatureBand][
    bandOf(moisture, MOISTURE_BAND_THRESHOLDS)
  ];
}
