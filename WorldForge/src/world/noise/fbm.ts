import type { NoiseSource } from './NoiseSource';
import type { NoiseChannelConfig } from '../../config/generationConfig';

/**
 * Samples `source` as fractal Brownian motion (octaves of decreasing amplitude/increasing frequency)
 * and remaps the result from the underlying noise's [-1, 1] range to [0, 1].
 */
export function sampleFbm(
  source: NoiseSource,
  worldX: number,
  worldY: number,
  options: NoiseChannelConfig,
): number {
  let amplitude = 1;
  let frequency = 1 / options.scale;
  let total = 0;
  let maxAmplitude = 0;

  for (let i = 0; i < options.octaves; i++) {
    total += source(worldX * frequency, worldY * frequency) * amplitude;
    maxAmplitude += amplitude;
    amplitude *= options.persistence;
    frequency *= options.lacunarity;
  }

  const normalized = maxAmplitude > 0 ? total / maxAmplitude : 0; // still in [-1, 1]
  return (normalized + 1) / 2; // remap to [0, 1]
}
