import { CHUNK_SIZE } from './config.js';

export default class Chunk {
  constructor(chunkX, chunkY, defaultTile, pathTile, isPathFn) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.tiles = new Array(CHUNK_SIZE);
    this.defaultTile = defaultTile;
    this.pathTile = pathTile;
    this.isPathFn = isPathFn;

    for (let y = 0; y < CHUNK_SIZE; y++) {
      this.tiles[y] = new Array(CHUNK_SIZE);
    }

    this.generate();
  }

  generate() {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = this.chunkX * CHUNK_SIZE + x;
        const wy = this.chunkY * CHUNK_SIZE + y;
        const isPath = this.isPathFn(wx, wy);
        this.tiles[y][x] = isPath ? this.pathTile : this.defaultTile;
      }
    }
  }

  getTile(localX, localY) {
    return this.tiles[localY][localX];
  }
}
