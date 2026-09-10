import { CHUNK_SIZE } from '../../config/constants';
import { Chunk } from './Chunk';
import type { WorldTile } from '../grid/WorldTile';

/** Loads/holds chunks on demand and drops ones that fall outside the visible area, keyed by "cx,cy". */
export class WorldStreamer {
  private readonly chunks = new Map<string, Chunk>();

  private key(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  private getOrCreateChunk(chunkX: number, chunkY: number): Chunk {
    const key = this.key(chunkX, chunkY);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(chunkX, chunkY);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getTile(worldX: number, worldY: number): WorldTile {
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const localX = worldX - chunkX * CHUNK_SIZE;
    const localY = worldY - chunkY * CHUNK_SIZE;
    return this.getOrCreateChunk(chunkX, chunkY).getTile(localX, localY);
  }

  /** Drops chunks fully outside the given world-tile bounds, to bound memory while panning/zooming. */
  unloadOutside(minWorldX: number, minWorldY: number, maxWorldX: number, maxWorldY: number): void {
    const minChunkX = Math.floor(minWorldX / CHUNK_SIZE) - 1;
    const minChunkY = Math.floor(minWorldY / CHUNK_SIZE) - 1;
    const maxChunkX = Math.floor(maxWorldX / CHUNK_SIZE) + 1;
    const maxChunkY = Math.floor(maxWorldY / CHUNK_SIZE) + 1;

    for (const [key, chunk] of this.chunks) {
      if (
        chunk.chunkX < minChunkX ||
        chunk.chunkX > maxChunkX ||
        chunk.chunkY < minChunkY ||
        chunk.chunkY > maxChunkY
      ) {
        this.chunks.delete(key);
      }
    }
  }

  /** Drops all loaded chunks, forcing regeneration — used after generationConfig changes (e.g. debug tuning). */
  reset(): void {
    this.chunks.clear();
  }
}
