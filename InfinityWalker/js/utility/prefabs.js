// Prefab-stamping scaffold for large multi-tile deco.

import { CHUNK_SIZE } from "../config.js";

export const PREFABS = [
  {
    id: "tree_trunk_2x2",
    weight: 8,
    width: 2,
    height: 2,
    anchor: "tl", // top-left anchor
    variants: [
      {
        id: "normal",
        weight: 8,
        tiles: [
          ["tree_trunk_tl", "tree_trunk_tr"],
          ["tree_trunk_bl", "tree_trunk_br"]
        ]
      },
      {
        id: "mossy",
        weight: 2,
        tiles: [
          ["tree_trunk_tl_mossy", "tree_trunk_tr_mossy"],
          ["tree_trunk_bl_mossy", "tree_trunk_br_mossy"]
        ]
      }
    ]
  }
];

export function applyPrefabStamps(chunk, worldSeed = 1337) {
  const minX = chunk.chunkX * CHUNK_SIZE;
  const minY = chunk.chunkY * CHUNK_SIZE;
  const maxX = minX + CHUNK_SIZE - 1;
  const maxY = minY + CHUNK_SIZE - 1;

  for (let wy = minY; wy <= maxY; wy++) {
    for (let wx = minX; wx <= maxX; wx++) {
      for (const prefab of PREFABS) {
        if (!isAnchor(wx, wy, prefab, worldSeed)) continue;
        stampPrefab(chunk, wx, wy, prefab, worldSeed);
      }
    }
  }
}

function stampPrefab(chunk, anchorX, anchorY, prefab, worldSeed) {
  const variant = pickVariant(prefab, anchorX, anchorY, worldSeed);
  const tiles = variant.tiles;

  for (let dy = 0; dy < prefab.height; dy++) {
    for (let dx = 0; dx < prefab.width; dx++) {
      const wx = anchorX + dx;
      const wy = anchorY + dy;
      const piece = chunk.getPiece(wx - chunk.chunkX * CHUNK_SIZE, wy - chunk.chunkY * CHUNK_SIZE);
      if (!piece) continue;

      // TODO: check base/overlay compatibility before stamping.
      piece.setPrefabTile(tiles[dy][dx], prefab.id, variant.id);
    }
  }
}

function pickVariant(prefab, anchorX, anchorY, worldSeed) {
  const rng = hash2D(anchorX, anchorY, worldSeed);
  const total = prefab.variants.reduce((sum, v) => sum + v.weight, 0);
  let threshold = rng * total;
  for (const v of prefab.variants) {
    threshold -= v.weight;
    if (threshold <= 0) return v;
  }
  return prefab.variants[prefab.variants.length - 1];
}

function isAnchor(wx, wy, prefab, worldSeed) {
  const chance = 0.02;
  const h = hash2D(wx, wy, worldSeed + prefab.id.length);
  return h < chance;
}

function hash2D(x, y, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1442695041);
  n = (n ^ (n >> 13)) | 0;
  n = Math.imul(n, 1274126177);
  return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}
