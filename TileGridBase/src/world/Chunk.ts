import { CHUNK_SIZE } from '../config/constants';
import { Tile } from './Tile';

const BORDER_COLOR = '#ffcc00';

export class Chunk {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly tiles: readonly Tile[];
  lastSeenAtMs: number;

  constructor(chunkX: number, chunkY: number, nowMs: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.lastSeenAtMs = nowMs;

    const tiles: Tile[] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        tiles.push(new Tile(chunkX * CHUNK_SIZE + lx, chunkY * CHUNK_SIZE + ly));
      }
    }
    this.tiles = tiles;
  }

  drawBorder(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, sizePx: number): void {
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX + 0.5, screenY + 0.5, sizePx - 1, sizePx - 1);
  }
}
