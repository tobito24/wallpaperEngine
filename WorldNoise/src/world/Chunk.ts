import { CHUNK_SIZE } from '../config/constants';
import { NO_INNER_RING } from '../elevation/cliffLayout';
import { tileKey } from '../road/crossingStairs';
import { townDecorationAt } from '../town/townLayout';
import { NEIGHBOUR_OFFSETS, autotileIndexFor } from '../tileset/autotile';
import type { SheetTile } from '../tileset/outsideSheet';
import { groundOf, isRoadGround } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { lowerNeighbourGround } from '../tileset/cliffUnderlay';
import { continuesInto, underlayGround } from '../tileset/groundRank';
import { Tile } from './Tile';
import { terrainBlockAt } from './terrainBlock';

const BORDER_COLOR = '#ffcc00';
const CHUNK_LABEL_FONT = '12px monospace';
const CHUNK_LABEL_OFFSET_PX = 4;
const CHUNK_LABEL_BASELINE_PX = 14;
const PADDING = 1;
const PADDED_SIZE = CHUNK_SIZE + 2 * PADDING;

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
    const { elevations, levels, biomes, insideTowns, grounds, stairs, cliffLayout } = terrainBlockAt(
      originX - PADDING,
      originY - PADDING,
      PADDED_SIZE,
    );

    const tiles: Tile[] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const index = (ly + 1) * PADDED_SIZE + (lx + 1);
        const level = levels[index];
        const ground = grounds[index];
        const cliffType = cliffLayout.cliffTypes[index];
        const innerRingIndex = cliffLayout.innerRingIndices[index];

        const town = insideTowns[index];
        const decoration: SheetTile | null = town ? townDecorationAt(town, originX + lx, originY + ly) : null;

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

        let cliffUnderlays: (Ground | null)[] | null = null;
        if (cliffType) {
          QUARTER_NEIGHBOUR_OFFSETS.forEach(
            ([verticalDx, verticalDy, horizontalDx, horizontalDy, diagonalDx, diagonalDy], quarter) => {
              const verticalIndex = index + verticalDy * PADDED_SIZE + verticalDx;
              const horizontalIndex = index + horizontalDy * PADDED_SIZE + horizontalDx;
              const diagonalIndex = index + diagonalDy * PADDED_SIZE + diagonalDx;
              const lower = lowerNeighbourGround(
                level,
                levels[verticalIndex],
                grounds[verticalIndex],
                levels[horizontalIndex],
                grounds[horizontalIndex],
                levels[diagonalIndex],
                grounds[diagonalIndex],
              );
              if (lower === null) return;
              cliffUnderlays ??= [null, null, null, null];
              cliffUnderlays[quarter] = lower;
            },
          );
        }
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
            cliffUnderlays,
            innerRingIndex === NO_INNER_RING ? null : innerRingIndex,
            stairs.get(tileKey(originX + lx, originY + ly)) ?? null,
            decoration,
            isRoadGround(ground)
              ? groundOf(biomes[index].id, { isRoad: false, isInsideTown: town !== null, isStairs: false })
              : null,
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
    ctx.font = CHUNK_LABEL_FONT;
    ctx.fillStyle = BORDER_COLOR;
    ctx.fillText(
      `${this.chunkX},${this.chunkY}`,
      screenX + CHUNK_LABEL_OFFSET_PX,
      screenY + CHUNK_LABEL_BASELINE_PX,
    );
  }
}
