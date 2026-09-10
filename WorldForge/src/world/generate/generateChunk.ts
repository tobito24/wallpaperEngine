import { CHUNK_SIZE } from '../../config/constants';
import { sampleClimate } from '../climate/ClimateSampler';
import { resolveBiome } from '../biome/BiomeTable';
import { BIOME_LAYER_TILES, type BiomeLayerRule } from '../biome/BiomeLayerTiles';
import { hashToUnitFloat } from './borderBlend';
import type { WorldTile } from '../grid/WorldTile';

const DECO_SALT = 33;

export function generateChunk(chunkX: number, chunkY: number): WorldTile[][] {
  const tiles: WorldTile[][] = [];

  for (let localY = 0; localY < CHUNK_SIZE; localY++) {
    const row: WorldTile[] = [];
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      const worldX = chunkX * CHUNK_SIZE + localX;
      const worldY = chunkY * CHUNK_SIZE + localY;
      row.push(generateTile(worldX, worldY));
    }
    tiles.push(row);
  }

  return tiles;
}

function generateTile(worldX: number, worldY: number): WorldTile {
  const climate = sampleClimate(worldX, worldY);

  // Deliberately NOT jittered: WorldRenderer reads neighboring tiles' `base` to autotile biome
  // borders (see world/tile/autotile.ts), which only works if that value is a clean function of
  // world coordinates — any per-tile noise here would make neighbor reads inconsistent/speckled.
  const biome = resolveBiome(climate.elevation, climate.moisture);
  const rule = BIOME_LAYER_TILES[biome];

  return {
    x: worldX,
    y: worldY,
    elevation: climate.elevation,
    moisture: climate.moisture,
    temperature: climate.temperature,
    biome,
    base: rule.base,
    deco: pickDeco(rule, worldX, worldY),
  };
}

function pickDeco(rule: BiomeLayerRule, x: number, y: number): string | undefined {
  const roll = hashToUnitFloat(x, y, DECO_SALT);
  let cumulative = 0;
  for (const candidate of rule.decoCandidates) {
    cumulative += candidate.density;
    if (roll < cumulative) return candidate.id;
  }
  return undefined;
}
