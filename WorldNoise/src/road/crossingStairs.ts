import { EAST_WEST_STAIRS_FIRST_ROW_OFFSET_TILES, EAST_WEST_STAIRS_ROWS } from './roadCrossing';
import type { RoadCrossing, Side } from './roadCrossing';

const ROAD_WIDTH_TILES = 3;
const ROAD_FIRST_LANE_OFFSET_TILES = -1;
const EAST_WEST_STAIRS_COLUMNS = 2;

export type StairsTile =
  | { readonly kind: 'northSouth'; readonly edge: 'northEdge' | 'southEdge'; readonly widthIndex: number }
  | {
      readonly kind: 'eastWest';
      readonly upperSide: Side;
      readonly columnIndex: number;
      readonly rowIndex: number;
    };

export function tileKey(tileX: number, tileY: number): string {
  return `${tileX},${tileY}`;
}

function addNorthSouthStairs(stairs: Map<string, StairsTile>, crossing: RoadCrossing): void {
  const upperIsNorth = crossing.upperSide === -1;
  const tileY = upperIsNorth ? crossing.boundary - 1 : crossing.boundary;
  for (let widthIndex = 0; widthIndex < ROAD_WIDTH_TILES; widthIndex++) {
    const tileX = crossing.lane + ROAD_FIRST_LANE_OFFSET_TILES + widthIndex;
    stairs.set(tileKey(tileX, tileY), {
      kind: 'northSouth',
      edge: upperIsNorth ? 'southEdge' : 'northEdge',
      widthIndex,
    });
  }
}

function addEastWestStairs(stairs: Map<string, StairsTile>, crossing: RoadCrossing): void {
  for (let columnIndex = 0; columnIndex < EAST_WEST_STAIRS_COLUMNS; columnIndex++) {
    for (let rowIndex = 0; rowIndex < EAST_WEST_STAIRS_ROWS; rowIndex++) {
      const tileX = crossing.boundary - 1 + columnIndex;
      const tileY = crossing.lane + EAST_WEST_STAIRS_FIRST_ROW_OFFSET_TILES + rowIndex;
      stairs.set(tileKey(tileX, tileY), {
        kind: 'eastWest',
        upperSide: crossing.upperSide,
        columnIndex,
        rowIndex,
      });
    }
  }
}

export function stairsOf(crossings: readonly RoadCrossing[]): Map<string, StairsTile> {
  const stairs = new Map<string, StairsTile>();
  for (const crossing of crossings) {
    if (crossing.travelAxis === 'y') addNorthSouthStairs(stairs, crossing);
    else addEastWestStairs(stairs, crossing);
  }
  return stairs;
}
