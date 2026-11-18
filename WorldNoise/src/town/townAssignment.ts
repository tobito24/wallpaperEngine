import { TOWN_DOOR_PATH_WIDTH_TILES } from '../config/constants';
import { URBAN_ITEMS } from '../urban/urbanTable';
import type { UrbanItem } from '../urban/urbanTable';
import type { Lot } from './townLots';
import type { Town } from './townPlacement';

export interface Placement {
  readonly item: UrbanItem;
  readonly x: number;
  readonly y: number;
  readonly lot: number;
  readonly onStreet: boolean;
  readonly yardRows: number;
}

const FRONTAGE_RANK: Readonly<Record<'through' | 'side' | 'none', number>> = {
  through: 0,
  side: 1,
  none: 2,
};

function frontageRank(lot: Lot): number {
  return FRONTAGE_RANK[lot.frontage ?? 'none'];
}

function doorYardOf(item: UrbanItem, lot: Lot): number {
  if (lot.frontage !== null) return 0;
  return Math.min(TOWN_DOOR_PATH_WIDTH_TILES, lot.depth - item.sprite.height);
}

function fits(item: UrbanItem, lot: Lot): boolean {
  const needsYard = lot.frontage === null ? 1 : 0;
  return item.sprite.width <= lot.width && item.sprite.height + needsYard <= lot.depth;
}

function pickByWeight(items: readonly UrbanItem[], random: () => number): UrbanItem {
  const total = items.reduce((sum, candidate) => sum + candidate.weight, 0);
  let remaining = random() * total;
  for (const candidate of items) {
    remaining -= candidate.weight;
    if (remaining < 0) return candidate;
  }
  return items[items.length - 1];
}

function placementOn(item: UrbanItem, lot: Lot, lotIndex: number): Placement {
  const yard = doorYardOf(item, lot);
  return {
    item,
    x: lot.x + Math.floor((lot.width - item.sprite.width) / 2),
    y: lot.y + lot.depth - yard - item.sprite.height,
    lot: lotIndex,
    onStreet: lot.frontage !== null,
    yardRows: yard,
  };
}

export function assignBuildings(town: Town, lots: readonly Lot[], random: () => number): Placement[] {
  const eligible = URBAN_ITEMS.filter(
    (candidate) => candidate.kind === 'building' && candidate.minTownChunks <= town.chunks.length,
  );
  const distanceToCentre = lots.map((lot) =>
    Math.hypot(lot.x + lot.width / 2 - town.center.x, lot.y + lot.depth / 2 - town.center.y),
  );
  const taken = new Set<number>();
  const placements: Placement[] = [];

  for (const item of eligible.filter((candidate) => candidate.unique)) {
    const candidates = lots
      .map((_, index) => index)
      .filter((index) => !taken.has(index) && fits(item, lots[index]))
      .sort(
        (a, b) => frontageRank(lots[a]) - frontageRank(lots[b]) || distanceToCentre[a] - distanceToCentre[b],
      );
    if (candidates.length === 0) continue;
    taken.add(candidates[0]);
    placements.push(placementOn(item, lots[candidates[0]], candidates[0]));
  }

  const pool = eligible.filter((candidate) => !candidate.unique);
  lots.forEach((lot, index) => {
    if (taken.has(index)) return;
    const fitting = pool.filter((candidate) => fits(candidate, lot));
    if (fitting.length === 0) return;
    placements.push(placementOn(pickByWeight(fitting, random), lot, index));
  });
  return placements;
}
