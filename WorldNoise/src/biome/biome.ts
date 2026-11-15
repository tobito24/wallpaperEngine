import {
  ELEVATION_BEACH_LEVEL,
  ELEVATION_DEEP_WATER_LEVEL,
  ELEVATION_ROCK_LEVEL,
  ELEVATION_SEA_LEVEL,
  MOISTURE_BAND_THRESHOLDS,
  TEMPERATURE_BAND_THRESHOLDS,
} from '../config/constants';
import { temperatureAtElevation } from '../temperature/temperatureAtElevation';

export type Ground = 'deepWater' | 'shallowWater' | 'sand' | 'grass' | 'dirt' | 'rock' | 'snow';

export interface Biome {
  readonly id: string;
  readonly ground: Ground;
  readonly color: string;
}

function biome(id: string, ground: Ground, color: string): Biome {
  return { id, ground, color };
}

const DEEP_WATER = biome('deepWater', 'deepWater', '#1f4e79');
const SHALLOW_WATER = biome('shallowWater', 'shallowWater', '#2f6fa7');
const BEACH = biome('beach', 'sand', '#d9c88f');

const SNOW_FIELD = biome('snowField', 'snow', '#f2f2f2');
const TUNDRA = biome('tundra', 'snow', '#d3dde3');
const SNOW_FOREST = biome('snowForest', 'snow', '#a9bfb8');

const STEPPE = biome('steppe', 'dirt', '#b59b5a');
const MEADOW = biome('meadow', 'grass', '#86b85c');
const FOREST_COLOR = '#3f7a3a';
const FOREST = biome('forest', 'grass', FOREST_COLOR);

const DESERT = biome('desert', 'sand', '#e6c97c');
const SAVANNA = biome('savanna', 'dirt', '#c08a43');
const JUNGLE = biome('jungle', 'grass', FOREST_COLOR);

const MOUNTAIN = biome('mountain', 'rock', '#6b6459');
const SNOW_PEAK = biome('snowPeak', 'snow', '#ffffff');

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
