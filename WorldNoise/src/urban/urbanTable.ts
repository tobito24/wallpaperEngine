import { URBAN_MAX_HEIGHT_TILES, URBAN_MAX_WIDTH_TILES } from '../config/constants';
import type { DecoLayer, DecoSize } from '../deco/decoTable';

export type UrbanKind = 'building';

export interface UrbanItem {
  readonly name: string;
  readonly kind: UrbanKind;
  readonly layer: DecoLayer;
  readonly sprite: DecoSize;
  readonly doorColumn: number;
  readonly weight: number;
  readonly unique: boolean;
  readonly minTownChunks: number;
}

const DEFAULTS = {
  kind: 'building',
  layer: 'object',
  weight: 1,
  unique: false,
  minTownChunks: 1,
} as const;

type UrbanRow = Partial<UrbanItem> & Pick<UrbanItem, 'name' | 'sprite'>;

function item(row: UrbanRow): UrbanItem {
  return { ...DEFAULTS, doorColumn: Math.floor(row.sprite.width / 2), ...row };
}

const HOUSE: DecoSize = { width: 5, height: 4 };

export const URBAN_ITEMS: readonly UrbanItem[] = [
  item({ name: 'center', sprite: { width: 5, height: 5 }, unique: true }),
  item({ name: 'mart', sprite: { width: 4, height: 4 }, unique: true, minTownChunks: 2 }),
  item({ name: 'house-blue', sprite: HOUSE }),
  item({ name: 'house-orange', sprite: HOUSE }),
  item({ name: 'house-red', sprite: HOUSE, doorColumn: 1 }),
  item({ name: 'house-grey', sprite: HOUSE, doorColumn: 1 }),
  item({ name: 'house-purple', sprite: HOUSE }),
];

function validateUrbanTable(items: readonly UrbanItem[]): void {
  const names = new Set<string>();
  for (const { name, sprite, weight, doorColumn } of items) {
    if (names.has(name)) throw new RangeError(`Urban item ${name} is listed twice`);
    names.add(name);
    if (sprite.width > URBAN_MAX_WIDTH_TILES || sprite.height > URBAN_MAX_HEIGHT_TILES) {
      throw new RangeError(`Urban item ${name} is larger than the largest building`);
    }
    if (doorColumn < 0 || doorColumn >= sprite.width)
      throw new RangeError(`Urban item ${name} has its door outside the sprite`);
    if (!(weight > 0)) throw new RangeError(`Urban item ${name} needs a positive weight`);
  }
}

validateUrbanTable(URBAN_ITEMS);
