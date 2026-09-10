import { generateChunk } from '../generate/generateChunk';
import type { WorldTile } from '../grid/WorldTile';

/**
 * A generated CHUNK_SIZE x CHUNK_SIZE grid of tiles. Unlike InfinityWalker's WFC chunks, generation
 * here is a single direct pass (noise -> biome -> tile) — no incremental collapse, no neighbor state,
 * no entropy bookkeeping, because each tile's content only ever depends on its own world coordinates.
 */
export class Chunk {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly tiles: WorldTile[][];

  constructor(chunkX: number, chunkY: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.tiles = generateChunk(chunkX, chunkY);
  }

  getTile(localX: number, localY: number): WorldTile {
    return this.tiles[localY]![localX]!;
  }
}
