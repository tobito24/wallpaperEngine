import { CHUNK_SIZE } from '../config/constants';
import type { Camera } from '../core/Camera';
import type { World } from '../world/World';

export class WorldRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    world: World,
    viewportWidth: number,
    viewportHeight: number,
    nowMs: number,
    debugEnabled: boolean,
  ): void {
    const bounds = camera.getVisibleTileBounds(viewportWidth, viewportHeight);
    const size = Math.ceil(camera.tileSize);
    const chunks = world.syncVisibleChunks(bounds, nowMs);

    for (const chunk of chunks) {
      for (const tile of chunk.tiles) {
        if (tile.worldX < bounds.minX || tile.worldX > bounds.maxX) continue;
        if (tile.worldY < bounds.minY || tile.worldY > bounds.maxY) continue;

        const screen = camera.worldToScreen(tile.worldX, tile.worldY, viewportWidth, viewportHeight);
        tile.draw(ctx, screen.x, screen.y, size);
      }
    }

    if (!debugEnabled) return;

    for (const chunk of chunks) {
      const origin = camera.worldToScreen(
        chunk.chunkX * CHUNK_SIZE,
        chunk.chunkY * CHUNK_SIZE,
        viewportWidth,
        viewportHeight,
      );
      chunk.drawBorder(ctx, origin.x, origin.y, CHUNK_SIZE * size);
    }
  }
}
