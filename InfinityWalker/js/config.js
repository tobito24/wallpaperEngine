export const TILE_SIZE = 32; // pixels
export const CHUNK_SIZE = 16; // 16x16 tiles per chunk
export const HEIGHT_LEVELS = 6; // number of discrete height steps
export const HEIGHT_NOISE_SCALE = 32; // higher = larger height blobs
export const HEIGHT_NOISE_OCTAVES = 1; // small number keeps it cheap
export const HEIGHT_SEED = Math.random(); // change for a different world layout

export const WFC_ACCURACY = 10; // higher = more accurate but slower. 

const SPRITE_COLS = 4;
const SPRITE_ROWS = 4;
const SPRITE_STEP_FRAMES = 2;

export const SPRITE = {
  sheet: 'img/trainer_bug.png',
  cols: SPRITE_COLS,
  rows: SPRITE_ROWS,
  stepFrames: SPRITE_STEP_FRAMES,
  fps: 8,
  scale: 1
};

export const TILESET = {
  sheet: 'img/tileset.png',
  tileSize: TILE_SIZE
};

export const DIRECTION = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3
};

export const OPPOSITE_DIRECTION = {
  0: 2, // NORTH -> SOUTH
  1: 3, // EAST -> WEST
  2: 0, // SOUTH -> NORTH
  3: 1  // WEST -> EAST
};

export const DIRECTION_VECTORS = [
  { x: 0, y: -1 }, // NORTH
  { x: 1, y: 0 },  // EAST
  { x: 0, y: 1 },  // SOUTH
  { x: -1, y: 0 }  // WEST
];

export const SPRITE_ROW_DIRECTION = [
  3, // NORTH
  2, // EAST
  0, // SOUTH
  1  // WEST
];

export const LAYER = {
  BASE: 0,
  OVERLAY: 1,
  DECO: 2
};
