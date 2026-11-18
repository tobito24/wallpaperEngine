import { TOWN_BIOME, biomeAt } from '../biome/biome';
import type { Biome } from '../biome/biome';
import { ELEVATION_SEA_LEVEL } from '../config/constants';
import { elevationNoise } from '../elevation/elevationNoise';
import { CLIFF_LAYOUT_REACH_TILES, layoutCliffs } from '../elevation/cliffLayout';
import type { CliffLayout } from '../elevation/cliffLayout';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import type { CliffType } from '../elevation/heightLevel';
import {
  LEVEL_CLEANUP_REACH_TILES,
  WATER_LIMIT_REACH_TILES,
  cleanHeightLevels,
  limitLevelsNearWater,
} from '../elevation/levelCleanup';
import { moistureNoise } from '../moisture/moistureNoise';
import { stairsOf, tileKey } from '../road/crossingStairs';
import type { StairsTile } from '../road/crossingStairs';
import { crossingsOf, flattenCrossings } from '../road/crossingTerrain';
import { roadEdgesIn } from '../road/roadEdge';
import { ROAD_TILE_MARK, roadTilesIn } from '../road/roadMask';
import { temperatureNoise } from '../temperature/temperatureNoise';
import { groundOf } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { townPathAt } from '../town/townLayout';
import type { Town } from '../town/townPlacement';
import { levelWithTown, townInfoAt } from '../town/townTerrain';
import type { TownTileInfo } from '../town/townTerrain';

const LEVEL_BLOCK_MARGIN = CLIFF_LAYOUT_REACH_TILES + LEVEL_CLEANUP_REACH_TILES + WATER_LIMIT_REACH_TILES;
const RECLAIMED_LAND_ELEVATION = ELEVATION_SEA_LEVEL + 0.001;

export interface TerrainBlock {
  readonly minX: number;
  readonly minY: number;
  readonly size: number;
  readonly elevations: Float64Array;
  readonly levels: Uint8Array;
  readonly biomes: readonly Biome[];
  readonly townInfos: readonly (TownTileInfo | null)[];
  readonly insideTowns: readonly (Town | null)[];
  readonly grounds: readonly Ground[];
  readonly roads: Uint8Array;
  readonly stairs: ReadonlyMap<string, StairsTile>;
  readonly cliffLayout: CliffLayout;
}

export function terrainBlockAt(minX: number, minY: number, size: number): TerrainBlock {
  const levelBlockSize = size + 2 * LEVEL_BLOCK_MARGIN;
  const levelBlockMinX = minX - LEVEL_BLOCK_MARGIN;
  const levelBlockMinY = minY - LEVEL_BLOCK_MARGIN;
  const levelBlockElevations = new Float64Array(levelBlockSize * levelBlockSize);
  const levelBlockLevels = new Uint8Array(levelBlockSize * levelBlockSize);
  const levelBlockTownInfos: (TownTileInfo | null)[] = [];
  for (let by = 0; by < levelBlockSize; by++) {
    for (let bx = 0; bx < levelBlockSize; bx++) {
      const worldX = levelBlockMinX + bx;
      const worldY = levelBlockMinY + by;
      const blockIndex = by * levelBlockSize + bx;
      levelBlockElevations[blockIndex] = elevationNoise(worldX, worldY);
      const townInfo = townInfoAt(worldX, worldY);
      levelBlockTownInfos.push(townInfo);
      levelBlockLevels[blockIndex] = levelWithTown(
        heightLevelAt(worldX, worldY, levelBlockElevations[blockIndex]),
        townInfo,
      );
    }
  }
  const crossings = crossingsOf(roadEdgesIn(levelBlockMinX, levelBlockMinY, levelBlockSize, levelBlockSize));
  flattenCrossings(levelBlockLevels, levelBlockMinX, levelBlockMinY, levelBlockSize, crossings);
  const stairs = stairsOf(crossings);
  const levelBlockCleanedLevels = cleanHeightLevels(
    limitLevelsNearWater(levelBlockLevels, levelBlockSize),
    levelBlockSize,
  );
  const levelBlockCliffLayout = layoutCliffs(levelBlockCleanedLevels, levelBlockSize);

  const elevations = new Float64Array(size * size);
  const levels = new Uint8Array(size * size);
  const cliffTypes: (CliffType | null)[] = [];
  const innerRingIndices = new Int8Array(size * size);
  const biomes: Biome[] = [];
  const townInfos: (TownTileInfo | null)[] = [];
  const insideTowns: (Town | null)[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = y * size + x;
      const blockIndex = (y + LEVEL_BLOCK_MARGIN) * levelBlockSize + x + LEVEL_BLOCK_MARGIN;
      levels[index] = levelBlockCleanedLevels[blockIndex];
      cliffTypes.push(levelBlockCliffLayout.cliffTypes[blockIndex]);
      innerRingIndices[index] = levelBlockCliffLayout.innerRingIndices[blockIndex];
      elevations[index] =
        levels[index] > WATER_LEVEL && levelBlockElevations[blockIndex] <= ELEVATION_SEA_LEVEL
          ? RECLAIMED_LAND_ELEVATION
          : levelBlockElevations[blockIndex];
      const townInfo = levelBlockTownInfos[blockIndex];
      townInfos.push(townInfo);
      insideTowns.push(townInfo?.zone === 'core' ? townInfo.town : null);
      biomes.push(
        townInfo?.zone === 'core'
          ? TOWN_BIOME
          : biomeAt(
              elevations[index],
              moistureNoise(minX + x, minY + y),
              temperatureNoise(minX + x, minY + y),
            ),
      );
    }
  }

  const roads = roadTilesIn(minX, minY, size, size);
  const grounds = biomes.map((biome, index) => {
    const worldX = minX + (index % size);
    const worldY = minY + Math.floor(index / size);
    const town = insideTowns[index];
    const isRoad = roads[index] === ROAD_TILE_MARK || (town !== null && townPathAt(town, worldX, worldY));
    return groundOf(biome.id, {
      isRoad,
      isInsideTown:
        town !== null ||
        (isRoad && (townInfos[index]?.zone === 'margin' || townInfos[index]?.zone === 'hole')),
      isStairs: stairs.has(tileKey(worldX, worldY)),
    });
  });

  return {
    minX,
    minY,
    size,
    elevations,
    levels,
    biomes,
    townInfos,
    insideTowns,
    grounds,
    roads,
    stairs,
    cliffLayout: { cliffTypes, innerRingIndices },
  };
}
