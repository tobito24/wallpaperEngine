import type { Biome, BiomeGround } from '../biome/biome';

export type OverlayGround = 'road' | 'bridge';

export type Ground = BiomeGround | OverlayGround;

const OVERLAY_FALLBACK_COLOR: Readonly<Record<OverlayGround, string>> = {
  road: '#9a8f7a',
  bridge: '#8b5a2b',
};

export function groundWithRoad(biomeGround: BiomeGround, isRoad: boolean): Ground {
  if (!isRoad) return biomeGround;
  return biomeGround === 'deepWater' || biomeGround === 'shallowWater' ? 'bridge' : 'road';
}

export function fallbackColorOf(ground: Ground, biome: Biome): string {
  return ground === 'road' || ground === 'bridge' ? OVERLAY_FALLBACK_COLOR[ground] : biome.color;
}
