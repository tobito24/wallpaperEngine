import { TOWN_BIOME, biomeAt } from '../biome/biome';
import type { Biome } from '../biome/biome';
import { CHUNK_SIZE } from '../config/constants';
import { elevationNoise } from '../elevation/elevationNoise';
import { cliffTypeOf, heightLevelAt } from '../elevation/heightLevel';
import { moistureNoise } from '../moisture/moistureNoise';
import { ROAD_TILE_MARK, roadTilesIn } from '../road/roadMask';
import { temperatureNoise } from '../temperature/temperatureNoise';
import type { Town } from '../town/townPlacement';
import { townDecorationAt } from '../town/townLayout';
import { levelWithTown, townInfoAt } from '../town/townTerrain';
import { NEIGHBOUR_OFFSETS, autotileIndexFor } from '../tileset/autotile';
import type { SheetTile } from '../tileset/outsideSheet';
import { groundWithRoad } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { continuesInto, underlayGround } from '../tileset/groundRank';
import { Tile } from './Tile';

const BORDER_COLOR = '#ffcc00';
const PADDED_SIZE = CHUNK_SIZE + 2;

const QUARTER_NEIGHBOUR_OFFSETS: readonly (readonly [number, number, number, number, number, number])[] = [
  [0, -1, -1, 0, -1, -1],
  [0, -1, 1, 0, 1, -1],
  [0, 1, -1, 0, -1, 1],
  [0, 1, 1, 0, 1, 1],
];

export class Chunk {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly tiles: readonly Tile[];
  lastSeenAtMs: number;

  constructor(chunkX: number, chunkY: number, nowMs: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;
    this.lastSeenAtMs = nowMs;

    const originX = chunkX * CHUNK_SIZE;
    const originY = chunkY * CHUNK_SIZE;
    const elevations = new Float64Array(PADDED_SIZE * PADDED_SIZE);
    const levels = new Uint8Array(PADDED_SIZE * PADDED_SIZE);
    const biomes: Biome[] = [];
    const insideTowns: (Town | null)[] = [];
    for (let py = 0; py < PADDED_SIZE; py++) {
      for (let px = 0; px < PADDED_SIZE; px++) {
        const worldX = originX + px - 1;
        const worldY = originY + py - 1;
        const index = py * PADDED_SIZE + px;
        elevations[index] = elevationNoise(worldX, worldY);
        const townInfo = townInfoAt(worldX, worldY);
        levels[index] = levelWithTown(heightLevelAt(worldX, worldY, elevations[index]), townInfo);
        insideTowns.push(townInfo?.inside ? townInfo.town : null);
        biomes.push(
          townInfo?.inside
            ? TOWN_BIOME
            : biomeAt(elevations[index], moistureNoise(worldX, worldY), temperatureNoise(worldX, worldY)),
        );
      }
    }

    const roads = roadTilesIn(originX - 1, originY - 1, PADDED_SIZE, PADDED_SIZE);
    const grounds: Ground[] = biomes.map((biome, index) =>
      groundWithRoad(biome.id, roads[index] === ROAD_TILE_MARK),
    );

    const tiles: Tile[] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const index = (ly + 1) * PADDED_SIZE + (lx + 1);
        const level = levels[index];
        const cliffType = cliffTypeOf(level, {
          north: levels[index - PADDED_SIZE],
          northEast: levels[index - PADDED_SIZE + 1],
          east: levels[index + 1],
          southEast: levels[index + PADDED_SIZE + 1],
          south: levels[index + PADDED_SIZE],
          southWest: levels[index + PADDED_SIZE - 1],
          west: levels[index - 1],
          northWest: levels[index - PADDED_SIZE - 1],
        });

        const town = insideTowns[index];
        const decoration: SheetTile | null = town ? townDecorationAt(town, originX + lx, originY + ly) : null;

        const ground = grounds[index];
        let neighbourMask = 0;
        for (const { dx, dy, bit } of NEIGHBOUR_OFFSETS) {
          if (continuesInto(ground, grounds[index + dy * PADDED_SIZE + dx])) neighbourMask |= bit;
        }

        let underlays: (Ground | null)[] | null = null;
        QUARTER_NEIGHBOUR_OFFSETS.forEach(
          ([verticalDx, verticalDy, horizontalDx, horizontalDy, diagonalDx, diagonalDy], quarter) => {
            const underlay = underlayGround(
              ground,
              grounds[index + verticalDy * PADDED_SIZE + verticalDx],
              grounds[index + horizontalDy * PADDED_SIZE + horizontalDx],
              grounds[index + diagonalDy * PADDED_SIZE + diagonalDx],
            );
            if (underlay === null) return;
            underlays ??= [null, null, null, null];
            underlays[quarter] = underlay;
          },
        );

        tiles.push(
          new Tile(
            originX + lx,
            originY + ly,
            elevations[index],
            level,
            cliffType,
            biomes[index],
            ground,
            autotileIndexFor(neighbourMask),
            underlays,
            decoration,
          ),
        );
      }
    }
    this.tiles = tiles;
  }

  drawBorder(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, sizePx: number): void {
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX + 0.5, screenY + 0.5, sizePx - 1, sizePx - 1);
  }
}
