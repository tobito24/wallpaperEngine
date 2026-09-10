import type { TileDef, TileSprite } from '../tile/TileRegistry';

/**
 * Deterministic hash of (x, y, salt) -> [0, 1). Same shape as InfinityWalker's `hash2D`
 * (utility/getHeightLevel.js) — a proven, allocation-free way to get per-tile "randomness" that stays
 * stable across frames/re-renders instead of re-rolling with Math.random() every draw call.
 */
export function hashToUnitFloat(x: number, y: number, salt: number): number {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(salt | 0, 1442695041);
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

/** Picks one of a tile's weighted sprite variants deterministically for a given world position. */
export function pickSprite(tile: TileDef, x: number, y: number, salt: number): TileSprite {
  if (tile.sprites.length === 1) {
    return tile.sprites[0]!;
  }

  const totalWeight = tile.sprites.reduce((sum, sprite) => sum + sprite.weight, 0);
  const roll = hashToUnitFloat(x, y, salt) * totalWeight;

  let cumulative = 0;
  for (const sprite of tile.sprites) {
    cumulative += sprite.weight;
    if (roll <= cumulative) return sprite;
  }
  return tile.sprites[tile.sprites.length - 1]!;
}
