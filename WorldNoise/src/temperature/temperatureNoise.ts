import {
  SEED,
  TEMPERATURE_BASE_FREQUENCY,
  TEMPERATURE_CONTRAST,
  TEMPERATURE_LACUNARITY,
  TEMPERATURE_OCTAVES,
  TEMPERATURE_PERSISTENCE,
  TEMPERATURE_RAW_RANGE_HIGH,
  TEMPERATURE_RAW_RANGE_LOW,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import type { Noise2D } from '../core/noise';
import { createRedistribution } from '../core/redistribute';

const rawTemperatureNoise: Noise2D = createFractalNoise2D(
  `${SEED}:temperature`,
  TEMPERATURE_OCTAVES,
  TEMPERATURE_BASE_FREQUENCY,
  TEMPERATURE_PERSISTENCE,
  TEMPERATURE_LACUNARITY,
);

const redistributeTemperature = createRedistribution(
  TEMPERATURE_RAW_RANGE_LOW,
  TEMPERATURE_RAW_RANGE_HIGH,
  TEMPERATURE_CONTRAST,
);

export const temperatureNoise: Noise2D = (x: number, y: number): number =>
  redistributeTemperature(rawTemperatureNoise(x, y));
