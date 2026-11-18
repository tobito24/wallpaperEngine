import {
  CELL_BUFFER_CHUNKS,
  CELL_SIZE_CHUNKS,
  CHUNK_SIZE,
  TOWN_CACHE_MAX_ENTRIES,
  TOWN_GATE_LANDING_DEPTH_TILES,
  TOWN_GATE_PAD_DEPTH_TILES,
  TOWN_CELL_PROBABILITY,
  TOWN_DESIGNED_SHARE,
  TOWN_LARGE_WEIGHT,
  TOWN_MEDIUM_WEIGHT,
  TOWN_MIN_LAND_SHARE,
  TOWN_MARGIN_TILES,
  TOWN_RING_WIDTH_TILES,
  TOWN_SAMPLE_STRIDE_TILES,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { randomValue } from '../core/keyedRandom';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt, waterClearanceTiles } from '../elevation/heightLevel';
import type { Point } from '../skeleton/cellGrid';
import { TOWN_SHAPES } from './townShapes';
import type { ChunkOffset, TownShape, TownSizeClass } from './townShapes';

export interface Town {
  readonly cx: number;
  readonly cy: number;
  readonly shape: TownShape;
  readonly chunks: readonly ChunkOffset[];
  readonly center: Point;
  readonly plateauLevel: number;
  readonly designed: boolean;
}

if (TOWN_MARGIN_TILES + TOWN_RING_WIDTH_TILES > CELL_BUFFER_CHUNKS * CHUNK_SIZE) {
  throw new RangeError('The terrace ring of a town must stay inside the buffer of its cell');
}

if (
  TOWN_MARGIN_TILES + TOWN_GATE_PAD_DEPTH_TILES + TOWN_GATE_LANDING_DEPTH_TILES >
  CELL_BUFFER_CHUNKS * CHUNK_SIZE
) {
  throw new RangeError('The gate pad and landing of a town must stay inside the buffer of its cell');
}

const SIZE_CLASSES_FROM: Readonly<Record<TownSizeClass, readonly TownSizeClass[]>> = {
  large: ['large', 'medium', 'small'],
  medium: ['medium', 'small'],
  small: ['small'],
};

const townCache = new Map<string, Town | null>();

function sizeClassOf(cx: number, cy: number): TownSizeClass {
  const roll = randomValue(`town:${cx}:${cy}:size`);
  if (roll < TOWN_LARGE_WEIGHT) return 'large';
  if (roll < TOWN_LARGE_WEIGHT + TOWN_MEDIUM_WEIGHT) return 'medium';
  return 'small';
}

function absoluteChunks(cx: number, cy: number, shape: TownShape): ChunkOffset[] {
  const originX = cx * CELL_SIZE_CHUNKS + CELL_BUFFER_CHUNKS;
  const originY = cy * CELL_SIZE_CHUNKS + CELL_BUFFER_CHUNKS;
  return shape.chunks.map(([x, y]): ChunkOffset => [originX + x, originY + y]);
}

interface FootprintSample {
  readonly landShare: number;
  readonly plateauLevel: number;
}

function hasWaterNearChunk(chunkX: number, chunkY: number, clearanceTiles: number): boolean {
  const minX = chunkX * CHUNK_SIZE - clearanceTiles;
  const minY = chunkY * CHUNK_SIZE - clearanceTiles;
  const size = CHUNK_SIZE + 2 * clearanceTiles;
  for (let y = minY; y < minY + size; y++) {
    for (let x = minX; x < minX + size; x++) {
      if (heightLevelAt(x, y, elevationNoise(x, y)) === WATER_LEVEL) return true;
    }
  }
  return false;
}

function plateauLevelWithWaterClearance(commonLandLevel: number, chunks: readonly ChunkOffset[]): number {
  let level = commonLandLevel;
  while (
    waterClearanceTiles(level) > 0 &&
    chunks.some(([chunkX, chunkY]) =>
      hasWaterNearChunk(chunkX, chunkY, waterClearanceTiles(level) + TOWN_MARGIN_TILES),
    )
  ) {
    level--;
  }
  return level;
}

function sampleFootprint(chunks: readonly ChunkOffset[]): FootprintSample {
  const levelCounts = new Map<number, number>();
  let total = 0;
  let land = 0;
  for (const [chunkX, chunkY] of chunks) {
    for (let ly = 0; ly < CHUNK_SIZE; ly += TOWN_SAMPLE_STRIDE_TILES) {
      for (let lx = 0; lx < CHUNK_SIZE; lx += TOWN_SAMPLE_STRIDE_TILES) {
        const x = chunkX * CHUNK_SIZE + lx;
        const y = chunkY * CHUNK_SIZE + ly;
        const level = heightLevelAt(x, y, elevationNoise(x, y));
        total++;
        if (level === WATER_LEVEL) continue;
        land++;
        levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
      }
    }
  }

  let commonLandLevel = WATER_LEVEL + 1;
  let commonCount = 0;
  for (const [level, count] of levelCounts) {
    if (count > commonCount || (count === commonCount && level < commonLandLevel)) {
      commonLandLevel = level;
      commonCount = count;
    }
  }
  const plateauLevel = plateauLevelWithWaterClearance(commonLandLevel, chunks);
  return { landShare: land / total, plateauLevel };
}

function anchorCenter(chunks: readonly ChunkOffset[]): Point {
  const meanX = chunks.reduce((sum, [x]) => sum + x, 0) / chunks.length;
  const meanY = chunks.reduce((sum, [, y]) => sum + y, 0) / chunks.length;
  let best = chunks[0];
  let bestDistance = Infinity;
  for (const chunk of chunks) {
    const distance = Math.hypot(chunk[0] - meanX, chunk[1] - meanY);
    if (distance < bestDistance) {
      best = chunk;
      bestDistance = distance;
    }
  }
  return { x: best[0] * CHUNK_SIZE + CHUNK_SIZE / 2, y: best[1] * CHUNK_SIZE + CHUNK_SIZE / 2 };
}

function findTown(cx: number, cy: number): Town | null {
  if (randomValue(`town:${cx}:${cy}:wants`) >= TOWN_CELL_PROBABILITY) return null;

  for (const sizeClass of SIZE_CLASSES_FROM[sizeClassOf(cx, cy)]) {
    const candidates = TOWN_SHAPES.filter((shape) => shape.sizeClass === sizeClass).sort(
      (a, b) =>
        randomValue(`town:${cx}:${cy}:order:${a.name}`) - randomValue(`town:${cx}:${cy}:order:${b.name}`),
    );
    for (const shape of candidates) {
      const chunks = absoluteChunks(cx, cy, shape);
      const sample = sampleFootprint(chunks);
      if (sample.landShare < TOWN_MIN_LAND_SHARE) continue;
      const center = anchorCenter(chunks);
      return {
        cx,
        cy,
        shape,
        chunks,
        center,
        plateauLevel: sample.plateauLevel,
        designed: randomValue(`town:${cx}:${cy}:designed`) < TOWN_DESIGNED_SHARE,
      };
    }
  }
  return null;
}

export function townOfCell(cx: number, cy: number): Town | null {
  return remember(townCache, TOWN_CACHE_MAX_ENTRIES, `${cx},${cy}`, () => findTown(cx, cy));
}
