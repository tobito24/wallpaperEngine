import type { BiomeId } from '../biome/biome';

export type OverlayGround = 'road' | 'bridge' | 'cityStreet' | 'city' | 'cityGrass';

export type Ground = BiomeId | OverlayGround;

const FALLBACK_COLOR: Readonly<Record<Ground, string>> = {
  deepWater: '#1f4e79',
  shallowWater: '#2f6fa7',
  beach: '#d9c88f',
  snowField: '#f2f2f2',
  tundra: '#d3dde3',
  snowForest: '#a9bfb8',
  steppe: '#b59b5a',
  meadow: '#86b85c',
  forest: '#3f7a3a',
  desert: '#e6c97c',
  savanna: '#c08a43',
  jungle: '#2a6a3a',
  mountain: '#6b6459',
  snowPeak: '#ffffff',
  road: '#9a8f7a',
  bridge: '#8b5a2b',
  cityStreet: '#8d8f99',
  city: '#c9ccd2',
  cityGrass: '#9fd68a',
};

export interface GroundContext {
  readonly isRoad: boolean;
  readonly isInsideTown: boolean;
  readonly isStairs: boolean;
}

export function groundOf(biomeId: BiomeId, context: GroundContext): Ground {
  if (context.isInsideTown) return context.isRoad && !context.isStairs ? 'cityStreet' : 'city';
  if (!context.isRoad || context.isStairs) return biomeId;
  return biomeId === 'deepWater' || biomeId === 'shallowWater' ? 'bridge' : 'road';
}

export function isRoadGround(ground: Ground): boolean {
  return ground === 'road' || ground === 'bridge' || ground === 'cityStreet';
}

export function fallbackColorOf(ground: Ground): string {
  return FALLBACK_COLOR[ground];
}
