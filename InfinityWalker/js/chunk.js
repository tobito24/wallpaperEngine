import {
  CHUNK_SIZE,
} from './config.js';
import WorldPiece from './piece.js';

export default class Chunk {
  static chunkCount = 0;

  constructor(chunkX, chunkY, neighborChunks = {}) {
    Chunk.chunkCount++;
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.neighborChunks = neighborChunks; // { north: Chunk, east: Chunk, south: Chunk, west: Chunk }

    this.chunkEntrancePoints = {
      north: null,
      east: null,
      south: null,
      west: null
    };

    this.chunkPieces = new Array(CHUNK_SIZE);
    for (let y = 0; y < CHUNK_SIZE; y++) {
      this.chunkPieces[y] = new Array(CHUNK_SIZE);
    }

    this.createChunkPieces();
  }

  createChunkPieces() {
    const pathCells = new Set();
    this.createPathsFromNeighbors(pathCells);

    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const worldX = this.chunkX * CHUNK_SIZE + x;
        const worldY = this.chunkY * CHUNK_SIZE + y;
        const isPath = pathCells.has(this.getCellKey(x, y));
        this.chunkPieces[y][x] = new WorldPiece(worldX, worldY, isPath);
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
        if (piece.isCollapsed()) {
          continue;
        }
        const entropy = piece.getEntropy();

        if (entropy < minEntropy) {
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
    chosenPiece.chooseTile();

    return true;
  }

  getPiece(localX, localY) {
    return this.chunkPieces[localY][localX];
  }

  // TODO: Improve path generation and outscource to utility
  createPathsFromNeighbors(pathCells) {
    const entries = this.getNeighborEntrancePoints();
    if (Chunk.chunkCount === 1 && entries.length === 0) {
      // First chunk, create a random entry point
      entries.push({ side: 'north', x: 0, y: 0 });
    }
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const exitSide = this.pickExitSide(entry.side);
      const exit = this.getExitPoint(exitSide);
      this.addPathCells(entry.x, entry.y, exit.x, exit.y, pathCells);
    }
  }

  getNeighborEntrancePoints() {
    const entries = [];
    const northChunk = this.neighborChunks.north;
    const eastChunk = this.neighborChunks.east;
    const southChunk = this.neighborChunks.south;
    const westChunk = this.neighborChunks.west;

    if (northChunk) {
      const point = northChunk.chunkEntrancePoints.south;
      if (point !== null) {
        entries.push({ side: 'north', x: point, y: 0 });
      }
    }
    if (eastChunk) {
      const point = eastChunk.chunkEntrancePoints.west;
      if (point !== null) {
        entries.push({ side: 'east', x: CHUNK_SIZE - 1, y: point });
      }
    }
    if (southChunk) {
      const point = southChunk.chunkEntrancePoints.north;
      if (point !== null) {
        entries.push({ side: 'south', x: point, y: CHUNK_SIZE - 1 });
      }
    }
    if (westChunk) {
      const point = westChunk.chunkEntrancePoints.east;
      if (point !== null) {
        entries.push({ side: 'west', x: 0, y: point });
      }
    }

    return entries;
  }

  pickExitSide(entrySide) {
    const sides = ['north', 'east', 'south', 'west'];
    let idx = 0;
    for (let i = 0; i < sides.length; i++) {
      if (sides[i] === entrySide) {
        idx = i;
        break;
      }
    }
    sides.splice(idx, 1);
    const available = [];
    for (let i = 0; i < sides.length; i++) {
      if (this.chunkEntrancePoints[sides[i]] === null) {
        available.push(sides[i]);
      }
    }
    if (available.length > 0) {
      return available[Math.floor(Math.random() * available.length)];
    }
    return sides[Math.floor(Math.random() * sides.length)];
  }

  getExitPoint(side) {
    let offset = this.chunkEntrancePoints[side];
    if (offset === null) {
      offset = Math.floor(Math.random() * CHUNK_SIZE);
      this.chunkEntrancePoints[side] = offset;
    }
    switch (side) {
      case 'north':
        return { x: offset, y: 0, offset };
      case 'east':
        return { x: CHUNK_SIZE - 1, y: offset, offset };
      case 'south':
        return { x: offset, y: CHUNK_SIZE - 1, offset };
      default:
        return { x: 0, y: offset, offset };
    }
  }

  addPathCells(sx, sy, ex, ey, pathCells) {
    let x = sx;
    let y = sy;
    pathCells.add(this.getCellKey(x, y));

    if (Math.random() < 0.5) {
      const stepX = ex > x ? 1 : -1;
      while (x !== ex) {
        x += stepX;
        pathCells.add(this.getCellKey(x, y));
      }
      const stepY = ey > y ? 1 : -1;
      while (y !== ey) {
        y += stepY;
        pathCells.add(this.getCellKey(x, y));
      }
      return;
    }

    const stepY = ey > y ? 1 : -1;
    while (y !== ey) {
      y += stepY;
      pathCells.add(this.getCellKey(x, y));
    }
    const stepX = ex > x ? 1 : -1;
    while (x !== ex) {
      x += stepX;
      pathCells.add(this.getCellKey(x, y));
    }
  }

  getCellKey(x, y) {
    return `${x},${y}`;
  }
}
