import type { Biome } from '../biome/biome';
import { shadeForHeightLevel } from '../elevation/color';
import type { CliffType } from '../elevation/heightLevel';
import { drawCliff } from '../tileset/cliffTiles';
import { fallbackColorOf } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { drawGroundAutotile } from '../tileset/groundSheets';

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  readonly elevation: number;
  readonly heightLevel: number;
  readonly cliffType: CliffType | null;
  readonly biome: Biome;
  readonly ground: Ground;
  readonly autotileIndex: number;

  constructor(
    worldX: number,
    worldY: number,
    elevation: number,
    heightLevel: number,
    cliffType: CliffType | null,
    biome: Biome,
    ground: Ground,
    autotileIndex: number,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.elevation = elevation;
    this.heightLevel = heightLevel;
    this.cliffType = cliffType;
    this.biome = biome;
    this.ground = ground;
    this.autotileIndex = autotileIndex;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    size: number,
    animationFrame: number,
  ): void {
    if (!drawGroundAutotile(ctx, this.ground, this.autotileIndex, animationFrame, screenX, screenY, size)) {
      ctx.fillStyle = fallbackColorOf(this.ground, this.biome);
      ctx.fillRect(screenX, screenY, size, size);
    }

    if (this.cliffType) drawCliff(ctx, this.cliffType, this.heightLevel, screenX, screenY, size);

    const shade = shadeForHeightLevel(this.heightLevel);
    if (shade) {
      ctx.fillStyle = shade;
      ctx.fillRect(screenX, screenY, size, size);
    }
  }
}
