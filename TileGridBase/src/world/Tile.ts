const COLOR_EVEN = '#3a3f47';
const COLOR_ODD = '#2c3036';

export class Tile {
  readonly worldX: number;
  readonly worldY: number;

  constructor(worldX: number, worldY: number) {
    this.worldX = worldX;
    this.worldY = worldY;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, size: number): void {
    const isEven = (this.worldX + this.worldY) % 2 === 0;
    ctx.fillStyle = isEven ? COLOR_EVEN : COLOR_ODD;
    ctx.fillRect(screenX, screenY, size, size);
  }
}
