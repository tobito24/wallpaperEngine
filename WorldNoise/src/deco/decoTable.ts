import type { BiomeId } from '../biome/biome';
import { DECO_FIELD_CELL_TILES } from '../config/constants';

export type DecoLayer = 'flat' | 'object' | 'overhead';
export type DecoPass = 'grove' | 'large' | 'strip' | 'medium' | 'small' | 'flat' | 'road';
export type DecoSurface = 'land' | 'water';

export interface DecoSize {
  readonly width: number;
  readonly height: number;
}

export interface DecoStrip {
  readonly minLength: number;
  readonly maxLength: number;
}

export const DECO_STRIP_PARTS = ['left', 'middle', 'right'] as const;

export interface DecoArea {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

export type DecoItemPass = DecoPass | 'field';

export interface DecoItem {
  readonly name: string;
  readonly fileStem?: string;
  readonly variants: number;
  readonly frames: number;
  readonly pass: DecoItemPass;
  readonly layer: DecoLayer;
  readonly sprite: DecoSize;
  readonly footprint: DecoSize;
  readonly anchorColumn: number;
  readonly surface: DecoSurface;
  readonly biomes: Readonly<Partial<Record<BiomeId, number>>>;
  readonly clearance: number;
  readonly overlapsDeco: boolean;
  readonly overlapsCliff: boolean;
  readonly onRoad: boolean;
  readonly blob: boolean;
  readonly strip?: DecoStrip;
  readonly area?: DecoArea;
}

export const DECO_CELL_SIZE_BY_PASS: Readonly<Record<DecoPass, number>> = {
  grove: 2,
  large: 6,
  strip: 10,
  medium: 4,
  small: 2,
  flat: 1,
  road: 4,
};

export const DECO_PASS_ORDER: readonly DecoPass[] = [
  'grove',
  'large',
  'strip',
  'medium',
  'small',
  'flat',
  'road',
];

export const DECO_PASS_DENSITY: Readonly<Record<DecoPass, number>> = {
  grove: 0.5,
  large: 0.3,
  strip: 0.5,
  medium: 0.4,
  small: 0.5,
  flat: 0.35,
  road: 0.7,
};

export const DECO_CLUSTER_STRENGTH: Readonly<Record<DecoPass, number>> = {
  grove: 2.2,
  large: 0.8,
  strip: 0.4,
  medium: 0.5,
  small: 0.3,
  flat: 0.2,
  road: 0.5,
};

export const DECO_CLUSTER_FREQUENCY_BY_PASS: Readonly<Record<DecoPass, number>> = {
  grove: 0.02,
  large: 0.03,
  strip: 0.03,
  medium: 0.03,
  small: 0.03,
  flat: 0.03,
  road: 0.03,
};

export const DECO_DENSITY_BY_PASS_AND_BIOME: Readonly<
  Partial<Record<DecoPass, Readonly<Partial<Record<BiomeId, number>>>>>
> = {
  grove: {
    forest: 0.6,
    jungle: 0.5,
    snowForest: 0.5,
    meadow: 0.12,
    steppe: 0.05,
    savanna: 0.05,
    desert: 0.03,
    tundra: 0.05,
    snowField: 0.02,
    shallowWater: 0.08,
  },
};

export const DECO_BLOB_DENSITY: Readonly<Partial<Record<DecoPass, number>>> = {
  small: 0.95,
  flat: 0.9,
};

export const DECO_BLOB_BIOMES: readonly BiomeId[] = ['meadow', 'steppe', 'savanna'];

export const DECO_BIOME_FACTOR: Readonly<Partial<Record<BiomeId, number>>> = {
  deepWater: 0.15,
  shallowWater: 0.5,
  desert: 0.4,
  snowPeak: 0.1,
};

const WATER_BIOMES: readonly BiomeId[] = ['deepWater', 'shallowWater'];

const ONE_BY_ONE: DecoSize = { width: 1, height: 1 };
const TWO_BY_ONE: DecoSize = { width: 2, height: 1 };
const ONE_BY_TWO: DecoSize = { width: 1, height: 2 };
const TWO_BY_TWO: DecoSize = { width: 2, height: 2 };
const FOUR_BY_THREE: DecoSize = { width: 4, height: 3 };

const SNOW_ROAD_BIOMES = { snowField: 3, snowForest: 3, tundra: 2, snowPeak: 1 } as const;

const DEFAULTS = {
  variants: 1,
  frames: 1,
  anchorColumn: 0,
  surface: 'land',
  clearance: 0,
  overlapsDeco: false,
  overlapsCliff: false,
  onRoad: false,
  blob: false,
} as const;

type DecoRow = Partial<DecoItem> &
  Pick<DecoItem, 'name' | 'pass' | 'layer' | 'sprite' | 'footprint' | 'biomes'>;

function item(row: DecoRow): DecoItem {
  return { ...DEFAULTS, ...row };
}

export const DECO_ITEMS: readonly DecoItem[] = [
  item({
    name: 'tree-oak',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { meadow: 2, forest: 8, steppe: 0.5 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-mossy',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { forest: 3, jungle: 3 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-swamp',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { jungle: 2 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-water',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    surface: 'water',
    biomes: { shallowWater: 1 },
    overlapsDeco: true,
  }),
  item({
    name: 'tree-oak-snow',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { snowForest: 8, tundra: 1, snowField: 0.5 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-savanna',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { savanna: 1 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-cactus',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { desert: 1 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-beechnut',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { forest: 4, meadow: 1 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-birch',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { forest: 3, meadow: 2, steppe: 1 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-fir',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { forest: 2, jungle: 0.3 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-fir-snow',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { snowForest: 8, tundra: 1 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-dead',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { desert: 0.3, steppe: 0.3, savanna: 0.3 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-dead-snow',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { snowField: 0.5, tundra: 0.3 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'tree-stump',
    pass: 'grove',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { forest: 0.4 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'palm',
    pass: 'large',
    layer: 'object',
    sprite: FOUR_BY_THREE,
    footprint: TWO_BY_ONE,
    anchorColumn: 1,
    biomes: { beach: 2 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'bush',
    pass: 'large',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    biomes: { meadow: 2, forest: 2, steppe: 1 },
  }),
  item({
    name: 'boulder',
    pass: 'large',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    biomes: { mountain: 3, tundra: 1, desert: 1, steppe: 0.5, savanna: 0.5 },
  }),
  item({
    name: 'boulder-snow',
    pass: 'large',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    biomes: { snowField: 1, tundra: 1, snowPeak: 1 },
  }),
  item({
    name: 'boulder-sand',
    pass: 'large',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    biomes: { desert: 1 },
  }),
  item({
    name: 'boulder-water',
    pass: 'large',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    surface: 'water',
    biomes: { shallowWater: 1, deepWater: 0.3 },
  }),
  item({
    name: 'cliff-ridge',
    pass: 'strip',
    layer: 'object',
    sprite: { width: 8, height: 1 },
    footprint: { width: 8, height: 1 },
    strip: { minLength: 3, maxLength: 8 },
    biomes: { meadow: 1, forest: 1, steppe: 1, savanna: 1, mountain: 1, tundra: 1, jungle: 1 },
  }),
  item({
    name: 'tall-grass-light',
    pass: 'field',
    layer: 'flat',
    sprite: { width: 6, height: 5 },
    footprint: { width: 6, height: 5 },
    area: { minWidth: 3, maxWidth: 6, minHeight: 3, maxHeight: 5 },
    biomes: { meadow: 1 },
  }),
  item({
    name: 'tall-grass-dry',
    pass: 'field',
    layer: 'flat',
    sprite: { width: 6, height: 5 },
    footprint: { width: 6, height: 5 },
    area: { minWidth: 3, maxWidth: 6, minHeight: 3, maxHeight: 5 },
    biomes: { steppe: 1, savanna: 1 },
  }),
  item({
    name: 'tall-grass-dark',
    pass: 'field',
    layer: 'flat',
    sprite: { width: 6, height: 5 },
    footprint: { width: 6, height: 5 },
    area: { minWidth: 3, maxWidth: 6, minHeight: 3, maxHeight: 5 },
    biomes: { forest: 1, jungle: 1 },
  }),
  item({
    name: 'log',
    variants: 2,
    pass: 'medium',
    layer: 'object',
    sprite: TWO_BY_ONE,
    footprint: TWO_BY_ONE,
    biomes: { forest: 3, meadow: 1, steppe: 0.5 },
  }),
  item({
    name: 'log-snow',
    fileStem: 'log-2',
    pass: 'medium',
    layer: 'object',
    sprite: TWO_BY_ONE,
    footprint: TWO_BY_ONE,
    biomes: { snowForest: 3, tundra: 1 },
  }),
  item({
    name: 'rock-pair',
    pass: 'medium',
    layer: 'object',
    sprite: TWO_BY_ONE,
    footprint: TWO_BY_ONE,
    biomes: { mountain: 2, tundra: 1, meadow: 0.3, desert: 0.5 },
  }),
  item({
    name: 'tuft-tall',
    variants: 2,
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    biomes: { meadow: 3, forest: 2, steppe: 2, savanna: 2, jungle: 2 },
    overlapsDeco: true,
    blob: true,
  }),
  item({
    name: 'fern',
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    biomes: { forest: 3, jungle: 3, meadow: 1 },
    overlapsDeco: true,
    blob: true,
  }),
  item({
    name: 'desert-plant',
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    biomes: { desert: 3 },
    overlapsDeco: true,
  }),
  item({
    name: 'skeleton',
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    biomes: { desert: 0.06, savanna: 0.03 },
  }),
  item({
    name: 'oil-barrel',
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    biomes: { desert: 0.06 },
  }),
  item({
    name: 'mushroom-tall',
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    biomes: { forest: 0.3, jungle: 0.3 },
  }),
  item({
    name: 'stump',
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { forest: 2, meadow: 0.5 },
  }),
  item({
    name: 'rock-small',
    variants: 3,
    pass: 'small',
    layer: 'object',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { mountain: 4, tundra: 2, steppe: 0.4, desert: 1, meadow: 0.3, forest: 0.3, savanna: 0.25 },
  }),
  item({
    name: 'flower',
    variants: 4,
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { meadow: 4, steppe: 2, forest: 1 },
  }),
  item({
    name: 'tuft-small',
    variants: 2,
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { meadow: 3, forest: 2, steppe: 3, savanna: 3 },
    blob: true,
  }),
  item({
    name: 'snow-grass',
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { snowField: 2, tundra: 2, snowForest: 2 },
  }),
  item({
    name: 'tuft-snow',
    fileStem: 'tuft-small-2',
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { snowField: 2, tundra: 2, snowForest: 2 },
  }),
  item({
    name: 'desert-grass',
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { desert: 3, savanna: 1 },
  }),
  item({
    name: 'mushroom',
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { forest: 1.5, meadow: 0.3 },
  }),
  item({
    name: 'moss',
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { forest: 2 },
  }),
  item({
    name: 'shell',
    variants: 5,
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    biomes: { beach: 3 },
  }),
  item({
    name: 'road-snow-tall',
    fileStem: 'snow0',
    pass: 'road',
    layer: 'object',
    sprite: ONE_BY_TWO,
    footprint: ONE_BY_ONE,
    onRoad: true,
    overlapsCliff: true,
    biomes: SNOW_ROAD_BIOMES,
  }),
  item({
    name: 'road-snow-big',
    fileStem: 'snow1',
    pass: 'road',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    onRoad: true,
    overlapsCliff: true,
    biomes: SNOW_ROAD_BIOMES,
  }),
  item({
    name: 'road-snow-small',
    fileStem: 'snow2',
    pass: 'road',
    layer: 'object',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    onRoad: true,
    biomes: SNOW_ROAD_BIOMES,
  }),
  item({
    name: 'lily',
    variants: 4,
    pass: 'flat',
    layer: 'flat',
    sprite: ONE_BY_ONE,
    footprint: ONE_BY_ONE,
    surface: 'water',
    biomes: { shallowWater: 3 },
  }),
];

export function validateDecoTable(items: readonly DecoItem[]): void {
  const names = new Set<string>();
  for (const entry of items) {
    if (names.has(entry.name)) throw new RangeError(`Deco item ${entry.name} is listed twice`);
    names.add(entry.name);
    const wholeNumbers = [
      entry.variants,
      entry.frames,
      entry.anchorColumn,
      entry.clearance,
      entry.sprite.width,
      entry.sprite.height,
      entry.footprint.width,
      entry.footprint.height,
    ];
    if (!wholeNumbers.every(Number.isInteger))
      throw new RangeError(`Deco item ${entry.name} needs whole numbers`);
    if (entry.area) {
      const { minWidth, maxWidth, minHeight, maxHeight } = entry.area;
      const sizes = [minWidth, maxWidth, minHeight, maxHeight];
      if (
        !sizes.every(Number.isInteger) ||
        minWidth < 3 ||
        minHeight < 3 ||
        maxWidth < minWidth ||
        maxHeight < minHeight ||
        maxWidth > DECO_FIELD_CELL_TILES ||
        maxHeight > DECO_FIELD_CELL_TILES
      ) {
        throw new RangeError(`Deco item ${entry.name} has a wrong area`);
      }
      if (
        entry.pass !== 'field' ||
        entry.footprint.width !== maxWidth ||
        entry.footprint.height !== maxHeight ||
        entry.sprite.width !== maxWidth ||
        entry.sprite.height !== maxHeight ||
        entry.anchorColumn !== 0 ||
        entry.variants !== 1 ||
        entry.frames !== 1
      ) {
        throw new RangeError(
          `Deco item ${entry.name}: an area is one sprite of its maximum size in the pass field`,
        );
      }
    } else if (entry.pass === 'field') {
      throw new RangeError(`Deco item ${entry.name} is in the pass field without an area`);
    }
    const cellSize = entry.pass === 'field' ? DECO_FIELD_CELL_TILES : DECO_CELL_SIZE_BY_PASS[entry.pass];
    if (
      entry.footprint.width + entry.clearance > cellSize ||
      entry.footprint.height + entry.clearance > cellSize ||
      (!entry.overlapsDeco && (entry.sprite.width > cellSize || entry.sprite.height > cellSize))
    ) {
      throw new RangeError(`Deco item ${entry.name} does not fit a cell of its pass (${entry.pass})`);
    }
    if (entry.anchorColumn < 0 || entry.clearance < 0) {
      throw new RangeError(`Deco item ${entry.name} has a negative anchor or clearance`);
    }
    if (
      entry.anchorColumn + entry.footprint.width > entry.sprite.width ||
      entry.footprint.height > entry.sprite.height
    ) {
      throw new RangeError(`Deco item ${entry.name} has a footprint outside its sprite`);
    }
    if (entry.strip) {
      const { minLength, maxLength } = entry.strip;
      if (
        !Number.isInteger(minLength) ||
        !Number.isInteger(maxLength) ||
        minLength < 2 ||
        maxLength < minLength
      ) {
        throw new RangeError(`Deco item ${entry.name} has a wrong strip length`);
      }
      if (
        entry.footprint.width !== maxLength ||
        entry.sprite.width !== maxLength ||
        entry.footprint.height !== 1 ||
        entry.sprite.height !== 1 ||
        entry.anchorColumn !== 0 ||
        entry.variants !== 1 ||
        entry.frames !== 1
      ) {
        throw new RangeError(`Deco item ${entry.name}: a strip is one row of its maximum length`);
      }
    }
    if (entry.onRoad !== (entry.pass === 'road') || (entry.onRoad && entry.surface !== 'land')) {
      throw new RangeError(`Deco item ${entry.name}: onRoad and the pass road go together, on land`);
    }
    if (entry.variants < 1 || entry.frames < 1) {
      throw new RangeError(`Deco item ${entry.name} needs a variant and a frame`);
    }
    const weights = Object.entries(entry.biomes) as [BiomeId, number][];
    if (weights.length === 0) throw new RangeError(`Deco item ${entry.name} has no biome`);
    for (const [biomeId, weight] of weights) {
      if (!(weight > 0))
        throw new RangeError(`Deco item ${entry.name} has a weight of ${weight} for ${biomeId}`);
      const isWaterBiome = WATER_BIOMES.includes(biomeId);
      if (isWaterBiome !== (entry.surface === 'water')) {
        throw new RangeError(
          `Deco item ${entry.name}: ${biomeId} does not match the surface ${entry.surface}`,
        );
      }
    }
  }
}

validateDecoTable(DECO_ITEMS);

function reachOfPass(pass: DecoPass): number {
  const reaches = DECO_ITEMS.filter((entry) => entry.pass === pass).map(
    (entry) => Math.max(entry.sprite.width, entry.sprite.height) + entry.clearance,
  );
  return reaches.length > 0 ? Math.max(...reaches) : 0;
}

function leftOfPass(pass: DecoPass): number {
  const lefts = DECO_ITEMS.filter((entry) => entry.pass === pass).map((entry) => entry.anchorColumn);
  return lefts.length > 0 ? Math.max(...lefts) : 0;
}

export const DECO_PASS_REACH_TILES: Readonly<Record<DecoPass, number>> = Object.fromEntries(
  DECO_PASS_ORDER.map((pass) => [pass, reachOfPass(pass)]),
) as Record<DecoPass, number>;

export const DECO_PASS_LEFT_TILES: Readonly<Record<DecoPass, number>> = Object.fromEntries(
  DECO_PASS_ORDER.map((pass) => [pass, leftOfPass(pass)]),
) as Record<DecoPass, number>;

function linkBetween(first: DecoPass, second: DecoPass): number {
  return Math.max(
    DECO_PASS_REACH_TILES[first] + DECO_PASS_LEFT_TILES[second],
    DECO_PASS_REACH_TILES[second] + DECO_PASS_LEFT_TILES[first],
  );
}

function expansionsOfPasses(): Record<DecoPass, number> {
  const expansions = {} as Record<DecoPass, number>;
  for (let index = DECO_PASS_ORDER.length - 1; index >= 0; index--) {
    const pass = DECO_PASS_ORDER[index];
    let longest = 0;
    for (let later = index + 1; later < DECO_PASS_ORDER.length; later++) {
      const laterPass = DECO_PASS_ORDER[later];
      longest = Math.max(longest, expansions[laterPass] + linkBetween(pass, laterPass));
    }
    expansions[pass] = longest;
  }
  return expansions;
}

export const DECO_PASS_EXPANSION_TILES: Readonly<Record<DecoPass, number>> = expansionsOfPasses();

export const DECO_FIELD_MAX_TILES = Math.max(
  0,
  ...DECO_ITEMS.filter((entry) => entry.area).map((entry) =>
    Math.max(entry.sprite.width, entry.sprite.height),
  ),
);

export const DECO_CONFLICT_REACH_TILES = Math.max(
  ...DECO_PASS_ORDER.map((pass) => DECO_PASS_REACH_TILES[pass] + DECO_PASS_LEFT_TILES[pass]),
);
export const DECO_MARGIN_TILES = Math.max(
  DECO_FIELD_CELL_TILES + DECO_FIELD_MAX_TILES,
  ...DECO_PASS_ORDER.map(
    (pass) => DECO_PASS_EXPANSION_TILES[pass] + DECO_PASS_REACH_TILES[pass] + DECO_PASS_LEFT_TILES[pass],
  ),
);

export const DECO_VIEW_REACH_TILES = Math.max(
  ...DECO_ITEMS.map((entry) => Math.max(entry.sprite.width, entry.sprite.height) + entry.anchorColumn),
);
