import {
  CHUNK_SIZE,
  CHUNK_STATE,
  DIRECTION,
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

    this.initChunk();
  }

  getPiece(localX, localY) {
    return this.chunkPieces[localY][localX];
  }

  initChunk() {
    this.chunkState = CHUNK_STATE.WAITING;
    this.baseCandidates = new Set();
    this.overlayCandidates = new Set();
    this.decoCandidates = new Set();

    this.chunkPieces = new Array(CHUNK_SIZE);
    for (let y = 0; y < CHUNK_SIZE; y++) {
      this.chunkPieces[y] = new Array(CHUNK_SIZE);
    }

    this.borderPieceSet = new Set();

    this.createChunkPieces();
  }

  createChunkPieces() {
    for (let y = 0; y < CHUNK_SIZE; y++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const worldX = this.chunkX * CHUNK_SIZE + x;
        const worldY = this.chunkY * CHUNK_SIZE + y;
        const chunkBorder = this.getChunkBorder(x, y);
        const piece = new WorldPiece(worldX, worldY, chunkBorder);
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
        const chunkBorder = this.chunkPieces[y][x].chunkBorder;

        const northPiece = chunkBorder.north ?
          (northChunk ? northChunk.chunkPieces[CHUNK_SIZE - 1][x] : null) :
          this.chunkPieces[y - 1][x];
        const eastPiece = chunkBorder.east ?
          (eastChunk ? eastChunk.chunkPieces[y][0] : null) :
          this.chunkPieces[y][x + 1];
        const southPiece = chunkBorder.south ?
          (southChunk ? southChunk.chunkPieces[0][x] : null) :
          this.chunkPieces[y + 1][x];
        const westPiece = chunkBorder.west ?
          (westChunk ? westChunk.chunkPieces[y][CHUNK_SIZE - 1] : null) :
          this.chunkPieces[y][x - 1];

        this.chunkPieces[y][x].setNeighborhoodRelationship(northPiece, eastPiece, southPiece, westPiece);

        const isBorderPiece = chunkBorder.north || chunkBorder.east || chunkBorder.south || chunkBorder.west;
        if (!isBorderPiece) {
          continue;
        }

        this.borderPieceSet.add(this.chunkPieces[y][x]);

        if (northPiece && chunkBorder.north) {
          northPiece.southPiece = this.chunkPieces[y][x];
        }
        if (eastPiece && chunkBorder.east) {
          eastPiece.westPiece = this.chunkPieces[y][x];
        }
        if (southPiece && chunkBorder.south) {
          southPiece.northPiece = this.chunkPieces[y][x];
        }
        if (westPiece && chunkBorder.west) {
          westPiece.eastPiece = this.chunkPieces[y][x];
        }
      }
    }
  }

  updateBorderPieces() {
    this.borderPieceSet.forEach(piece => {
      piece.updateEntropy();
    });
  }

  getChunkBorder(cx, cy) {
    const border = {
      north: false,
      east: false,
      south: false,
      west: false
    };
    if (cx === 0) {
      border.west = true;
    }
    if (cx === CHUNK_SIZE - 1) {
      border.east = true;
    }
    if (cy === 0) {
      border.north = true;
    }
    if (cy === CHUNK_SIZE - 1) {
      border.south = true;
    }
    return border;
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
      this.updateBorderPieces();
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
    const previousPieceState = piece.currentState;
    piece.collapse();
    this.updateCandidateSets(piece, previousPieceState);
  }

  updateCandidateSets(piece, previousPieceState) {
    const currentPieceState = piece.currentState;

    if (previousPieceState === WORLDPIECE_STATE.UNTOUCHED || previousPieceState === WORLDPIECE_STATE.TOUCHED) {
      this.baseCandidates.delete(piece);
    }

    if (previousPieceState === WORLDPIECE_STATE.BASE_GENERATED) {
      this.overlayCandidates.delete(piece);
    }

    if (previousPieceState === WORLDPIECE_STATE.OVERLAY_GENERATED) {
      this.decoCandidates.delete(piece);
    }

    if (currentPieceState === WORLDPIECE_STATE.BASE_GENERATED) {
      this.overlayCandidates.add(piece);
    }

    if (currentPieceState === WORLDPIECE_STATE.OVERLAY_GENERATED) {
      this.decoCandidates.add(piece);
    }

    if (currentPieceState === WORLDPIECE_STATE.COLLAPSED || currentPieceState === WORLDPIECE_STATE.ERROR) {
      this.baseCandidates.delete(piece);
      this.overlayCandidates.delete(piece);
      this.decoCandidates.delete(piece);
    }
  }
}
