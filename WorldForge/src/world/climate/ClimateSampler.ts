import { createSimplexChannel } from '../noise/simplexChannel';
import { sampleFbm } from '../noise/fbm';
import { exponentRedistribute } from './redistribution';
import { generationConfig } from '../../config/generationConfig';
import type { NoiseSource } from '../noise/NoiseSource';

export interface ClimateSample {
  /** Redistributed, [0, 1]. This is what biome lookup and later phases (rivers/lakes) should read. */
  elevation: number;
  moisture: number;
  temperature: number;
}

let elevationNoise: NoiseSource;
let moistureNoise: NoiseSource;
let temperatureNoise: NoiseSource;
let channelsBuiltForSeed: string | null = null;

// Noise channels are only rebuilt when the seed actually changes; every other generationConfig field
// (scale/octaves/exponent/...) is read fresh on every sample, so live tuning needs no rebuild.
function ensureNoiseChannels(): void {
  if (channelsBuiltForSeed === generationConfig.seed) return;
  channelsBuiltForSeed = generationConfig.seed;
  elevationNoise = createSimplexChannel(generationConfig.seed, generationConfig.elevation.seedOffset);
  moistureNoise = createSimplexChannel(generationConfig.seed, generationConfig.moisture.seedOffset);
  temperatureNoise = createSimplexChannel(generationConfig.seed, generationConfig.temperature.seedOffset);
}

export function sampleClimate(worldX: number, worldY: number): ClimateSample {
  ensureNoiseChannels();

  const rawElevation = sampleFbm(elevationNoise, worldX, worldY, generationConfig.elevation);
  const elevation = exponentRedistribute(rawElevation, generationConfig.elevationRedistributionExponent);
  const moisture = sampleFbm(moistureNoise, worldX, worldY, generationConfig.moisture);
  const temperature = sampleFbm(temperatureNoise, worldX, worldY, generationConfig.temperature);

  return { elevation, moisture, temperature };
}
