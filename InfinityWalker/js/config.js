export const TILE_SIZE = 32; // pixels
export const CHUNK_SIZE = 16; // 16x16 tiles per chunk

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
