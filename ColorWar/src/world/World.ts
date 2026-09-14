import { CHUNK_SIZE, CHUNK_UNLOAD_DELAY_MS } from '../config/constants';
import type { TileBounds } from '../core/Camera';
import { DEFAULT_PRESET } from '../simulation/presets';
import type { WorldPreset } from '../simulation/presets';
import { Chunk } from './Chunk';
import type { Tile } from './Tile';

export class World {
  private readonly chunks = new Map<string, Chunk>();
  private preset: WorldPreset = DEFAULT_PRESET;

  get loadedChunkCount(): number {
    return this.chunks.size;
  }

  setPreset(preset: WorldPreset): void {
    this.preset = preset;
    for (const chunk of this.chunks.values()) {
      chunk.applyPreset(preset);
    }
  }

  getLoadedChunks(): IterableIterator<Chunk> {
    return this.chunks.values();
  }

  getLoadedTile(worldX: number, worldY: number): Tile | null {
    const cx = Math.floor(worldX / CHUNK_SIZE);
    const cy = Math.floor(worldY / CHUNK_SIZE);
    const chunk = this.chunks.get(`${cx},${cy}`);
    if (!chunk) return null;
    return chunk.getLocalTile(worldX - cx * CHUNK_SIZE, worldY - cy * CHUNK_SIZE);
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
      chunk = new Chunk(cx, cy, nowMs, this.preset);
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
