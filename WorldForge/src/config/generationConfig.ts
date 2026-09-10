export interface NoiseChannelConfig {
  /** Added to the master seed so each channel gets its own decorrelated noise field. */
  seedOffset: number;
  scale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
}

export interface GenerationConfig {
  seed: string;
  elevation: NoiseChannelConfig;
  moisture: NoiseChannelConfig;
  temperature: NoiseChannelConfig;
  /** Exponent applied to normalized elevation before biome lookup — the direct fix for InfinityWalker's
   * mountain-heavy terrain: >1 compresses more of the map into low/plains values, leaving peaks rare. */
  elevationRedistributionExponent: number;
}

/** Single mutable tuning surface: DebugOverlay/UI code mutates this directly, ClimateSampler reads it live. */
export const generationConfig: GenerationConfig = {
  seed: 'worldforge',
  elevation: { seedOffset: 0, scale: 180, octaves: 4, persistence: 0.5, lacunarity: 2 },
  moisture: { seedOffset: 1000, scale: 220, octaves: 3, persistence: 0.5, lacunarity: 2 },
  temperature: { seedOffset: 2000, scale: 300, octaves: 2, persistence: 0.5, lacunarity: 2 },
  elevationRedistributionExponent: 2.2,
};
