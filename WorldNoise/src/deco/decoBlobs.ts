import {
  DECO_BLOB_CELL_TILES,
  DECO_BLOB_CHANCE,
  DECO_BLOB_EDGE_NOISE_FREQUENCY,
  DECO_BLOB_MAX_DITHER,
  DECO_BLOB_MAX_RADIUS_TILES,
  DECO_BLOB_MAX_ROUGH,
  DECO_BLOB_MIN_DITHER,
  DECO_BLOB_MIN_RADIUS_TILES,
  DECO_BLOB_MIN_ROUGH,
  DECO_BLOB_REACH_TILES,
  SEED,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import { decoHash } from './decoHash';

export interface Blob {
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly cosine: number;
  readonly sine: number;
  readonly rough: number;
  readonly dither: number;
}

const BLOB_HASH_SALT = 1000;
const FIELD_CENTRE_X = 1;
const FIELD_CENTRE_Y = 2;
const FIELD_RADIUS_X = 3;
const FIELD_RADIUS_Y = 4;
const FIELD_ANGLE = 5;
const FIELD_ROUGH = 6;
const FIELD_DITHER = 7;

const edgeNoise = createFractalNoise2D(`${SEED}:decoBlob`, 2, DECO_BLOB_EDGE_NOISE_FREQUENCY, 0.5, 2);

function between(low: number, high: number, roll: number): number {
  return low + (high - low) * roll;
}

function blobOfCell(cellX: number, cellY: number): Blob | null {
  const roll = (field: number): number => decoHash(BLOB_HASH_SALT + field, cellX, cellY, 0);
  if (roll(0) >= DECO_BLOB_CHANCE) return null;
  const angle = roll(FIELD_ANGLE) * Math.PI;
  return {
    centerX: cellX * DECO_BLOB_CELL_TILES + roll(FIELD_CENTRE_X) * DECO_BLOB_CELL_TILES,
    centerY: cellY * DECO_BLOB_CELL_TILES + roll(FIELD_CENTRE_Y) * DECO_BLOB_CELL_TILES,
    radiusX: between(DECO_BLOB_MIN_RADIUS_TILES, DECO_BLOB_MAX_RADIUS_TILES, roll(FIELD_RADIUS_X)),
    radiusY: between(DECO_BLOB_MIN_RADIUS_TILES, DECO_BLOB_MAX_RADIUS_TILES, roll(FIELD_RADIUS_Y)),
    cosine: Math.cos(angle),
    sine: Math.sin(angle),
    rough: between(DECO_BLOB_MIN_ROUGH, DECO_BLOB_MAX_ROUGH, roll(FIELD_ROUGH)),
    dither: between(DECO_BLOB_MIN_DITHER, DECO_BLOB_MAX_DITHER, roll(FIELD_DITHER)),
  };
}

export function blobsOverlapping(minX: number, minY: number, maxX: number, maxY: number): Blob[] {
  const blobs: Blob[] = [];
  const firstCellX = Math.floor((minX - DECO_BLOB_REACH_TILES) / DECO_BLOB_CELL_TILES);
  const lastCellX = Math.floor((maxX + DECO_BLOB_REACH_TILES) / DECO_BLOB_CELL_TILES);
  const firstCellY = Math.floor((minY - DECO_BLOB_REACH_TILES) / DECO_BLOB_CELL_TILES);
  const lastCellY = Math.floor((maxY + DECO_BLOB_REACH_TILES) / DECO_BLOB_CELL_TILES);
  for (let cellY = firstCellY; cellY <= lastCellY; cellY++) {
    for (let cellX = firstCellX; cellX <= lastCellX; cellX++) {
      const blob = blobOfCell(cellX, cellY);
      if (blob) blobs.push(blob);
    }
  }
  return blobs;
}

export function blobStrength(blobs: readonly Blob[], x: number, y: number): number {
  let strongest = 0;
  for (const blob of blobs) {
    const offsetX = x + 0.5 - blob.centerX;
    const offsetY = y + 0.5 - blob.centerY;
    const alongX = offsetX * blob.cosine + offsetY * blob.sine;
    const alongY = -offsetX * blob.sine + offsetY * blob.cosine;
    const distance =
      Math.hypot(alongX / blob.radiusX, alongY / blob.radiusY) * (1 + blob.rough * (2 * edgeNoise(x, y) - 1));
    const strength = Math.min(1, Math.max(0, (1 - distance) / blob.dither));
    if (strength > strongest) strongest = strength;
  }
  return strongest;
}
