import {
  CHUNK_SIZE,
  DECO_CACHE_EVICTED_SHARE,
  DECO_CACHE_MAX_ENTRIES,
  DECO_CLUSTER_FREQUENCY,
  SEED,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import { NO_INNER_RING } from '../elevation/cliffLayout';
import { WATER_LEVEL } from '../elevation/heightLevel';
import { ROAD_TILE_MARK } from '../road/roadMask';
import { terrainBlockAt } from '../world/terrainBlock';
import type { TerrainBlock } from '../world/terrainBlock';
import { decoHash } from './decoHash';
import {
  DECO_BIOME_FACTOR,
  DECO_CELL_SIZE_BY_PASS,
  DECO_CLUSTER_STRENGTH,
  DECO_CONFLICT_REACH_TILES,
  DECO_ITEMS,
  DECO_MARGIN_TILES,
  DECO_PASS_DENSITY,
  DECO_PASS_ORDER,
} from './decoTable';
import type { DecoItem, DecoPass } from './decoTable';

export interface DecoInstance {
  readonly item: DecoItem;
  readonly variant: number;
  readonly x: number;
  readonly y: number;
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

interface Rectangle {
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
  readonly cliff: Uint8Array;
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

const clusterNoise = createFractalNoise2D(`${SEED}:decoCluster`, 2, DECO_CLUSTER_FREQUENCY, 0.5, 2);

const poolByPassAndBiome = new Map<string, Pool>();
for (const pass of DECO_PASS_ORDER) {
  const biomes = new Set<string>();
  for (const item of DECO_ITEMS)
    if (item.pass === pass) Object.keys(item.biomes).forEach((id) => biomes.add(id));
  for (const biome of biomes) {
    const entries = DECO_ITEMS.filter((item) => item.pass === pass && biome in item.biomes).map((item) => ({
      item,
      weight: item.biomes[biome as keyof DecoItem['biomes']] as number,
    }));
    poolByPassAndBiome.set(`${pass}:${biome}`, {
      entries,
      total: entries.reduce((sum, entry) => sum + entry.weight, 0),
    });
  }
}

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
  const cliff = new Uint8Array(count);
  const town = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    road[index] = block.roads[index] === ROAD_TILE_MARK ? 1 : 0;
    cliff[index] =
      block.cliffLayout.cliffTypes[index] !== null ||
      block.cliffLayout.innerRingIndices[index] !== NO_INNER_RING
        ? 1
        : 0;
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
    cliff,
    town,
  };
}

function footprintOf(item: DecoItem, x: number, y: number): Rectangle {
  return { left: x, top: y, right: x + item.footprint.width, bottom: y + item.footprint.height };
}

function spriteOf(item: DecoItem, x: number, y: number): Rectangle {
  const left = x - item.anchorColumn;
  const bottom = y + item.footprint.height;
  return { left, top: bottom - item.sprite.height, right: left + item.sprite.width, bottom };
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
  block: TerrainBlock,
  masks: Masks,
): string | null {
  const footprint = footprintOf(item, x, y);
  const sprite = spriteOf(item, x, y);
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
    if (masks.cliff[index]) return 'cliff';
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
    return item.overlapsCliff || !masks.cliff[index];
  });
  return overhangClear ? null : 'overhang';
}

function conflicts(item: DecoItem, x: number, y: number, block: TerrainBlock, occupancy: Occupancy): boolean {
  const footprint = footprintOf(item, x, y);
  const sprite = spriteOf(item, x, y);
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

function occupy(item: DecoItem, x: number, y: number, block: TerrainBlock, occupancy: Occupancy): void {
  const footprint = footprintOf(item, x, y);
  forEachTile(block, footprint, (index) => {
    occupancy.footprint[index] = 1;
  });
  if (item.clearance > 0) {
    forEachTile(block, expanded(footprint, item.clearance), (index) => {
      occupancy.clearance[index] = 1;
    });
  }
  if (!item.overlapsDeco) {
    forEachTile(block, spriteOf(item, x, y), (index, column, row) => {
      if (!insideFootprint(footprint, column, row)) occupancy.coveredBySprite[index] = 1;
    });
  }
}

function clusterFactor(pass: DecoPass, x: number, y: number): number {
  return Math.max(0, 1 + DECO_CLUSTER_STRENGTH[pass] * (2 * clusterNoise(x, y) - 1));
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
  const pool = poolByPassAndBiome.get(`${pass}:${biome}`);
  if (stats) stats.candidates++;
  if (!pool) {
    if (stats) stats.withoutPool++;
    return null;
  }
  const density =
    DECO_PASS_DENSITY[pass] *
    (DECO_BIOME_FACTOR[biome as keyof typeof DECO_BIOME_FACTOR] ?? 1) *
    clusterFactor(pass, pointX, pointY);
  if (decoHash(passIndex, cellX, cellY, 0) >= density) {
    if (stats) stats.gated++;
    return null;
  }
  const { item } = pickEntry(pool, decoHash(passIndex, cellX, cellY, 3));
  const variant = Math.floor(decoHash(passIndex, cellX, cellY, 4) * item.variants);
  const x = clamp(
    pointX,
    originX + item.anchorColumn,
    originX + cell - item.sprite.width + item.anchorColumn,
  );
  const y = clamp(
    pointY,
    originY + item.sprite.height - item.footprint.height,
    originY + cell - item.footprint.height,
  );
  return { item, variant, x, y, level: block.levels[indexOf(block, x, y)] };
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

  DECO_PASS_ORDER.forEach((pass, passIndex) => {
    const reach = (DECO_PASS_ORDER.length - 1 - passIndex) * DECO_CONFLICT_REACH_TILES;
    const cell = DECO_CELL_SIZE_BY_PASS[pass];
    const firstCellX = Math.floor((minX - reach) / cell);
    const lastCellX = Math.floor((minX + size + reach - 1) / cell);
    const firstCellY = Math.floor((minY - reach) / cell);
    const lastCellY = Math.floor((minY + size + reach - 1) / cell);
    const acceptedInPass: DecoInstance[] = [];
    for (let cellY = firstCellY; cellY <= lastCellY; cellY++) {
      for (let cellX = firstCellX; cellX <= lastCellX; cellX++) {
        const candidate = candidateAt(pass, passIndex, cellX, cellY, block, stats);
        if (!candidate) continue;
        const reason = invalidReason(candidate.item, candidate.x, candidate.y, block, masks);
        if (reason) {
          if (stats) stats.rejected[reason] = (stats.rejected[reason] ?? 0) + 1;
          continue;
        }
        if (conflicts(candidate.item, candidate.x, candidate.y, block, occupancy)) {
          if (stats) stats.rejected.conflict = (stats.rejected.conflict ?? 0) + 1;
          continue;
        }
        acceptedInPass.push(candidate);
        if (stats) stats.accepted++;
      }
    }
    for (const instance of acceptedInPass) occupy(instance.item, instance.x, instance.y, block, occupancy);
    accepted.push(...acceptedInPass);
  });

  return accepted.filter(
    (instance) =>
      instance.x >= minX && instance.x < minX + size && instance.y >= minY && instance.y < minY + size,
  );
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
  const instances = decoInRegion(chunkX * CHUNK_SIZE, chunkY * CHUNK_SIZE, CHUNK_SIZE);
  chunkCache.set(key, instances);
  return instances;
}

export function peekDecoOfChunk(chunkX: number, chunkY: number): readonly DecoInstance[] | undefined {
  return chunkCache.get(`${chunkX},${chunkY}`);
}
