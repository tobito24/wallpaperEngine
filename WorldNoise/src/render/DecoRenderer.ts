import {
  CHUNK_SIZE,
  DECO_MIN_TILE_SIZE_PX,
  DECO_REGIONS_PER_FRAME,
  DECO_TILE_SIZE_PX,
} from '../config/constants';
import type { Camera, TileBounds } from '../core/Camera';
import { decoImage, decoStripImages } from '../deco/decoSheets';
import { computeDecoOfChunk, decoSpriteOf, peekDecoOfChunk } from '../deco/decoPlacement';
import type { DecoInstance } from '../deco/decoPlacement';
import { DECO_VIEW_REACH_TILES } from '../deco/decoTable';
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
    minChunkX: Math.floor((bounds.minX - DECO_VIEW_REACH_TILES) / CHUNK_SIZE),
    maxChunkX: Math.floor((bounds.maxX + DECO_VIEW_REACH_TILES) / CHUNK_SIZE),
    minChunkY: Math.floor((bounds.minY - DECO_VIEW_REACH_TILES) / CHUNK_SIZE),
    maxChunkY: Math.floor((bounds.maxY + DECO_VIEW_REACH_TILES) / CHUNK_SIZE),
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
    let regionsComputed = 0;
    for (const { chunkX, chunkY } of missing) {
      if (peekDecoOfChunk(chunkX, chunkY)) continue;
      if (regionsComputed >= DECO_REGIONS_PER_FRAME) break;
      computeDecoOfChunk(chunkX, chunkY);
      regionsComputed++;
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
    const { item, variant, x, y, length, rows, level } = instance;
    const sprite = decoSpriteOf(item, x, y, length, rows);
    if (
      sprite.left > bounds.maxX ||
      sprite.right <= bounds.minX ||
      sprite.top > bounds.maxY ||
      sprite.bottom <= bounds.minY
    ) {
      return;
    }
    const shade = shadeForHeightLevel(level);
    const tinted = (image: HTMLImageElement): CanvasImageSource =>
      shade ? tintedSprite(image, shade) : image;

    if (item.strip) {
      const pieces = decoStripImages(item);
      if (!pieces) return;
      for (let column = 0; column < length; column++) {
        const piece = column === 0 ? pieces.left : column === length - 1 ? pieces.right : pieces.middle;
        const origin = camera.worldToScreen(x + column, y, viewportWidth, viewportHeight);
        ctx.drawImage(tinted(piece), origin.x, origin.y, size, size);
      }
      return;
    }

    const image = decoImage(item, variant);
    if (!image) return;

    if (item.area) {
      const source = tinted(image);
      for (let row = 0; row < rows; row++) {
        const pieceRow = row === 0 ? 0 : row === rows - 1 ? 2 : 1;
        for (let column = 0; column < length; column++) {
          const pieceColumn = column === 0 ? 0 : column === length - 1 ? 2 : 1;
          const origin = camera.worldToScreen(x + column, y + row, viewportWidth, viewportHeight);
          ctx.drawImage(
            source,
            pieceColumn * DECO_TILE_SIZE_PX,
            pieceRow * DECO_TILE_SIZE_PX,
            DECO_TILE_SIZE_PX,
            DECO_TILE_SIZE_PX,
            origin.x,
            origin.y,
            size,
            size,
          );
        }
      }
      return;
    }

    const frameWidth = image.naturalWidth / item.frames;
    const origin = camera.worldToScreen(sprite.left, sprite.top, viewportWidth, viewportHeight);
    ctx.drawImage(
      tinted(image),
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
