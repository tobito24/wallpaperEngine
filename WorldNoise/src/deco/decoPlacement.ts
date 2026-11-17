import {
  CHUNK_SIZE,
  DECO_CACHE_EVICTED_SHARE,
  DECO_CACHE_MAX_ENTRIES,
  DECO_FIELD_ATTEMPTS,
  DECO_FIELD_CELL_TILES,
  DECO_FIELD_CHANCE,
  DECO_REGION_CHUNKS,
  SEED,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import { WATER_LEVEL } from '../elevation/heightLevel';
import { ROAD_TILE_MARK } from '../road/roadMask';
import type { BiomeId } from '../biome/biome';
import { terrainBlockAt } from '../world/terrainBlock';
import type { TerrainBlock } from '../world/terrainBlock';
import { blobStrength, blobsOverlapping } from './decoBlobs';
import type { Blob } from './decoBlobs';
import { decoHash } from './decoHash';
import {
  DECO_BIOME_FACTOR,
  DECO_BLOB_BIOMES,
  DECO_BLOB_DENSITY,
  DECO_CELL_SIZE_BY_PASS,
  DECO_CLUSTER_FREQUENCY_BY_PASS,
  DECO_CLUSTER_STRENGTH,
  DECO_DENSITY_BY_PASS_AND_BIOME,
  DECO_FIELD_MAX_TILES,
  DECO_ITEMS,
  DECO_MARGIN_TILES,
  DECO_PASS_DENSITY,
  DECO_PASS_EXPANSION_TILES,
  DECO_PASS_ORDER,
} from './decoTable';
import type { DecoArea, DecoItem, DecoPass } from './decoTable';

export interface DecoInstance {
  readonly item: DecoItem;
  readonly variant: number;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly rows: number;
  readonly level: number;
}

export interface DecoStats {
  candidates: number;
  withoutPool: number;
  gated: number;
  accepted: number;
  rejected: Record<string, number>;
}

export function createDecoStats(): DecoStats {
  return { candidates: 0, withoutPool: 0, gated: 0, accepted: 0, rejected: {} };
}

interface PoolEntry {
  readonly item: DecoItem;
  readonly weight: number;
}

interface Pool {
  readonly entries: readonly PoolEntry[];
  readonly total: number;
}

export interface Rectangle {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Masks {
  readonly road: Uint8Array;
  readonly roadNear: Uint8Array;
  readonly stairs: Uint8Array;
  readonly stairsNear: Uint8Array;
  readonly cliffPiece: Uint8Array;
  readonly town: Uint8Array;
}

interface Occupancy {
  readonly footprint: Uint8Array;
  readonly clearance: Uint8Array;
  readonly coveredBySprite: Uint8Array;
}

const ROAD_CLEARANCE_TILES = 1;
const STAIRS_CLEARANCE_TILES = 3;
const STAIRS_KEY_SEPARATOR = ',';
const FIELD_HASH_SALT = 2000;

const clusterNoiseByPass = new Map(
  DECO_PASS_ORDER.map((pass) => [
    pass,
    createFractalNoise2D(`${SEED}:decoCluster:${pass}`, 2, DECO_CLUSTER_FREQUENCY_BY_PASS[pass], 0.5, 2),
  ]),
);

function buildPools(blobOnly: boolean): Map<string, Pool> {
  const pools = new Map<string, Pool>();
  for (const pass of DECO_PASS_ORDER) {
    const passItems = DECO_ITEMS.filter((item) => item.pass === pass && (!blobOnly || item.blob));
    const biomes = new Set<string>();
    for (const item of passItems) Object.keys(item.biomes).forEach((id) => biomes.add(id));
    for (const biome of biomes) {
      const entries = passItems
        .filter((item) => biome in item.biomes)
        .map((item) => ({ item, weight: item.biomes[biome as keyof DecoItem['biomes']] as number }));
      pools.set(`${pass}:${biome}`, {
        entries,
        total: entries.reduce((sum, entry) => sum + entry.weight, 0),
      });
    }
  }
  return pools;
}

const fieldPoolByBiome = new Map<string, Pool>();
for (const item of DECO_ITEMS) {
  if (!item.area) continue;
  for (const [biome, weight] of Object.entries(item.biomes) as [BiomeId, number][]) {
    const entries = [...(fieldPoolByBiome.get(biome)?.entries ?? []), { item, weight }];
    fieldPoolByBiome.set(biome, { entries, total: entries.reduce((sum, entry) => sum + entry.weight, 0) });
  }
}

const poolByPassAndBiome = buildPools(false);
const blobPoolByPassAndBiome = buildPools(true);

function indexOf(block: TerrainBlock, x: number, y: number): number {
  const column = x - block.minX;
  const row = y - block.minY;
  return column < 0 || row < 0 || column >= block.size || row >= block.size ? -1 : row * block.size + column;
}

function dilate(source: Uint8Array, size: number, reach: number): Uint8Array {
  const result = new Uint8Array(source.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!source[y * size + x]) continue;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < size && ny < size) result[ny * size + nx] = 1;
        }
      }
    }
  }
  return result;
}

function masksOf(block: TerrainBlock): Masks {
  const count = block.size * block.size;
  const road = new Uint8Array(count);
  const stairs = new Uint8Array(count);
  const cliffPiece = new Uint8Array(count);
  const town = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    road[index] = block.roads[index] === ROAD_TILE_MARK ? 1 : 0;
    cliffPiece[index] = block.cliffLayout.cliffTypes[index] !== null ? 1 : 0;
    town[index] = block.townInfos[index] !== null ? 1 : 0;
  }
  for (const key of block.stairs.keys()) {
    const [x, y] = key.split(STAIRS_KEY_SEPARATOR).map(Number);
    const index = indexOf(block, x, y);
    if (index >= 0) stairs[index] = 1;
  }
  return {
    road,
    roadNear: dilate(road, block.size, ROAD_CLEARANCE_TILES),
    stairs,
    stairsNear: dilate(stairs, block.size, STAIRS_CLEARANCE_TILES),
    cliffPiece,
    town,
  };
}

export function decoFootprintOf(
  item: DecoItem,
  x: number,
  y: number,
  length: number,
  rows: number,
): Rectangle {
  const width = item.strip || item.area ? length : item.footprint.width;
  const height = item.area ? rows : item.footprint.height;
  return { left: x, top: y, right: x + width, bottom: y + height };
}

export function decoSpriteOf(item: DecoItem, x: number, y: number, length: number, rows: number): Rectangle {
  const width = item.strip || item.area ? length : item.sprite.width;
  const footprintHeight = item.area ? rows : item.footprint.height;
  const spriteHeight = item.area ? rows : item.sprite.height;
  const left = x - item.anchorColumn;
  const bottom = y + footprintHeight;
  return { left, top: bottom - spriteHeight, right: left + width, bottom };
}

function expanded(rectangle: Rectangle, reach: number): Rectangle {
  return {
    left: rectangle.left - reach,
    top: rectangle.top - reach,
    right: rectangle.right + reach,
    bottom: rectangle.bottom + reach,
  };
}

function everyTile(
  block: TerrainBlock,
  rectangle: Rectangle,
  test: (index: number, x: number, y: number) => boolean,
): boolean {
  for (let y = rectangle.top; y < rectangle.bottom; y++) {
    for (let x = rectangle.left; x < rectangle.right; x++) {
      const index = indexOf(block, x, y);
      if (index < 0 || !test(index, x, y)) return false;
    }
  }
  return true;
}

function anyTile(
  block: TerrainBlock,
  rectangle: Rectangle,
  test: (index: number, x: number, y: number) => boolean,
): boolean {
  for (let y = rectangle.top; y < rectangle.bottom; y++) {
    for (let x = rectangle.left; x < rectangle.right; x++) {
      const index = indexOf(block, x, y);
      if (index >= 0 && test(index, x, y)) return true;
    }
  }
  return false;
}

function forEachTile(
  block: TerrainBlock,
  rectangle: Rectangle,
  action: (index: number, x: number, y: number) => void,
): void {
  anyTile(block, rectangle, (index, x, y) => {
    action(index, x, y);
    return false;
  });
}

function insideFootprint(rectangle: Rectangle, x: number, y: number): boolean {
  return x >= rectangle.left && x < rectangle.right && y >= rectangle.top && y < rectangle.bottom;
}

function invalidReason(
  item: DecoItem,
  x: number,
  y: number,
  length: number,
  rows: number,
  block: TerrainBlock,
  masks: Masks,
): string | null {
  const footprint = decoFootprintOf(item, x, y, length, rows);
  const sprite = decoSpriteOf(item, x, y, length, rows);
  const firstIndex = indexOf(block, x, y);
  if (firstIndex < 0) return 'outside';
  const level = block.levels[firstIndex];
  const isFlat = item.layer === 'flat';

  const footprintReason = (index: number): string | null => {
    if (!(block.grounds[index] in item.biomes)) return 'ground';
    if (masks.town[index]) return 'town';
    if (masks.road[index] || (!isFlat && masks.roadNear[index])) return 'road';
    if (masks.stairs[index] || (!isFlat && masks.stairsNear[index])) return 'stairs';
    if (block.levels[index] !== level || (level === WATER_LEVEL) !== (item.surface === 'water'))
      return 'level';
    if (masks.cliffPiece[index]) return 'cliff';
    return null;
  };
  for (let row = footprint.top; row < footprint.bottom; row++) {
    for (let column = footprint.left; column < footprint.right; column++) {
      const index = indexOf(block, column, row);
      if (index < 0) return 'outside';
      const reason = footprintReason(index);
      if (reason) return reason;
    }
  }

  const overhangClear = everyTile(block, sprite, (index, column, row) => {
    if (insideFootprint(footprint, column, row)) return true;
    if (masks.town[index] || masks.road[index] || masks.stairs[index]) return false;
    return item.overlapsCliff || !masks.cliffPiece[index];
  });
  return overhangClear ? null : 'overhang';
}

function conflicts(
  item: DecoItem,
  x: number,
  y: number,
  length: number,
  rows: number,
  block: TerrainBlock,
  occupancy: Occupancy,
): boolean {
  const footprint = decoFootprintOf(item, x, y, length, rows);
  const sprite = decoSpriteOf(item, x, y, length, rows);
  if (
    anyTile(
      block,
      footprint,
      (index) =>
        occupancy.footprint[index] === 1 ||
        occupancy.clearance[index] === 1 ||
        occupancy.coveredBySprite[index] === 1,
    )
  ) {
    return true;
  }
  if (
    item.clearance > 0 &&
    anyTile(block, expanded(footprint, item.clearance), (index) => occupancy.footprint[index] === 1)
  ) {
    return true;
  }
  if (item.overlapsDeco) return false;
  return anyTile(
    block,
    sprite,
    (index, column, row) => !insideFootprint(footprint, column, row) && occupancy.footprint[index] === 1,
  );
}

function occupy(
  item: DecoItem,
  x: number,
  y: number,
  length: number,
  rows: number,
  block: TerrainBlock,
  occupancy: Occupancy,
): void {
  const footprint = decoFootprintOf(item, x, y, length, rows);
  forEachTile(block, footprint, (index) => {
    occupancy.footprint[index] = 1;
  });
  if (item.clearance > 0) {
    forEachTile(block, expanded(footprint, item.clearance), (index) => {
      occupancy.clearance[index] = 1;
    });
  }
  if (!item.overlapsDeco) {
    forEachTile(block, decoSpriteOf(item, x, y, length, rows), (index, column, row) => {
      if (!insideFootprint(footprint, column, row)) occupancy.coveredBySprite[index] = 1;
    });
  }
}

function clusterFactor(pass: DecoPass, x: number, y: number): number {
  const noise = clusterNoiseByPass.get(pass);
  return noise ? Math.max(0, 1 + DECO_CLUSTER_STRENGTH[pass] * (2 * noise(x, y) - 1)) : 1;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function pickEntry(pool: Pool, roll: number): PoolEntry {
  let remaining = roll * pool.total;
  for (const entry of pool.entries) {
    remaining -= entry.weight;
    if (remaining < 0) return entry;
  }
  return pool.entries[pool.entries.length - 1];
}

function candidateAt(
  pass: DecoPass,
  passIndex: number,
  cellX: number,
  cellY: number,
  block: TerrainBlock,
  blobs: readonly Blob[],
  stats: DecoStats | undefined,
): DecoInstance | null {
  const cell = DECO_CELL_SIZE_BY_PASS[pass];
  const originX = cellX * cell;
  const originY = cellY * cell;
  const pointX = originX + Math.floor(decoHash(passIndex, cellX, cellY, 1) * cell);
  const pointY = originY + Math.floor(decoHash(passIndex, cellX, cellY, 2) * cell);
  const pointIndex = indexOf(block, pointX, pointY);
  if (pointIndex < 0) return null;
  const biome = block.grounds[pointIndex];
  const blobShare =
    blobs.length > 0 && DECO_BLOB_BIOMES.includes(biome as BiomeId) ? blobStrength(blobs, pointX, pointY) : 0;
  const blobDensity = DECO_BLOB_DENSITY[pass];
  const insideBlob = blobShare > 0 && blobDensity !== undefined;
  const pool = (insideBlob ? blobPoolByPassAndBiome : poolByPassAndBiome).get(`${pass}:${biome}`);
  if (stats) stats.candidates++;
  if (!pool) {
    if (stats) stats.withoutPool++;
    return null;
  }
  const biomeDensity =
    DECO_DENSITY_BY_PASS_AND_BIOME[pass]?.[biome as BiomeId] ??
    DECO_PASS_DENSITY[pass] * (DECO_BIOME_FACTOR[biome as BiomeId] ?? 1);
  const baseDensity = insideBlob
    ? (blobDensity as number) * blobShare
    : biomeDensity * clusterFactor(pass, pointX, pointY);
  const density = blobShare > 0 && !insideBlob ? baseDensity * (1 - blobShare) : baseDensity;
  if (decoHash(passIndex, cellX, cellY, 0) >= density) {
    if (stats) stats.gated++;
    return null;
  }
  const { item } = pickEntry(pool, decoHash(passIndex, cellX, cellY, 3));
  const variant = Math.floor(decoHash(passIndex, cellX, cellY, 4) * item.variants);
  const length = item.strip
    ? item.strip.minLength +
      Math.floor(decoHash(passIndex, cellX, cellY, 5) * (item.strip.maxLength - item.strip.minLength + 1))
    : item.footprint.width;
  const spriteWidth = item.strip ? length : item.sprite.width;
  const lowestX = item.overlapsDeco ? originX : originX + item.anchorColumn;
  const highestX = item.overlapsDeco
    ? originX + cell - length
    : originX + cell - spriteWidth + item.anchorColumn;
  const lowestY = item.overlapsDeco ? originY : originY + item.sprite.height - item.footprint.height;
  const x = clamp(pointX, lowestX, highestX);
  const y = clamp(pointY, lowestY, originY + cell - item.footprint.height);
  return {
    item,
    variant,
    x,
    y,
    length,
    rows: item.footprint.height,
    level: block.levels[indexOf(block, x, y)],
  };
}

function fieldAttempt(
  attempt: number,
  cellX: number,
  cellY: number,
  block: TerrainBlock,
  masks: Masks,
  stats: DecoStats | undefined,
): DecoInstance | null {
  const cell = DECO_FIELD_CELL_TILES;
  const originX = cellX * cell;
  const originY = cellY * cell;
  const salt = FIELD_HASH_SALT + attempt;
  const pointX = originX + Math.floor(decoHash(salt, cellX, cellY, 1) * cell);
  const pointY = originY + Math.floor(decoHash(salt, cellX, cellY, 2) * cell);
  const pointIndex = indexOf(block, pointX, pointY);
  if (pointIndex < 0) return null;
  const pool = fieldPoolByBiome.get(block.grounds[pointIndex]);
  if (!pool) {
    if (stats) stats.rejected['field no pool'] = (stats.rejected['field no pool'] ?? 0) + 1;
    return null;
  }
  const { item } = pickEntry(pool, decoHash(salt, cellX, cellY, 3));
  const area = item.area as DecoArea;
  const length =
    area.minWidth + Math.floor(decoHash(salt, cellX, cellY, 4) * (area.maxWidth - area.minWidth + 1));
  const rows =
    area.minHeight + Math.floor(decoHash(salt, cellX, cellY, 5) * (area.maxHeight - area.minHeight + 1));
  const x = clamp(pointX, originX, originX + cell - length);
  const y = clamp(pointY, originY, originY + cell - rows);
  const reason = invalidReason(item, x, y, length, rows, block, masks);
  if (reason) {
    if (stats) stats.rejected[`field ${reason}`] = (stats.rejected[`field ${reason}`] ?? 0) + 1;
    return null;
  }
  return { item, variant: 0, x, y, length, rows, level: block.levels[indexOf(block, x, y)] };
}

function fieldAt(
  cellX: number,
  cellY: number,
  block: TerrainBlock,
  masks: Masks,
  stats: DecoStats | undefined,
): DecoInstance | null {
  if (decoHash(FIELD_HASH_SALT, cellX, cellY, 0) >= DECO_FIELD_CHANCE) return null;
  for (let attempt = 0; attempt < DECO_FIELD_ATTEMPTS; attempt++) {
    const field = fieldAttempt(attempt, cellX, cellY, block, masks, stats);
    if (field) return field;
  }
  return null;
}

function fieldsOverlapping(
  minX: number,
  minY: number,
  size: number,
  block: TerrainBlock,
  masks: Masks,
  stats: DecoStats | undefined,
): DecoInstance[] {
  const cell = DECO_FIELD_CELL_TILES;
  const fields: DecoInstance[] = [];
  const firstCellX = Math.floor((minX - DECO_FIELD_MAX_TILES) / cell);
  const lastCellX = Math.floor((minX + size + DECO_FIELD_MAX_TILES) / cell);
  const firstCellY = Math.floor((minY - DECO_FIELD_MAX_TILES) / cell);
  const lastCellY = Math.floor((minY + size + DECO_FIELD_MAX_TILES) / cell);
  for (let cellY = firstCellY; cellY <= lastCellY; cellY++) {
    for (let cellX = firstCellX; cellX <= lastCellX; cellX++) {
      const field = fieldAt(cellX, cellY, block, masks, stats);
      if (field) fields.push(field);
    }
  }
  return fields;
}

function rectanglesOverlap(first: Rectangle, second: Rectangle): boolean {
  return (
    first.left < second.right &&
    second.left < first.right &&
    first.top < second.bottom &&
    second.top < first.bottom
  );
}

export function decoInRegion(minX: number, minY: number, size: number, stats?: DecoStats): DecoInstance[] {
  const block = terrainBlockAt(
    minX - DECO_MARGIN_TILES,
    minY - DECO_MARGIN_TILES,
    size + 2 * DECO_MARGIN_TILES,
  );
  const masks = masksOf(block);
  const count = block.size * block.size;
  const occupancy: Occupancy = {
    footprint: new Uint8Array(count),
    clearance: new Uint8Array(count),
    coveredBySprite: new Uint8Array(count),
  };
  const accepted: DecoInstance[] = [];
  const blobs = blobsOverlapping(block.minX, block.minY, block.minX + block.size, block.minY + block.size);

  DECO_PASS_ORDER.forEach((pass, passIndex) => {
    const reach = DECO_PASS_EXPANSION_TILES[pass];
    const cell = DECO_CELL_SIZE_BY_PASS[pass];
    const firstCellX = Math.floor((minX - reach) / cell);
    const lastCellX = Math.floor((minX + size + reach - 1) / cell);
    const firstCellY = Math.floor((minY - reach) / cell);
    const lastCellY = Math.floor((minY + size + reach - 1) / cell);
    const acceptedInPass: DecoInstance[] = [];
    for (let cellY = firstCellY; cellY <= lastCellY; cellY++) {
      for (let cellX = firstCellX; cellX <= lastCellX; cellX++) {
        const candidate = candidateAt(pass, passIndex, cellX, cellY, block, blobs, stats);
        if (!candidate) continue;
        const reason = invalidReason(
          candidate.item,
          candidate.x,
          candidate.y,
          candidate.length,
          candidate.rows,
          block,
          masks,
        );
        if (reason) {
          if (stats) stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1;
          continue;
        }
        if (
          conflicts(
            candidate.item,
            candidate.x,
            candidate.y,
            candidate.length,
            candidate.rows,
            block,
            occupancy,
          )
        ) {
          if (stats) stats.rejected.conflict = (stats.rejected.conflict ?? 0) + 1;
          continue;
        }
        acceptedInPass.push(candidate);
        if (stats) stats.accepted++;
      }
    }
    for (const instance of acceptedInPass) {
      occupy(instance.item, instance.x, instance.y, instance.length, instance.rows, block, occupancy);
    }
    accepted.push(...acceptedInPass);
  });

  const fields = fieldsOverlapping(minX, minY, size, block, masks, stats);
  const fieldRectangles = fields.map((field) =>
    decoFootprintOf(field.item, field.x, field.y, field.length, field.rows),
  );
  const owned = (instance: DecoInstance): boolean =>
    instance.x >= minX && instance.x < minX + size && instance.y >= minY && instance.y < minY + size;
  const outsideFields = accepted.filter((instance) => {
    const footprint = decoFootprintOf(instance.item, instance.x, instance.y, instance.length, instance.rows);
    return !fieldRectangles.some((rectangle) => rectanglesOverlap(footprint, rectangle));
  });
  return [...outsideFields, ...fields].filter(owned);
}

const chunkCache = new Map<string, readonly DecoInstance[]>();

function evictOldestChunks(): void {
  let remaining = Math.ceil(DECO_CACHE_MAX_ENTRIES * DECO_CACHE_EVICTED_SHARE);
  for (const key of chunkCache.keys()) {
    chunkCache.delete(key);
    remaining--;
    if (remaining <= 0) return;
  }
}

export function computeDecoOfChunk(chunkX: number, chunkY: number): readonly DecoInstance[] {
  const key = `${chunkX},${chunkY}`;
  const cached = chunkCache.get(key);
  if (cached) return cached;
  if (chunkCache.size >= DECO_CACHE_MAX_ENTRIES) evictOldestChunks();

  const firstChunkX = Math.floor(chunkX / DECO_REGION_CHUNKS) * DECO_REGION_CHUNKS;
  const firstChunkY = Math.floor(chunkY / DECO_REGION_CHUNKS) * DECO_REGION_CHUNKS;
  const instances = decoInRegion(
    firstChunkX * CHUNK_SIZE,
    firstChunkY * CHUNK_SIZE,
    DECO_REGION_CHUNKS * CHUNK_SIZE,
  );
  const byChunk = new Map<string, DecoInstance[]>();
  for (let offsetY = 0; offsetY < DECO_REGION_CHUNKS; offsetY++) {
    for (let offsetX = 0; offsetX < DECO_REGION_CHUNKS; offsetX++) {
      byChunk.set(`${firstChunkX + offsetX},${firstChunkY + offsetY}`, []);
    }
  }
  for (const instance of instances) {
    byChunk
      .get(`${Math.floor(instance.x / CHUNK_SIZE)},${Math.floor(instance.y / CHUNK_SIZE)}`)
      ?.push(instance);
  }
  for (const [chunkKey, chunkInstances] of byChunk) chunkCache.set(chunkKey, chunkInstances);
  return chunkCache.get(key) ?? [];
}

export function peekDecoOfChunk(chunkX: number, chunkY: number): readonly DecoInstance[] | undefined {
  return chunkCache.get(`${chunkX},${chunkY}`);
}
