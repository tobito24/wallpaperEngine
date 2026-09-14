import Alea from 'alea';
import { createNoise2D } from 'simplex-noise';

export type Noise2D = (x: number, y: number) => number;

// wrapper + seeding + fractal (multi-octave) noise + normalization to [0, 1]
export function createFractalNoise2D(
  seed: string,
  octaves: number,
  baseFrequency: number,
  persistence: number,
  lacunarity: number,
): Noise2D {
  const noise2D = createNoise2D(Alea(seed));

  return (x: number, y: number): number => {
    let amplitude = 1;
    let frequency = baseFrequency;
    let sum = 0;
    let amplitudeSum = 0;

    for (let i = 0; i < octaves; i++) {
      sum += amplitude * noise2D(x * frequency, y * frequency);
      amplitudeSum += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return (sum / amplitudeSum + 1) / 2;
  };
}
