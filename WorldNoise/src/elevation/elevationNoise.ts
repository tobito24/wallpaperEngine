import { createFractalNoise2D } from '../core/noise';
import type { Noise2D } from '../core/noise';
import {
  ELEVATION_BASE_FREQUENCY,
  ELEVATION_LACUNARITY,
  ELEVATION_OCTAVES,
  ELEVATION_PERSISTENCE,
  SEED,
} from '../config/constants';
import { redistributeElevation } from './redistribute';

const ELEVATION_SEED = `${SEED}:elevation`;

const rawElevationNoise: Noise2D = createFractalNoise2D(
  ELEVATION_SEED,
  ELEVATION_OCTAVES,
  ELEVATION_BASE_FREQUENCY,
  ELEVATION_PERSISTENCE,
  ELEVATION_LACUNARITY,
);

export const elevationNoise: Noise2D = (x: number, y: number): number =>
  redistributeElevation(rawElevationNoise(x, y));
