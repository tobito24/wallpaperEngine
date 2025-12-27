import { TILE_SIZE, CHUNK_SIZE } from './config.js';
import Chunk from './chunk.js';
import { tileTypes, getTileByName } from './tiles.js';

export default class World {
  constructor() {
    this.time = 0;
    this.chunks = new Map();
    this.defaultTile = getTileByName('grass') || tileTypes[0];
    this.pathTile = getTileByName('dirt') || this.defaultTile;
  }

  update(dt) {
    this.time += dt;
  }

  isPath(x, y) {
    // Temporary simple path: a winding corridor for demo movement.
    const band = Math.floor(Math.sin(x * 0.15) * 3);
    return Math.abs(y - band) <= 1;
  }

  getChunk(cx, cy) {
    const key = `${cx},${cy}`;
    if (!this.chunks.has(key)) {
      this.chunks.set(
        key,
        new Chunk(cx, cy, this.defaultTile, this.pathTile, this.isPath.bind(this))
      );
    }
    return this.chunks.get(key);
  }

  getTileAt(wx, wy) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cy = Math.floor(wy / CHUNK_SIZE);
    const lx = wx - cx * CHUNK_SIZE;
    const ly = wy - cy * CHUNK_SIZE;
    const chunk = this.getChunk(cx, cy);
    return chunk.getTile(lx, ly);
  }

  render(ctx, view, camera) {
    const startX = Math.floor(camera.x / TILE_SIZE);
    const startY = Math.floor(camera.y / TILE_SIZE);
    const cols = Math.ceil(view.width / TILE_SIZE) + 2;
    const rows = Math.ceil(view.height / TILE_SIZE) + 2;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const wx = startX + x;
        const wy = startY + y;
        const tile = this.getTileAt(wx, wy);
        if (!tile) {
          continue;
        }

        const dx = wx * TILE_SIZE - camera.x;
        const dy = wy * TILE_SIZE - camera.y;
        tile.draw(ctx, dx, dy, TILE_SIZE);
      }
    }
  }
}
