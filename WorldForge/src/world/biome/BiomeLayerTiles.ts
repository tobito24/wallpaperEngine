import { TILE } from '../tile/TileRegistry';
import type { BiomeId } from './BiomeTable';

export interface DecoCandidate {
  id: string;
  /** Chance in [0,1] that a given tile in this biome rolls this deco item. Candidates are checked in order. */
  density: number;
}

export interface BiomeLayerRule {
  base: string;
  decoCandidates: DecoCandidate[];
}

// This table is the whole "no combinatorial tile explosion" mechanism: adding a biome or reshuffling
// its look is a data change here, not a new set of WFC edge rules.
// Base materials are chosen, where possible, to line up with InfinityWalker's authored autotile
// transitions (see world/tile/TransitionCatalog.ts) so adjacent biomes get real edge sprites instead
// of the dither fallback — see WorldForge/CLAUDE.md for which biome borders that covers.
export const BIOME_LAYER_TILES: Record<BiomeId, BiomeLayerRule> = {
  ocean: { base: TILE.beachWater.id, decoCandidates: [] }, // reserved, unused until Phase 2 adds water tiles
  beach: { base: TILE.beachSand.id, decoCandidates: [] },
  grassland: { base: TILE.grass.id, decoCandidates: [{ id: TILE.grassTuft.id, density: 0.05 }] },
  // grassLight (not grassDry) — has an authored transition to `grass`, unlike grassDry.
  dryGrassland: { base: TILE.grassLight.id, decoCandidates: [{ id: TILE.grassTuft.id, density: 0.02 }] },
  forest: {
    base: TILE.grassDark.id,
    decoCandidates: [
      { id: TILE.tallGrass.id, density: 0.12 },
      { id: TILE.fern.id, density: 0.08 },
    ],
  },
  denseForest: {
    base: TILE.grassDark.id,
    decoCandidates: [
      { id: TILE.tallGrass.id, density: 0.22 },
      { id: TILE.fern.id, density: 0.16 },
    ],
  },
  badlands: { base: TILE.mud.id, decoCandidates: [{ id: TILE.rockSmall.id, density: 0.05 }] },
  mountainRock: {
    base: TILE.stoneLight.id,
    decoCandidates: [
      { id: TILE.rockSmall.id, density: 0.1 },
      { id: TILE.bigStone.id, density: 0.03 },
    ],
  },
  // No dedicated snow art in the current tileset — stoneMid (not stoneDark) is the placeholder base
  // since it has an authored transition to mountainRock's stoneLight.
  snowPeak: { base: TILE.stoneMid.id, decoCandidates: [{ id: TILE.bigStone.id, density: 0.04 }] },
};
