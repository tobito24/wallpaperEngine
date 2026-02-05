import { TILE_SIZE, CHUNK_SIZE, WFC_TIME_BUDGET_MS } from './config.js';
import Chunk from './chunk.js';

export default class World {
  constructor(playerX = 0, playerY = 0) {
    this.time = 0;
    this.chunks = new Map();
    this.chunkQueue = new Map();
    this.currentProcessedChunk = null;

    this.getChunk(playerX, playerY);
  }

  update(playerX = 0, playerY = 0) {
    this.processChunkQueue(playerX, playerY);
  }

  getChunk(cx, cy, withCreate = true) {
    const key = `${cx},${cy}`;
    if (!this.chunks.has(key) && withCreate) {
      const chunk = new Chunk(
        cx, cy,
        {
          north: this.getChunk(cx, cy - 1, false),
          east: this.getChunk(cx + 1, cy, false),
          south: this.getChunk(cx, cy + 1, false),
          west: this.getChunk(cx - 1, cy, false)
        }
      );
      this.chunks.set(key, chunk);
      this.chunkQueue.set(key, chunk);
    }
    return this.chunks.get(key) || null;
  }

  getPieceAt(wx, wy) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = wx - cx * CHUNK_SIZE;
    const ly = wy - cy * CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    return chunk.getPiece(lx, ly);
  }

  render(ctx, view, camera) {
    const camX = Math.floor(camera.x);
    const camY = Math.floor(camera.y);
    const startX = Math.floor(camX / TILE_SIZE);
    const startY = Math.floor(camY / TILE_SIZE);
    const cols = Math.ceil(view.width / TILE_SIZE) + 2;
    const rows = Math.ceil(view.height / TILE_SIZE) + 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const wx = startX + x;
        const wy = startY + y;
        const tile = this.getPieceAt(wx, wy);
        if (!tile) {
          continue;
        }

        const dx = wx * TILE_SIZE - camX;
        const dy = wy * TILE_SIZE - camY;
        tile.draw(ctx, dx, dy, TILE_SIZE);
      }
    }
  }

  processChunkQueue(playerX, playerY) {
    if (this.currentProcessedChunk === null) {
      this.setCurrentProcessedChunk(playerX, playerY);
      return;
    }

    const start = performance.now();

    while (performance.now() - start < WFC_TIME_BUDGET_MS) {
      if (!this.currentProcessedChunk.collapseRandomPiece()) {
        this.currentProcessedChunk = null;
        break;
      }
    }
  }

  setCurrentProcessedChunk(playerX, playerY) {
    if (this.chunkQueue.size === 0) {
      return;
    }

    let bestKey = 0;
    let lowestDist = Infinity;
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcy = Math.floor(playerY / CHUNK_SIZE);

    for (const [key, candidate] of this.chunkQueue.entries()) {
      const dx = candidate.chunkX - pcx;
      const dy = candidate.chunkY - pcy;
      const dist = dx * dx + dy * dy;
      if (dist < lowestDist) {
        lowestDist = dist;
        bestKey = key;
      }
    }

    const chunk = this.chunkQueue.get(bestKey);
    if (!chunk) {
      return;
    }

    this.currentProcessedChunk = chunk;
    this.chunkQueue.delete(bestKey);
  }
}
