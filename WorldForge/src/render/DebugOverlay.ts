import type { Camera } from '../core/Camera';
import type { WorldStreamer } from '../world/chunk/WorldStreamer';

export type DebugMode = 'tiles' | 'elevation' | 'moisture';

const MODE_ORDER: DebugMode[] = ['tiles', 'elevation', 'moisture'];

/** Elevation/moisture heatmap toggle for visually tuning the redistribution curve, plus a small HUD. */
export class DebugOverlay {
  mode: DebugMode = 'tiles';

  cycleMode(): void {
    this.mode = MODE_ORDER[(MODE_ORDER.indexOf(this.mode) + 1) % MODE_ORDER.length]!;
  }

  renderHeatmap(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    streamer: WorldStreamer,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    if (this.mode === 'tiles') return;

    const bounds = camera.getVisibleTileBounds(viewportWidth, viewportHeight);
    for (let worldY = bounds.minY; worldY <= bounds.maxY; worldY++) {
      for (let worldX = bounds.minX; worldX <= bounds.maxX; worldX++) {
        const tile = streamer.getTile(worldX, worldY);
        const value = this.mode === 'elevation' ? tile.elevation : tile.moisture;
        const shade = Math.round(value * 255);
        const screen = camera.worldToScreen(worldX, worldY, viewportWidth, viewportHeight);

        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.fillRect(screen.x, screen.y, camera.tileSize, camera.tileSize);
      }
    }
  }

  renderHud(ctx: CanvasRenderingContext2D, lines: string[]): void {
    ctx.save();
    ctx.font = '14px monospace';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(4, 4, 340, lines.length * 16 + 8);
    ctx.fillStyle = '#7CFC7C';
    lines.forEach((line, i) => ctx.fillText(line, 10, 10 + i * 16));
    ctx.restore();
  }
}
