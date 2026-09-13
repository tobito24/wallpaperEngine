import { CHUNK_SIZE, CHUNK_UNLOAD_DELAY_MS } from '../config/constants';
import type { TileBounds } from '../core/Camera';
import { Chunk } from './Chunk';

export class World {
  private readonly chunks = new Map<string, Chunk>();

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  syncVisibleChunks(bounds: TileBounds, nowMs: number): Chunk[] {
    const minCx = Math.floor(bounds.minX / CHUNK_SIZE);
    const maxCx = Math.floor(bounds.maxX / CHUNK_SIZE);
    const minCy = Math.floor(bounds.minY / CHUNK_SIZE);
    const maxCy = Math.floor(bounds.maxY / CHUNK_SIZE);

    const visible: Chunk[] = [];
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const chunk = this.getOrCreateChunk(cx, cy, nowMs);
        chunk.lastSeenAtMs = nowMs;
        visible.push(chunk);
      }
    }

    this.unloadStale(nowMs);
    return visible;
  }

  private getOrCreateChunk(cx: number, cy: number, nowMs: number): Chunk {
    const key = `${cx},${cy}`;
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy, nowMs);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  private unloadStale(nowMs: number): void {
    for (const [key, chunk] of this.chunks) {
      if (nowMs - chunk.lastSeenAtMs > CHUNK_UNLOAD_DELAY_MS) {
        this.chunks.delete(key);
      }
    }
  }
}
