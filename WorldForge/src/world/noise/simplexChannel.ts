import { createNoise2D } from 'simplex-noise';
import Alea from 'alea';
import type { NoiseSource } from './NoiseSource';

/**
 * Creates an independent, deterministic simplex-noise channel. Two channels created from the same
 * seed but different offsets are decorrelated (elevation/moisture/temperature don't visibly correlate).
 */
export function createSimplexChannel(seed: string, seedOffset: number): NoiseSource {
  const random = Alea(`${seed}:${seedOffset}`);
  return createNoise2D(random);
}
