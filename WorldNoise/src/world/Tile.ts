import { colorForElevation } from '../elevation/color';

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  readonly elevation: number;

  constructor(worldX: number, worldY: number, elevation: number) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.elevation = elevation;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, size: number): void {
    ctx.fillStyle = colorForElevation(this.elevation);
    ctx.fillRect(screenX, screenY, size, size);
  }
}
