import type { Ground } from '../biome/biome';

const GROUND_RANK: Readonly<Record<Ground, number>> = {
  deepWater: 0,
  shallowWater: 1,
  sand: 2,
  grass: 3,
  dirt: 4,
  rock: 5,
  snow: 6,
};

export function continuesInto(ground: Ground, neighbourGround: Ground): boolean {
  return GROUND_RANK[neighbourGround] >= GROUND_RANK[ground];
}
