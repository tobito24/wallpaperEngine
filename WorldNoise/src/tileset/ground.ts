import type { BiomeGround } from '../biome/biome';

export type Ground = BiomeGround | 'road' | 'bridge';

export const ROAD_FALLBACK_COLOR_BY_GROUND: Readonly<Partial<Record<Ground, string>>> = {
  road: '#9a8f7a',
  bridge: '#8b5a2b',
};

export function groundWithRoad(biomeGround: BiomeGround, isRoad: boolean): Ground {
  if (!isRoad) return biomeGround;
  return biomeGround === 'deepWater' || biomeGround === 'shallowWater' ? 'bridge' : 'road';
}
