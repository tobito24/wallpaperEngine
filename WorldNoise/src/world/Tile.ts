import type { Biome } from '../biome/biome';
import { shadeForHeightLevel } from '../elevation/color';
import type { CliffType } from '../elevation/heightLevel';
import { drawCliff } from '../tileset/cliffTiles';
import { drawOutsideTile } from '../tileset/outsideSheet';
import type { SheetTile } from '../tileset/outsideSheet';
import { fallbackColorOf } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { drawGroundAutotile, drawGroundUnderlay } from '../tileset/groundSheets';

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
  readonly decoration: SheetTile | null;

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
    decoration: SheetTile | null,
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
    this.decoration = decoration;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    size: number,
    animationFrame: number,
  ): void {
    if (this.underlays) drawGroundUnderlay(ctx, this.underlays, animationFrame, screenX, screenY, size);
    if (!drawGroundAutotile(ctx, this.ground, this.autotileIndex, animationFrame, screenX, screenY, size)) {
      ctx.fillStyle = fallbackColorOf(this.ground);
      ctx.fillRect(screenX, screenY, size, size);
    }

    if (this.cliffType) {
      if (this.cliffUnderlays)
        drawGroundUnderlay(ctx, this.cliffUnderlays, animationFrame, screenX, screenY, size);
      drawCliff(ctx, this.cliffType, this.heightLevel, screenX, screenY, size);
    }

    if (this.decoration) drawOutsideTile(ctx, this.decoration, screenX, screenY, size);

    const shade = shadeForHeightLevel(this.heightLevel);
    if (shade) {
      ctx.fillStyle = shade;
      ctx.fillRect(screenX, screenY, size, size);
    }
  }
}
