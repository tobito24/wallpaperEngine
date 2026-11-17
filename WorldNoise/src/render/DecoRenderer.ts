import { CHUNK_SIZE, DECO_CHUNKS_PER_FRAME, DECO_MIN_TILE_SIZE_PX } from '../config/constants';
import type { Camera, TileBounds } from '../core/Camera';
import { decoImage } from '../deco/decoSheets';
import { computeDecoOfChunk, peekDecoOfChunk } from '../deco/decoPlacement';
import type { DecoInstance } from '../deco/decoPlacement';
import { DECO_CONFLICT_REACH_TILES } from '../deco/decoTable';
import type { DecoLayer } from '../deco/decoTable';
import { tintedSprite } from '../deco/decoTint';
import { shadeForHeightLevel } from '../elevation/color';

const LAYER_ORDER: Readonly<Record<DecoLayer, number>> = { flat: 0, object: 1, overhead: 2 };

interface ChunkRange {
  readonly minChunkX: number;
  readonly maxChunkX: number;
  readonly minChunkY: number;
  readonly maxChunkY: number;
}

function compareInstances(first: DecoInstance, second: DecoInstance): number {
  const layer = LAYER_ORDER[first.item.layer] - LAYER_ORDER[second.item.layer];
  if (layer !== 0) return layer;
  const row = first.y + first.item.footprint.height - (second.y + second.item.footprint.height);
  if (row !== 0) return row;
  if (first.x !== second.x) return first.x - second.x;
  return first.y - second.y;
}

function chunkRangeOf(bounds: TileBounds): ChunkRange {
  return {
    minChunkX: Math.floor((bounds.minX - DECO_CONFLICT_REACH_TILES) / CHUNK_SIZE),
    maxChunkX: Math.floor((bounds.maxX + DECO_CONFLICT_REACH_TILES) / CHUNK_SIZE),
    minChunkY: Math.floor((bounds.minY - DECO_CONFLICT_REACH_TILES) / CHUNK_SIZE),
    maxChunkY: Math.floor((bounds.maxY + DECO_CONFLICT_REACH_TILES) / CHUNK_SIZE),
  };
}

export class DecoRenderer {
  private sorted: readonly DecoInstance[] = [];
  private sortedKey = '';
  private computedCount = 0;

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    bounds: TileBounds,
    viewportWidth: number,
    viewportHeight: number,
    size: number,
    animationFrame: number,
  ): void {
    if (camera.tileSize < DECO_MIN_TILE_SIZE_PX) return;
    const range = chunkRangeOf(bounds);
    this.computeMissingChunks(range, camera);
    const key = `${range.minChunkX},${range.maxChunkX},${range.minChunkY},${range.maxChunkY}:${this.computedCount}`;
    if (key !== this.sortedKey) {
      this.sorted = this.collect(range).sort(compareInstances);
      this.sortedKey = key;
    }
    for (const instance of this.sorted) {
      this.drawInstance(ctx, camera, bounds, viewportWidth, viewportHeight, size, animationFrame, instance);
    }
  }

  private computeMissingChunks(range: ChunkRange, camera: Camera): void {
    const missing: { chunkX: number; chunkY: number; distance: number }[] = [];
    for (let chunkY = range.minChunkY; chunkY <= range.maxChunkY; chunkY++) {
      for (let chunkX = range.minChunkX; chunkX <= range.maxChunkX; chunkX++) {
        if (peekDecoOfChunk(chunkX, chunkY)) continue;
        const distance = Math.hypot(
          (chunkX + 0.5) * CHUNK_SIZE - camera.x,
          (chunkY + 0.5) * CHUNK_SIZE - camera.y,
        );
        missing.push({ chunkX, chunkY, distance });
      }
    }
    missing.sort((first, second) => first.distance - second.distance);
    for (const { chunkX, chunkY } of missing.slice(0, DECO_CHUNKS_PER_FRAME)) {
      computeDecoOfChunk(chunkX, chunkY);
      this.computedCount++;
    }
  }

  private collect(range: ChunkRange): DecoInstance[] {
    const instances: DecoInstance[] = [];
    for (let chunkY = range.minChunkY; chunkY <= range.maxChunkY; chunkY++) {
      for (let chunkX = range.minChunkX; chunkX <= range.maxChunkX; chunkX++) {
        const chunkInstances = peekDecoOfChunk(chunkX, chunkY);
        if (chunkInstances) instances.push(...chunkInstances);
      }
    }
    return instances;
  }

  private drawInstance(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    bounds: TileBounds,
    viewportWidth: number,
    viewportHeight: number,
    size: number,
    animationFrame: number,
    instance: DecoInstance,
  ): void {
    const { item, variant, x, y, level } = instance;
    const left = x - item.anchorColumn;
    const top = y + item.footprint.height - item.sprite.height;
    if (
      left > bounds.maxX ||
      left + item.sprite.width <= bounds.minX ||
      top > bounds.maxY ||
      top + item.sprite.height <= bounds.minY
    ) {
      return;
    }
    const image = decoImage(item, variant);
    if (!image) return;

    const shade = shadeForHeightLevel(level);
    const source = shade ? tintedSprite(image, shade) : image;
    const frameWidth = image.naturalWidth / item.frames;
    const origin = camera.worldToScreen(left, top, viewportWidth, viewportHeight);
    ctx.drawImage(
      source,
      (animationFrame % item.frames) * frameWidth,
      0,
      frameWidth,
      image.naturalHeight,
      origin.x,
      origin.y,
      item.sprite.width * size,
      item.sprite.height * size,
    );
  }
}
