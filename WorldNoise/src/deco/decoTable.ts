import type { BiomeId } from '../biome/biome';
import type { Ground } from '../tileset/ground';

export type DecoLayer = 'flat' | 'object' | 'overhead';
export type DecoPass = 'large' | 'medium' | 'small' | 'flat';
export type DecoSurface = 'land' | 'water';

export interface DecoFootprint {
  readonly width: number;
  readonly height: number;
}

export interface DecoItem {
  readonly name: string;
  readonly variants: number;
  readonly frames: number;
  readonly pass: DecoPass;
  readonly layer: DecoLayer;
  readonly footprint: DecoFootprint;
  readonly anchorColumn: number;
  readonly surface: DecoSurface;
  readonly biomes: Readonly<Partial<Record<BiomeId, number>>>;
  readonly grounds?: readonly Ground[];
  readonly clearance: number;
  readonly repeat: boolean;
  readonly overlapsDeco: boolean;
  readonly overlapsCliff: boolean;
}

export const DECO_CELL_SIZE_BY_PASS: Readonly<Record<DecoPass, number>> = {
  large: 6,
  medium: 4,
  small: 2,
  flat: 1,
};

export const DECO_PASS_ORDER: readonly DecoPass[] = ['large', 'medium', 'small', 'flat'];

const WATER_BIOMES: readonly BiomeId[] = ['deepWater', 'shallowWater'];

const SINGLE_TILE: DecoFootprint = { width: 1, height: 1 };
const TWO_TILES_WIDE: DecoFootprint = { width: 2, height: 1 };

const DEFAULTS = {
  variants: 1,
  frames: 1,
  anchorColumn: 0,
  surface: 'land',
  clearance: 0,
  repeat: false,
  overlapsDeco: false,
  overlapsCliff: false,
} as const;

function item(
  row: Partial<DecoItem> & Pick<DecoItem, 'name' | 'pass' | 'layer' | 'footprint' | 'biomes'>,
): DecoItem {
  return { ...DEFAULTS, ...row };
}

export const DECO_ITEMS: readonly DecoItem[] = [
  item({
    name: 'tree-oak',
    pass: 'large',
    layer: 'object',
    footprint: TWO_TILES_WIDE,
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
    footprint: TWO_TILES_WIDE,
    anchorColumn: 1,
    biomes: { beach: 2 },
    overlapsDeco: true,
    overlapsCliff: true,
  }),
  item({
    name: 'boulder',
    pass: 'large',
    layer: 'object',
    footprint: TWO_TILES_WIDE,
    biomes: { mountain: 3, tundra: 1, desert: 1, steppe: 0.5, savanna: 0.5 },
  }),
  item({
    name: 'boulder-water',
    pass: 'large',
    layer: 'object',
    footprint: TWO_TILES_WIDE,
    surface: 'water',
    biomes: { shallowWater: 1, deepWater: 0.3 },
  }),
  item({
    name: 'log',
    variants: 2,
    pass: 'medium',
    layer: 'object',
    footprint: TWO_TILES_WIDE,
    biomes: { forest: 3, meadow: 1, steppe: 0.5 },
  }),
  item({
    name: 'rock-pair',
    pass: 'medium',
    layer: 'object',
    footprint: TWO_TILES_WIDE,
    biomes: { mountain: 2, tundra: 1, meadow: 0.3, desert: 0.5 },
  }),
  item({
    name: 'tuft-tall',
    variants: 2,
    pass: 'small',
    layer: 'object',
    footprint: SINGLE_TILE,
    biomes: { meadow: 3, forest: 2, steppe: 2, savanna: 2, jungle: 2 },
    overlapsDeco: true,
  }),
  item({
    name: 'fern',
    pass: 'small',
    layer: 'object',
    footprint: SINGLE_TILE,
    biomes: { forest: 3, jungle: 3, meadow: 1 },
    overlapsDeco: true,
  }),
  item({
    name: 'stump',
    pass: 'small',
    layer: 'object',
    footprint: SINGLE_TILE,
    biomes: { forest: 2, meadow: 0.5 },
  }),
  item({
    name: 'rock-small',
    variants: 3,
    pass: 'small',
    layer: 'object',
    footprint: SINGLE_TILE,
    biomes: { mountain: 4, tundra: 2, steppe: 1, desert: 1, meadow: 0.5, forest: 0.5, savanna: 0.5 },
  }),
  item({
    name: 'flower',
    variants: 4,
    pass: 'flat',
    layer: 'flat',
    footprint: SINGLE_TILE,
    biomes: { meadow: 4, steppe: 2, forest: 1 },
  }),
  item({
    name: 'tuft-small',
    variants: 2,
    pass: 'flat',
    layer: 'flat',
    footprint: SINGLE_TILE,
    biomes: { meadow: 3, forest: 2, steppe: 3, savanna: 3 },
  }),
  item({
    name: 'mushroom',
    pass: 'flat',
    layer: 'flat',
    footprint: SINGLE_TILE,
    biomes: { forest: 1.5, meadow: 0.3 },
  }),
  item({
    name: 'moss',
    pass: 'flat',
    layer: 'flat',
    footprint: SINGLE_TILE,
    biomes: { forest: 2 },
  }),
  item({
    name: 'shell',
    variants: 5,
    pass: 'flat',
    layer: 'flat',
    footprint: SINGLE_TILE,
    biomes: { beach: 3 },
  }),
  item({
    name: 'lily',
    variants: 4,
    pass: 'flat',
    layer: 'flat',
    footprint: SINGLE_TILE,
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
      entry.footprint.width,
      entry.footprint.height,
    ];
    if (!wholeNumbers.every(Number.isInteger))
      throw new RangeError(`Deco item ${entry.name} needs whole numbers`);
    const cellSize = DECO_CELL_SIZE_BY_PASS[entry.pass];
    if (
      entry.footprint.width + entry.clearance > cellSize ||
      entry.footprint.height + entry.clearance > cellSize
    ) {
      throw new RangeError(`Deco item ${entry.name} does not fit a cell of its pass (${entry.pass})`);
    }
    if (entry.anchorColumn < 0 || entry.clearance < 0) {
      throw new RangeError(`Deco item ${entry.name} has a negative anchor or clearance`);
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
