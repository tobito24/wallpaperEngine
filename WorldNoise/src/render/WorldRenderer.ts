import {
  ANIMATED_AUTOTILE_FRAME_DURATION_MS,
  CHUNK_SIZE,
  OVERVIEW_BELOW_TILE_SIZE_PX,
} from '../config/constants';
import type { Camera } from '../core/Camera';
import type { World } from '../world/World';
import { drawCrossingMarkers } from './crossingDebug';
import { DecoRenderer } from './DecoRenderer';
import { drawDecoFootprints } from './decoDebug';
import { OverviewRenderer } from './OverviewRenderer';
import { drawTownPlans } from './townPlanDebug';

export class WorldRenderer {
  private readonly decoRenderer = new DecoRenderer();
  private readonly overviewRenderer = new OverviewRenderer();

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    world: World,
    viewportWidth: number,
    viewportHeight: number,
    nowMs: number,
    debugEnabled: boolean,
  ): void {
    ctx.imageSmoothingEnabled = false;
    const bounds = camera.getVisibleTileBounds(viewportWidth, viewportHeight);
    if (camera.tileSize < OVERVIEW_BELOW_TILE_SIZE_PX) {
      this.overviewRenderer.render(ctx, camera, bounds, viewportWidth, viewportHeight);
      world.unloadStale(nowMs);
      return;
    }
    const size = Math.ceil(camera.tileSize);
    const chunks = world.syncVisibleChunks(bounds, nowMs);
    const animationFrame = Math.floor(nowMs / ANIMATED_AUTOTILE_FRAME_DURATION_MS);

    for (const chunk of chunks) {
      for (const tile of chunk.tiles) {
        if (tile.worldX < bounds.minX || tile.worldX > bounds.maxX) continue;
        if (tile.worldY < bounds.minY || tile.worldY > bounds.maxY) continue;

        const screen = camera.worldToScreen(tile.worldX, tile.worldY, viewportWidth, viewportHeight);
        tile.draw(ctx, screen.x, screen.y, size, animationFrame);
      }
    }

    this.decoRenderer.render(ctx, camera, bounds, viewportWidth, viewportHeight, size, animationFrame);

    if (!debugEnabled) return;

    drawCrossingMarkers(ctx, camera, viewportWidth, viewportHeight, size);
    drawDecoFootprints(ctx, camera, chunks, viewportWidth, viewportHeight, size);
    drawTownPlans(ctx, camera, bounds, viewportWidth, viewportHeight, size);

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
