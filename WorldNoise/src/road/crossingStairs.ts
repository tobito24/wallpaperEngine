import type { RoadCrossing } from './roadCrossing';

const ROAD_WIDTH_TILES = 3;
const ROAD_FIRST_LANE_OFFSET_TILES = -1;

export interface NorthSouthStairs {
  readonly edge: 'northEdge' | 'southEdge';
  readonly widthIndex: number;
}

export function tileKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

export function northSouthStairsOf(crossings: readonly RoadCrossing[]): Map<string, NorthSouthStairs> {
  const stairs = new Map<string, NorthSouthStairs>();
  for (const crossing of crossings) {
    if (crossing.travelAxis !== 'y') continue;
    const upperIsNorth = crossing.upperSide === -1;
    const tileY = upperIsNorth ? crossing.boundary - 1 : crossing.boundary;
    for (let widthIndex = 0; widthIndex < ROAD_WIDTH_TILES; widthIndex++) {
      const tileX = crossing.lane + ROAD_FIRST_LANE_OFFSET_TILES + widthIndex;
      stairs.set(tileKey(tileX, tileY), { edge: upperIsNorth ? 'southEdge' : 'northEdge', widthIndex });
    }
  }
  return stairs;
}
