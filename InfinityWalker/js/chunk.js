import {
  CHUNK_SIZE,
  CHUNK_STATE,
  LAYER,
  WORLDPIECE_STATE
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

    this.chunkState = CHUNK_STATE.WAITING;
    this.baseCandidates = new Set();
    this.overlayCandidates = new Set();
    this.decoCandidates = new Set();

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
        const piece = new WorldPiece(worldX, worldY, isPath);
        this.chunkPieces[y][x] = piece;
        this.baseCandidates.add(piece);
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
        if (!neighborPiece.isUntouched()) piece.updateEntropy();
      }
    }
    if (eastChunk) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const piece = this.chunkPieces[y][CHUNK_SIZE - 1];
        const neighborPiece = eastChunk.chunkPieces[y][0];
        neighborPiece.westPiece = piece;
        if (!neighborPiece.isUntouched()) piece.updateEntropy();
      }
    }
    if (southChunk) {
      const neighborRow = southChunk.chunkPieces[0];
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const piece = this.chunkPieces[CHUNK_SIZE - 1][x];
        const neighborPiece = neighborRow[x];
        neighborPiece.northPiece = piece;
        if (!neighborPiece.isUntouched()) piece.updateEntropy();
      }
    }
    if (westChunk) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const piece = this.chunkPieces[y][0];
        const neighborPiece = westChunk.chunkPieces[y][CHUNK_SIZE - 1];
        neighborPiece.eastPiece = piece;
        if (!neighborPiece.isUntouched()) piece.updateEntropy();
      }
    }
  }

  getChunkPieces() {
    switch (this.chunkState) {
      case CHUNK_STATE.BASE_GENERATING:
        if (this.baseCandidates.size === 0) {
          this.chunkState = CHUNK_STATE.OVERLAY_GENERATING;
          return this.getChunkPieces();
        }
        return Array.from(this.baseCandidates);
      case CHUNK_STATE.OVERLAY_GENERATING:
        if (this.overlayCandidates.size === 0) {
          this.chunkState = CHUNK_STATE.DECO_GENERATING;
          return this.getChunkPieces();
        }
        return Array.from(this.overlayCandidates);
      case CHUNK_STATE.DECO_GENERATING:
        if (this.decoCandidates.size === 0) {
          this.chunkState = CHUNK_STATE.COLLAPSED;
          return null;
        }
        return Array.from(this.decoCandidates);
      default:
        return null;
    }
  }


  collapseRandomPiece() {
    if (this.chunkState === CHUNK_STATE.WAITING) {
      this.chunkState = CHUNK_STATE.BASE_GENERATING;
    }

    const chunkPieces = this.getChunkPieces();
    if (chunkPieces === null) {
      return false;
    }

    let minEntropy = Infinity;
    let candidates = [];

    for (let i = 0; i < chunkPieces.length; i++) {
      const piece = chunkPieces[i];
      const entropy = piece.getEntropy(
        this.chunkState === CHUNK_STATE.BASE_GENERATING ? LAYER.BASE :
          this.chunkState === CHUNK_STATE.OVERLAY_GENERATING ? LAYER.OVERLAY :
            LAYER.DECO
      );

      if (entropy === 1) {
        this.collapsePiece(piece); // immediate collapse
        return true;
      }

      if (entropy < minEntropy) {
        minEntropy = entropy;
        candidates = [piece];
      } else if (entropy === minEntropy) {
        candidates.push(piece);
      }
    }

    // choose a random candidate among those with the lowest entropy
    const chosenIndex = Math.floor(Math.random() * candidates.length);
    const chosenPiece = candidates[chosenIndex];
    this.collapsePiece(chosenPiece);

    return true;
  }

  collapsePiece(piece) {
    const prevState = piece.currentState;
    piece.collapse();
    this.updateCandidateSets(piece, prevState);
  }

  updateCandidateSets(piece, prevState) {
    const nextState = piece.currentState;

    if (prevState === WORLDPIECE_STATE.UNTOUCHED || prevState === WORLDPIECE_STATE.TOUCHED) {
      this.baseCandidates.delete(piece);
    }

    if (prevState === WORLDPIECE_STATE.BASE_GENERATED) {
      this.overlayCandidates.delete(piece);
    }

    if (prevState === WORLDPIECE_STATE.OVERLAY_GENERATED) {
      this.decoCandidates.delete(piece);
    }

    if (nextState === WORLDPIECE_STATE.BASE_GENERATED) {
      this.overlayCandidates.add(piece);
    }

    if (nextState === WORLDPIECE_STATE.OVERLAY_GENERATED) {
      this.decoCandidates.add(piece);
    }
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
