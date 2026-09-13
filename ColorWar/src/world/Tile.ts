import type { TileColor } from '../simulation/Color';
import { colorHex } from '../simulation/Color';

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  color: TileColor;

  constructor(worldX: number, worldY: number, color: TileColor = 'none') {
    this.worldX = worldX;
    this.worldY = worldY;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, size: number): void {
    ctx.fillStyle = colorHex(this.color);
    ctx.fillRect(screenX, screenY, size, size);
  }
}
