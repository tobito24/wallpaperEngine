import { TILESET_PATH } from '../config/constants';

export class TilesetImage {
  private readonly image = new Image();
  private ready = false;

  constructor() {
    this.image.onload = () => {
      this.ready = true;
    };
    this.image.src = TILESET_PATH;
  }

  isReady(): boolean {
    return this.ready;
  }

  drawSprite(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    size: number,
    col: number,
    row: number,
    sourceTileSize: number,
  ): void {
    if (!this.ready) return;
    ctx.drawImage(
      this.image,
      col * sourceTileSize,
      row * sourceTileSize,
      sourceTileSize,
      sourceTileSize,
      dx,
      dy,
      size,
      size,
    );
  }
}
