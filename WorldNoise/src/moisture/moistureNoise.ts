import {
  MOISTURE_BASE_FREQUENCY,
  MOISTURE_CONTRAST,
  MOISTURE_LACUNARITY,
  MOISTURE_OCTAVES,
  MOISTURE_PERSISTENCE,
  MOISTURE_RAW_RANGE_HIGH,
  MOISTURE_RAW_RANGE_LOW,
  SEED,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import type { Noise2D } from '../core/noise';
import { createRedistribution } from '../core/redistribute';

const rawMoistureNoise: Noise2D = createFractalNoise2D(
  `${SEED}:moisture`,
  MOISTURE_OCTAVES,
  MOISTURE_BASE_FREQUENCY,
  MOISTURE_PERSISTENCE,
  MOISTURE_LACUNARITY,
);

const redistributeMoisture = createRedistribution(
  MOISTURE_RAW_RANGE_LOW,
  MOISTURE_RAW_RANGE_HIGH,
  MOISTURE_CONTRAST,
);

export const moistureNoise: Noise2D = (x: number, y: number): number =>
  redistributeMoisture(rawMoistureNoise(x, y));
