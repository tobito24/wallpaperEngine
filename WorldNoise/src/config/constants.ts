export const SEED = '12345678';

export const TILE_SIZE_DEFAULT = 32;
export const MIN_TILE_SIZE = 4;
export const MAX_TILE_SIZE = 128;

export const ZOOM_STEP_PX = 4;
export const PAN_SPEED_TILES_PER_SEC = 6;
export const PAN_SPRINT_MULTIPLIER = 2;

export const CHUNK_SIZE = 16;
export const CHUNK_UNLOAD_DELAY_MS = 5000;

export const ELEVATION_OCTAVES = 4;
export const ELEVATION_BASE_FREQUENCY = 0.02;
export const ELEVATION_PERSISTENCE = 0.5;
export const ELEVATION_LACUNARITY = 2;
export const ELEVATION_RAW_RANGE_LOW = 0.2;
export const ELEVATION_RAW_RANGE_HIGH = 0.8;
export const ELEVATION_CONTRAST = 0.4;
export const ELEVATION_SEA_LEVEL = 0.22;

export const HEIGHT_LEVEL_OCTAVES = 2;
export const HEIGHT_LEVEL_THRESHOLDS: readonly number[] = [0.55, 0.8];
export const CLIFF_EDGE_SIZE_DIVISOR = 8;

export const MOISTURE_OCTAVES = 4;
export const MOISTURE_BASE_FREQUENCY = 0.005;
export const MOISTURE_PERSISTENCE = 0.5;
export const MOISTURE_LACUNARITY = 2;
export const MOISTURE_RAW_RANGE_LOW = 0.2;
export const MOISTURE_RAW_RANGE_HIGH = 0.8;
export const MOISTURE_CONTRAST = 0.2;

export const TEMPERATURE_OCTAVES = 4;
export const TEMPERATURE_BASE_FREQUENCY = 0.005;
export const TEMPERATURE_PERSISTENCE = 0.5;
export const TEMPERATURE_LACUNARITY = 2;
export const TEMPERATURE_RAW_RANGE_LOW = 0.2;
export const TEMPERATURE_RAW_RANGE_HIGH = 0.8;
export const TEMPERATURE_CONTRAST = 0.2;

// slider_tickrate in public/project.json
export const TICK_INTERVAL_DEFAULT_MS = 250;
export const MIN_TICK_INTERVAL_MS = 100;
export const MAX_TICK_INTERVAL_MS = 2000;
