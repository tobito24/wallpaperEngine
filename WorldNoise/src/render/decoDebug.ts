import type { Camera } from '../core/Camera';
import { peekDecoOfChunk } from '../deco/decoPlacement';
import type { DecoInstance } from '../deco/decoPlacement';
import type { Chunk } from '../world/Chunk';

const FOOTPRINT_COLOR = '#00e5ff';
const SPRITE_COLOR = 'rgba(255, 255, 255, 0.45)';

function drawRectangle(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
  size: number,
  rectangle: { left: number; top: number; width: number; height: number },
): void {
  const origin = camera.worldToScreen(rectangle.left, rectangle.top, viewportWidth, viewportHeight);
  ctx.strokeRect(origin.x + 0.5, origin.y + 0.5, rectangle.width * size - 1, rectangle.height * size - 1);
}

function drawInstance(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  viewportWidth: number,
  viewportHeight: number,
  size: number,
  instance: DecoInstance,
): void {
  const { item, x, y } = instance;
  ctx.strokeStyle = SPRITE_COLOR;
  ctx.lineWidth = 1;
  drawRectangle(ctx, camera, viewportWidth, viewportHeight, size, {
    left: x - item.anchorColumn,
    top: y + item.footprint.height - item.sprite.height,
    width: item.sprite.width,
    height: item.sprite.height,
  });
  ctx.strokeStyle = FOOTPRINT_COLOR;
  ctx.lineWidth = 2;
  drawRectangle(ctx, camera, viewportWidth, viewportHeight, size, {
    left: x,
    top: y,
    width: item.footprint.width,
    height: item.footprint.height,
  });
}

export function drawDecoFootprints(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  chunks: readonly Chunk[],
  viewportWidth: number,
  viewportHeight: number,
  size: number,
): void {
  for (const chunk of chunks) {
    for (const instance of peekDecoOfChunk(chunk.chunkX, chunk.chunkY) ?? []) {
      drawInstance(ctx, camera, viewportWidth, viewportHeight, size, instance);
    }
  }
}
