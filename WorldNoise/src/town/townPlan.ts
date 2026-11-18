import Alea from 'alea';
import { SEED, TOWN_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { townGridOf } from './townGrid';
import { planLots } from './townLots';
import type { TownLots } from './townLots';
import { planSideStreets } from './townSideStreets';
import type { SideStreet } from './townSideStreets';
import type { Town } from './townPlacement';
import { townStreets } from './townStreets';

export interface TownPlan extends TownLots {
  readonly sideStreets: readonly SideStreet[];
}

const planCache = new Map<string, TownPlan>();

function computePlan(town: Town): TownPlan {
  const random = Alea(`${SEED}:townPlan:${town.cx}:${town.cy}`);
  const grid = townGridOf(town);
  const { streets, mask } = planSideStreets(grid, townStreets(town), random);
  return { sideStreets: streets, ...planLots(grid, mask, random) };
}

export function townPlanOf(town: Town): TownPlan {
  return remember(planCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () => computePlan(town));
}
