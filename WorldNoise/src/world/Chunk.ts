import { CHUNK_SIZE } from '../config/constants';
import { elevationNoise } from '../elevation/elevationNoise';
import { cliffEdgesOf, heightLevelAt } from '../elevation/heightLevel';
import { Tile } from './Tile';

const BORDER_COLOR = '#ffcc00';
const PADDED_SIZE = CHUNK_SIZE + 2;

export class Chunk {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly tiles: readonly Tile[];
  lastSeenAtMs: number;

  constructor(chunkX: number, chunkY: number, nowMs: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.lastSeenAtMs = nowMs;

    const originX = chunkX * CHUNK_SIZE;
    const originY = chunkY * CHUNK_SIZE;
    const elevations = new Float64Array(PADDED_SIZE * PADDED_SIZE);
    const levels = new Uint8Array(PADDED_SIZE * PADDED_SIZE);
    for (let py = 0; py < PADDED_SIZE; py++) {
      for (let px = 0; px < PADDED_SIZE; px++) {
        const worldX = originX + px - 1;
        const worldY = originY + py - 1;
        const index = py * PADDED_SIZE + px;
        elevations[index] = elevationNoise(worldX, worldY);
        levels[index] = heightLevelAt(worldX, worldY, elevations[index]);
      }
    }

    const tiles: Tile[] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const index = (ly + 1) * PADDED_SIZE + (lx + 1);
        const level = levels[index];
        const cliffEdges = cliffEdgesOf(
          level,
          levels[index - PADDED_SIZE],
          levels[index + 1],
          levels[index + PADDED_SIZE],
          levels[index - 1],
        );
        tiles.push(new Tile(originX + lx, originY + ly, elevations[index], level, cliffEdges));
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
