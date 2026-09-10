import type { BiomeId } from '../biome/BiomeTable';

export interface WorldTile {
  x: number;
  y: number;
  /** Raw+redistributed climate values, kept per-tile so Phase 2/3 (rivers/lakes, POI scoring) can reuse
   * them without resampling noise. */
  elevation: number;
  moisture: number;
  temperature: number;
  biome: BiomeId;
  base: string; // TileDef id
  overlay?: string;
  deco?: string;
  // Reserved, unset in Phase 1 — added here now so Phase 2/3 are additive, not breaking changes.
  isWater?: boolean;
  flowAccumulation?: number;
  poiId?: string;
}
