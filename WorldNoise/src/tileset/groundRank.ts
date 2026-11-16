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

export function underlayGround(
  ground: Ground,
  firstEdge: Ground,
  secondEdge: Ground,
  diagonal: Ground,
): Ground | null {
  const ownRank = GROUND_RANK[ground];
  const firstRank = GROUND_RANK[firstEdge];
  const secondRank = GROUND_RANK[secondEdge];
  const firstIsLower = firstRank < ownRank;
  const secondIsLower = secondRank < ownRank;
  if (firstIsLower && secondIsLower) return firstRank >= secondRank ? firstEdge : secondEdge;
  if (firstIsLower) return firstEdge;
  if (secondIsLower) return secondEdge;
  return GROUND_RANK[diagonal] < ownRank ? diagonal : null;
}
