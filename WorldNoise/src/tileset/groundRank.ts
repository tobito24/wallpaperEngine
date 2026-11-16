import type { Ground } from './ground';

const GROUND_RANK: Readonly<Record<Ground, number>> = {
  deepWater: 0,
  shallowWater: 1,
  beach: 2,
  snowField: 3,
  steppe: 4,
  tundra: 5,
  desert: 6,
  meadow: 7,
  snowForest: 8,
  savanna: 9,
  forest: 10,
  jungle: 11,
  mountain: 12,
  snowPeak: 13,
  road: 14,
  bridge: 15,
};

export function continuesInto(ground: Ground, neighbourGround: Ground): boolean {
  return GROUND_RANK[neighbourGround] >= GROUND_RANK[ground];
}

export function underlayGround(ground: Ground, neighbourGrounds: readonly Ground[]): Ground | null {
  let underlay: Ground | null = null;
  for (const neighbour of neighbourGrounds) {
    if (GROUND_RANK[neighbour] >= GROUND_RANK[ground]) continue;
    if (underlay === null || GROUND_RANK[neighbour] > GROUND_RANK[underlay]) underlay = neighbour;
  }
  return underlay;
}
