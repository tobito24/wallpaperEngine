import Alea from 'alea';
import { SEED, TOWN_CACHE_MAX_ENTRIES, TOWN_DOOR_PATH_MAX_TILES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { ROAD_TILE_MARK } from '../road/roadMask';
import type { UrbanInstance } from '../urban/urbanInstance';
import { assignBuildings } from './townAssignment';
import type { Placement } from './townAssignment';
import { townGridOf } from './townGrid';
import { planPathNetwork } from './townPathNetwork';
import type { Town } from './townPlacement';
import { townPlanOf } from './townPlan';

interface TownLayout {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  readonly buildings: readonly UrbanInstance[];
  readonly paths: ReadonlySet<number>;
}

const NEIGHBOUR_STEPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

const layoutCache = new Map<string, TownLayout>();

function computeLayout(town: Town): TownLayout {
  const random = Alea(`${SEED}:townAssignment:${town.cx}:${town.cy}`);
  const { minX, minY, width, height, roads, usable } = townGridOf(town);
  const plan = townPlanOf(town);
  const placements = assignBuildings(town, plan.lots, random);

  const buildingMask = new Uint8Array(width * height);
  const indexOf = (worldX: number, worldY: number): number => (worldY - minY) * width + (worldX - minX);
  for (const { item, x, y } of placements) {
    for (let dy = 0; dy < item.sprite.height; dy++) {
      for (let dx = 0; dx < item.sprite.width; dx++) buildingMask[indexOf(x + dx, y + dy)] = 1;
    }
  }

  const walkable = new Uint8Array(width * height);
  for (let index = 0; index < walkable.length; index++) {
    walkable[index] =
      usable[index] === 1 && plan.streetMask[index] === 0 && buildingMask[index] === 0 ? 1 : 0;
  }

  const isStreet = (index: number): boolean =>
    roads[index] === ROAD_TILE_MARK || plan.streetMask[index] === 1;
  const streetTiles: number[] = [];
  for (let index = 0; index < walkable.length; index++) {
    if (!walkable[index]) continue;
    const tileX = index % width;
    const tileY = Math.floor(index / width);
    const touchesStreet = NEIGHBOUR_STEPS.some(([dx, dy]) => {
      const nx = tileX + dx;
      const ny = tileY + dy;
      return nx >= 0 && ny >= 0 && nx < width && ny < height && isStreet(ny * width + nx);
    });
    if (touchesStreet) streetTiles.push(index);
  }

  const needsPaths = (placement: Placement): boolean => placement.frontRows + placement.setbackRows > 0;
  const pathPlacements = placements.filter(needsPaths);
  const strips = pathPlacements.map(({ item, x, y, lot: lotIndex, frontRows, setbackRows }) => {
    const lot = plan.lots[lotIndex];
    const bottomRow = lot.y + lot.depth - 1;
    const tiles: number[] = [];
    if (frontRows > 0) {
      for (let column = lot.x; column < lot.x + lot.width; column++) tiles.push(indexOf(column, bottomRow));
    }
    for (let row = 0; row < setbackRows; row++) {
      tiles.push(indexOf(x + item.doorColumn, y + item.sprite.height + row));
    }
    return tiles;
  });
  const network = planPathNetwork({
    width,
    height,
    walkable,
    streetTiles,
    strips,
    maxLength: TOWN_DOOR_PATH_MAX_TILES,
  });
  const connectedPlacements = new Set<Placement>(
    pathPlacements.filter((_, index) => network.connected[index]),
  );

  const buildings: UrbanInstance[] = placements
    .filter((placement) => !needsPaths(placement) || connectedPlacements.has(placement))
    .map(({ item, x, y }) => ({ item, x, y, level: town.plateauLevel }));

  const paths = new Set<number>(network.tiles);
  for (let index = 0; index < plan.streetMask.length; index++) if (plan.streetMask[index]) paths.add(index);
  return { minX, minY, width, height, buildings, paths };
}

function layoutOf(town: Town): TownLayout {
  return remember(layoutCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () => computeLayout(town));
}

function isInLayout(layout: TownLayout, tileX: number, tileY: number): boolean {
  return (
    tileX >= layout.minX &&
    tileX < layout.minX + layout.width &&
    tileY >= layout.minY &&
    tileY < layout.minY + layout.height
  );
}

export function townPathAt(town: Town, tileX: number, tileY: number): boolean {
  const layout = layoutOf(town);
  if (!isInLayout(layout, tileX, tileY)) return false;
  return layout.paths.has((tileY - layout.minY) * layout.width + (tileX - layout.minX));
}

export function townBuildingsOf(town: Town): readonly UrbanInstance[] {
  return layoutOf(town).buildings;
}
