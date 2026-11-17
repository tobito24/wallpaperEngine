import type { BiomeId } from '../biome/biome';
import type { Ground } from '../tileset/ground';

export type DecoLayer = 'flat' | 'object' | 'overhead';
export type DecoPass = 'grove' | 'large' | 'medium' | 'small' | 'flat';
export type DecoSurface = 'land' | 'water';

export interface DecoSize {
  readonly width: number;
  readonly height: number;
}

export interface DecoItem {
  readonly name: string;
  readonly variants: number;
  readonly frames: number;
  readonly pass: DecoPass;
  readonly layer: DecoLayer;
  readonly sprite: DecoSize;
  readonly footprint: DecoSize;
  readonly anchorColumn: number;
  readonly surface: DecoSurface;
  readonly biomes: Readonly<Partial<Record<BiomeId, number>>>;
  readonly grounds?: readonly Ground[];
  readonly clearance: number;
  readonly repeat: boolean;
  readonly overlapsDeco: boolean;
  readonly overlapsCliff: boolean;
  readonly blob: boolean;
}

export const DECO_CELL_SIZE_BY_PASS: Readonly<Record<DecoPass, number>> = {
  grove: 2,
  large: 6,
  medium: 4,
  small: 2,
  flat: 1,
};

export const DECO_PASS_ORDER: readonly DecoPass[] = ['grove', 'large', 'medium', 'small', 'flat'];

export const DECO_PASS_DENSITY: Readonly<Record<DecoPass, number>> = {
  grove: 0.5,
  large: 0.3,
  medium: 0.4,
  small: 0.5,
  flat: 0.35,
};

export const DECO_CLUSTER_STRENGTH: Readonly<Record<DecoPass, number>> = {
  grove: 2.2,
  large: 0.8,
  medium: 0.5,
  small: 0.3,
  flat: 0.2,
};

export const DECO_CLUSTER_FREQUENCY_BY_PASS: Readonly<Record<DecoPass, number>> = {
  grove: 0.02,
  large: 0.03,
  medium: 0.03,
  small: 0.03,
  flat: 0.03,
};

export const DECO_DENSITY_BY_PASS_AND_BIOME: Readonly<
  Partial<Record<DecoPass, Readonly<Partial<Record<BiomeId, number>>>>>
> = {
  grove: { forest: 0.6, jungle: 0.5, snowForest: 0.5, meadow: 0.12, steppe: 0.05, savanna: 0.03 },
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

const DEFAULTS = {
  variants: 1,
  frames: 1,
  anchorColumn: 0,
  surface: 'land',
  clearance: 0,
  repeat: false,
  overlapsDeco: false,
  overlapsCliff: false,
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
    repeat: true,
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
    name: 'boulder',
    pass: 'large',
    layer: 'object',
    sprite: TWO_BY_TWO,
    footprint: TWO_BY_ONE,
    biomes: { mountain: 3, tundra: 1, desert: 1, steppe: 0.5, savanna: 0.5 },
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
    name: 'log',
    variants: 2,
    pass: 'medium',
    layer: 'object',
    sprite: TWO_BY_ONE,
    footprint: TWO_BY_ONE,
    biomes: { forest: 3, meadow: 1, steppe: 0.5 },
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
    const cellSize = DECO_CELL_SIZE_BY_PASS[entry.pass];
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

export const DECO_CONFLICT_REACH_TILES =
  Math.max(...DECO_ITEMS.map((entry) => Math.max(entry.sprite.width, entry.sprite.height))) +
  Math.max(...DECO_ITEMS.map((entry) => entry.clearance));
export const DECO_MARGIN_TILES = DECO_PASS_ORDER.length * DECO_CONFLICT_REACH_TILES;
