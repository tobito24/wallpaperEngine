import { CLIFF_EDGE_COLOR, colorForElevation, shadeForHeightLevel } from '../elevation/color';
import type { CliffEdges } from '../elevation/heightLevel';

const CLIFF_EDGE_SIZE_DIVISOR = 8;

export class Tile {
  readonly worldX: number;
  readonly worldY: number;
  readonly elevation: number;
  readonly heightLevel: number;
  readonly cliffEdges: CliffEdges;

  constructor(
    worldX: number,
    worldY: number,
    elevation: number,
    heightLevel: number,
    cliffEdges: CliffEdges,
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.elevation = elevation;
    this.heightLevel = heightLevel;
    this.cliffEdges = cliffEdges;
  }

  draw(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, size: number): void {
    ctx.fillStyle = colorForElevation(this.elevation);
    ctx.fillRect(screenX, screenY, size, size);

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
