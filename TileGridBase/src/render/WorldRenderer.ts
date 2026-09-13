import type { Camera } from '../core/Camera';

const COLOR_EVEN = '#3a3f47';
const COLOR_ODD = '#2c3036';

/** Placeholder world renderer: an even/odd checkerboard over world tile coordinates. */
export class WorldRenderer {
  render(ctx: CanvasRenderingContext2D, camera: Camera, viewportWidth: number, viewportHeight: number): void {
    const bounds = camera.getVisibleTileBounds(viewportWidth, viewportHeight);
    const size = Math.ceil(camera.tileSize);

    for (let ty = bounds.minY; ty <= bounds.maxY; ty++) {
      for (let tx = bounds.minX; tx <= bounds.maxX; tx++) {
        const isEven = (tx + ty) % 2 === 0;
        ctx.fillStyle = isEven ? COLOR_EVEN : COLOR_ODD;

        const screen = camera.worldToScreen(tx, ty, viewportWidth, viewportHeight);
        ctx.fillRect(screen.x, screen.y, size, size);
      }
    }
  }
}
