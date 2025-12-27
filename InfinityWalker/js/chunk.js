import { CHUNK_SIZE, DIRECTION } from './config.js';
import WorldPiece from './piece.js';

export default class Chunk {
  constructor(chunkX, chunkY, neighborChunks = {}) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.neighborChunks = neighborChunks; // { north: Chunk, east: Chunk, south: Chunk, west: Chunk }
    this.chunkPieces = new Array(CHUNK_SIZE);
    this.lastPieceChosen = null;
    this.isCollapsed = false;

    for (let y = 0; y < CHUNK_SIZE; y++) {
      this.chunkPieces[y] = new Array(CHUNK_SIZE);
    }

    this.createChunkPieces();
  }

  createChunkPieces() {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = this.chunkX * CHUNK_SIZE + x;
        const wy = this.chunkY * CHUNK_SIZE + y;
        this.chunkPieces[y][x] = new WorldPiece(wx, wy);
      }
    }

    const northChunk = this.neighborChunks.north;
    const eastChunk = this.neighborChunks.east;
    const southChunk = this.neighborChunks.south;
    const westChunk = this.neighborChunks.west;

    // Set neighborhood relationships
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const northPiece = y > 0
          ? this.chunkPieces[y - 1][x]
          : (northChunk ? northChunk.chunkPieces[CHUNK_SIZE - 1][x] : null);
        const eastPiece = x < CHUNK_SIZE - 1
          ? this.chunkPieces[y][x + 1]
          : (eastChunk ? eastChunk.chunkPieces[y][0] : null);
        const southPiece = y < CHUNK_SIZE - 1
          ? this.chunkPieces[y + 1][x]
          : (southChunk ? southChunk.chunkPieces[0][x] : null);
        const westPiece = x > 0
          ? this.chunkPieces[y][x - 1]
          : (westChunk ? westChunk.chunkPieces[y][CHUNK_SIZE - 1] : null);

        this.chunkPieces[y][x].setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece);
      }
    }

    // update border pieces entropy and relationships
    if (northChunk) {
      const neighborRow = northChunk.chunkPieces[CHUNK_SIZE - 1];
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const piece = this.chunkPieces[0][x];
        const neighborPiece = neighborRow[x];
        neighborPiece.southPiece = piece;
        if (!neighborPiece.isUntouched) piece.updateEntropy();
      }
    }
    if (eastChunk) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const piece = this.chunkPieces[y][CHUNK_SIZE - 1];
        const neighborPiece = eastChunk.chunkPieces[y][0];
        neighborPiece.westPiece = piece;
        if (!neighborPiece.isUntouched) piece.updateEntropy();
      }
    }
    if (southChunk) {
      const neighborRow = southChunk.chunkPieces[0];
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const piece = this.chunkPieces[CHUNK_SIZE - 1][x];
        const neighborPiece = neighborRow[x];
        neighborPiece.northPiece = piece;
        if (!neighborPiece.isUntouched) piece.updateEntropy();
      }
    }
    if (westChunk) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const piece = this.chunkPieces[y][0];
        const neighborPiece = westChunk.chunkPieces[y][CHUNK_SIZE - 1];
        neighborPiece.eastPiece = piece;
        if (!neighborPiece.isUntouched) piece.updateEntropy();
      }
    }
  }

  choosePieceTiles() {
    let minEntropy = Infinity;
    let candidates = [];

    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const piece = this.chunkPieces[y][x];
        const entropy = piece.getEntropy();

        if (entropy > 1 && entropy < minEntropy) {
          minEntropy = entropy;
          candidates = [piece];
        } else if (entropy === minEntropy) {
          candidates.push(piece);
        }
      }
    }

    if (candidates.length === 0) {
      return false;
    }

    // choose a random candidate among those with the lowest entropy
    const chosenIndex = Math.floor(Math.random() * candidates.length);
    const chosenPiece = candidates[chosenIndex];
    chosenPiece.chooseTile(this.lastPieceChosen);
    this.lastPieceChosen = chosenPiece;

    return true;
  }

  getPiece(localX, localY) {
    return this.chunkPieces[localY][localX];
  }
}
