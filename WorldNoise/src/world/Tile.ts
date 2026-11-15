import type { Biome } from '../biome/biome';
import { CLIFF_EDGE_SIZE_DIVISOR } from '../config/constants';
import { CLIFF_EDGE_COLOR, shadeForHeightLevel } from '../elevation/color';
import type { CliffEdges } from '../elevation/heightLevel';
import { drawGroundFill } from '../tileset/groundSheets';

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  readonly elevation: number;
  readonly heightLevel: number;
  readonly cliffEdges: CliffEdges;
  readonly biome: Biome;

  constructor(
    worldX: number,
    worldY: number,
    elevation: number,
    heightLevel: number,
    cliffEdges: CliffEdges,
    biome: Biome,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.elevation = elevation;
    this.heightLevel = heightLevel;
    this.cliffEdges = cliffEdges;
    this.biome = biome;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, size: number): void {
    if (!drawGroundFill(ctx, this.biome.ground, screenX, screenY, size)) {
      ctx.fillStyle = this.biome.color;
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
