import { createFractalNoise2D } from '../core/noise';
import type { Noise2D } from '../core/noise';
import {
  ELEVATION_BASE_FREQUENCY,
  ELEVATION_LACUNARITY,
  ELEVATION_OCTAVES,
  ELEVATION_PERSISTENCE,
  SEED,
} from '../config/constants';

// Salted with the channel name so elevation/moisture/temperature don't end up as the same noise field.
export const elevationNoise: Noise2D = createFractalNoise2D(
  `${SEED}:elevation`,
  ELEVATION_OCTAVES,
  ELEVATION_BASE_FREQUENCY,
  ELEVATION_PERSISTENCE,
  ELEVATION_LACUNARITY,
);
