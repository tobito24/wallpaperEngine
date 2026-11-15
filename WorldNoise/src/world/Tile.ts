import type { Biome } from '../biome/biome';
import { CLIFF_EDGE_SIZE_DIVISOR } from '../config/constants';
import { CLIFF_EDGE_COLOR, shadeForHeightLevel } from '../elevation/color';
import type { CliffEdges } from '../elevation/heightLevel';
import { fallbackColorOf } from '../tileset/ground';
import type { Ground } from '../tileset/ground';
import { drawGroundAutotile } from '../tileset/groundSheets';

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  readonly elevation: number;
  readonly heightLevel: number;
  readonly cliffEdges: CliffEdges;
  readonly biome: Biome;
  readonly ground: Ground;
  readonly autotileIndex: number;

  constructor(
    worldX: number,
    worldY: number,
    elevation: number,
    heightLevel: number,
    cliffEdges: CliffEdges,
    biome: Biome,
    ground: Ground,
    autotileIndex: number,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.elevation = elevation;
    this.heightLevel = heightLevel;
    this.cliffEdges = cliffEdges;
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

    const shade = shadeForHeightLevel(this.heightLevel);
    if (shade) {
      ctx.fillStyle = shade;
      ctx.fillRect(screenX, screenY, size, size);
    }

    const edgeSize = Math.max(1, Math.floor(size / CLIFF_EDGE_SIZE_DIVISOR));
    ctx.fillStyle = CLIFF_EDGE_COLOR;
    if (this.cliffEdges.north) ctx.fillRect(screenX, screenY, size, edgeSize);
    if (this.cliffEdges.south) ctx.fillRect(screenX, screenY + size - edgeSize, size, edgeSize);
    if (this.cliffEdges.west) ctx.fillRect(screenX, screenY, edgeSize, size);
    if (this.cliffEdges.east) ctx.fillRect(screenX + size - edgeSize, screenY, edgeSize, size);
  }
}
