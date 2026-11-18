import { TOWN_BUILDING_SETBACK_MAX_TILES } from '../config/constants';
import { URBAN_ITEMS } from '../urban/urbanTable';
import type { UrbanItem } from '../urban/urbanTable';
import type { Lot } from './townLots';
import type { Town } from './townPlacement';

export interface Placement {
  readonly item: UrbanItem;
  readonly x: number;
  readonly y: number;
  readonly lot: number;
  readonly frontRows: number;
  readonly setbackRows: number;
}

const FRONTAGE_RANK: Readonly<Record<'through' | 'side' | 'none', number>> = {
  through: 0,
  side: 1,
  none: 2,
};

function frontageRank(lot: Lot): number {
  return FRONTAGE_RANK[lot.frontage ?? 'none'];
}

function frontRowsOf(lot: Lot): number {
  return lot.frontage === null ? 1 : 0;
}

function fits(item: UrbanItem, lot: Lot): boolean {
  return item.sprite.width <= lot.width && item.sprite.height + frontRowsOf(lot) <= lot.depth;
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

function placementOn(item: UrbanItem, lot: Lot, lotIndex: number, setbackRows: number): Placement {
  const frontRows = frontRowsOf(lot);
  return {
    item,
    x: lot.x + Math.floor((lot.width - item.sprite.width) / 2),
    y: lot.y + lot.depth - frontRows - setbackRows - item.sprite.height,
    lot: lotIndex,
    frontRows,
    setbackRows,
  };
}

function randomSetback(item: UrbanItem, lot: Lot, random: () => number): number {
  const room = lot.depth - frontRowsOf(lot) - item.sprite.height;
  return Math.floor(random() * (Math.min(TOWN_BUILDING_SETBACK_MAX_TILES, room) + 1));
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
    placements.push(placementOn(item, lots[candidates[0]], candidates[0], 0));
  }

  const pool = eligible.filter((candidate) => !candidate.unique);
  lots.forEach((lot, index) => {
    if (taken.has(index)) return;
    const fitting = pool.filter((candidate) => fits(candidate, lot));
    if (fitting.length === 0) return;
    const item = pickByWeight(fitting, random);
    placements.push(placementOn(item, lot, index, randomSetback(item, lot, random)));
  });
  return placements;
}
