import type { Biome } from '../biome/biome';
import { shadeForHeightLevel } from '../elevation/color';
import type { CliffType } from '../elevation/heightLevel';
import type { StairsTile } from '../road/crossingStairs';
import { drawCliff, drawCliffTop, hasCliffSheet } from '../tileset/cliffTiles';
import { drawOutsideTile } from '../tileset/outsideSheet';
import type { SheetTile } from '../tileset/outsideSheet';
import { fallbackColorOf } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { drawGroundAutotile, drawGroundUnderlay } from '../tileset/groundSheets';
import { drawStairs } from '../tileset/stairsSheet';

const PLAIN_AUTOTILE_INDEX = 0;

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  readonly elevation: number;
  readonly heightLevel: number;
  readonly cliffType: CliffType | null;
  readonly biome: Biome;
  readonly ground: Ground;
  readonly autotileIndex: number;
  readonly underlays: readonly (Ground | null)[] | null;
  readonly cliffUnderlays: readonly (Ground | null)[] | null;
  readonly cliffTopAutotileIndex: number | null;
  readonly stairs: StairsTile | null;
  readonly decoration: SheetTile | null;
  readonly groundUnderRoad: Ground | null;

  constructor(
    worldX: number,
    worldY: number,
    elevation: number,
    heightLevel: number,
    cliffType: CliffType | null,
    biome: Biome,
    ground: Ground,
    autotileIndex: number,
    underlays: readonly (Ground | null)[] | null,
    cliffUnderlays: readonly (Ground | null)[] | null,
    cliffTopAutotileIndex: number | null,
    stairs: StairsTile | null,
    decoration: SheetTile | null,
    groundUnderRoad: Ground | null,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.elevation = elevation;
    this.heightLevel = heightLevel;
    this.cliffType = cliffType;
    this.biome = biome;
    this.ground = ground;
    this.autotileIndex = autotileIndex;
    this.underlays = underlays;
    this.cliffUnderlays = cliffUnderlays;
    this.cliffTopAutotileIndex = cliffTopAutotileIndex;
    this.stairs = stairs;
    this.decoration = decoration;
    this.groundUnderRoad = groundUnderRoad;
  }

  private drawGround(
    ctx: CanvasRenderingContext2D,
    ground: Ground,
    autotileIndex: number,
    animationFrame: number,
    screenX: number,
    screenY: number,
    size: number,
  ): void {
    if (!drawGroundAutotile(ctx, ground, autotileIndex, animationFrame, screenX, screenY, size)) {
      ctx.fillStyle = fallbackColorOf(ground);
      ctx.fillRect(screenX, screenY, size, size);
    }
  }

  private drawGroundWithRim(
    ctx: CanvasRenderingContext2D,
    animationFrame: number,
    screenX: number,
    screenY: number,
    size: number,
  ): void {
    if (this.underlays) drawGroundUnderlay(ctx, this.underlays, animationFrame, screenX, screenY, size);
    this.drawGround(ctx, this.ground, this.autotileIndex, animationFrame, screenX, screenY, size);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    size: number,
    animationFrame: number,
  ): void {
    if (this.groundUnderRoad) {
      this.drawGround(
        ctx,
        this.groundUnderRoad,
        PLAIN_AUTOTILE_INDEX,
        animationFrame,
        screenX,
        screenY,
        size,
      );
    } else {
      this.drawGroundWithRim(ctx, animationFrame, screenX, screenY, size);
    }

    if (this.cliffType && hasCliffSheet(this.heightLevel)) {
      if (this.cliffUnderlays)
        drawGroundUnderlay(ctx, this.cliffUnderlays, animationFrame, screenX, screenY, size);
      drawCliff(ctx, this.cliffType, this.heightLevel, screenX, screenY, size);
    } else if (this.cliffTopAutotileIndex !== null) {
      drawCliffTop(ctx, this.heightLevel, this.cliffTopAutotileIndex, screenX, screenY, size);
    }

    if (this.groundUnderRoad) this.drawGroundWithRim(ctx, animationFrame, screenX, screenY, size);

    if (this.stairs && hasCliffSheet(this.heightLevel)) drawStairs(ctx, this.stairs, screenX, screenY, size);

    if (this.decoration) drawOutsideTile(ctx, this.decoration, screenX, screenY, size);

    const shade = shadeForHeightLevel(this.heightLevel);
    if (shade) {
      ctx.fillStyle = shade;
      ctx.fillRect(screenX, screenY, size, size);
    }
  }
}
