export const TILE_SIZE = 32; // pixels
export const CHUNK_SIZE = 16; // 16x16 tiles per chunk
export const HEIGHT_LEVELS = 6; // number of discrete height steps
export const HEIGHT_NOISE_SCALE = 32; // higher = larger height blobs
export const HEIGHT_NOISE_OCTAVES = 1; // small number keeps it cheap
export const HEIGHT_SEED = Math.floor(Math.random() * 1000); // change for a different world layout

export const WFC_ACCURACY = 10; // higher = more accurate but slower.
export const WFC_TIME_BUDGET_MS = 6; // time budget per frame in ms for WFC processing

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

// Payer sprite row mapping for each direction
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

export const CHUNK_STATE = {
  WAITING: 0,
  BASE_GENERATING: 1,
  OVERLAY_GENERATING: 2,
  DECO_GENERATING: 3,
  COLLAPSED: 4
}

export const WORLDPIECE_STATE = {
  ERROR: -1,
  UNTOUCHED: 0,
  TOUCHED: 1,
  BASE_GENERATED: 2,
  OVERLAY_GENERATED: 3,
  COLLAPSED: 4
}

export const CLIFF_TYPES = {
  // Direction in which it goes down 
  NORTH_EDGE: 0,
  EAST_EDGE: 1,
  SOUTH_EDGE: 2,
  WEST_EDGE: 3,
  NORTH_WEST_OUTER_CORNER: 4,
  NORTH_EAST_OUTER_CORNER: 5,
  SOUTH_EAST_OUTER_CORNER: 6,
  SOUTH_WEST_OUTER_CORNER: 7,
  NORTH_WEST_INNER_CORNER: 8,
  NORTH_EAST_INNER_CORNER: 9,
  SOUTH_EAST_INNER_CORNER: 10,
  SOUTH_WEST_INNER_CORNER: 11
}

export const RARITY = {
  RARE_0: Math.pow(2, 0),
  RARE_1: Math.pow(2, 1),
  RARE_2: Math.pow(2, 2),
  RARE_3: Math.pow(2, 3),
  RARE_4: Math.pow(2, 4),
  RARE_5: Math.pow(2, 5),
  RARE_6: Math.pow(2, 6),
  RARE_7: Math.pow(2, 7),
  RARE_8: Math.pow(2, 8),
  RARE_9: Math.pow(2, 9),
  RARE_10: Math.pow(2, 10),
  RARE_11: Math.pow(2, 11),
};

export const TRANSPARENT_MASK = [1n, 1n, 1n, 1n];