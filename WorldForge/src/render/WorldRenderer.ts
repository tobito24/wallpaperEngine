import { TILESET_TILE_SIZE } from '../config/constants';
import type { Camera } from '../core/Camera';
import type { WorldStreamer } from '../world/chunk/WorldStreamer';
import { getTile, type TileSprite } from '../world/tile/TileRegistry';
import { pickSprite, hashToUnitFloat } from '../world/generate/borderBlend';
import { pickAutotileSprite, type NeighborMaterials } from '../world/tile/autotile';
import type { WorldTile } from '../world/grid/WorldTile';
import { TilesetImage } from './TilesetImage';

const BASE_SPRITE_SALT = 44;
const OVERLAY_SPRITE_SALT = 55;
const DECO_SPRITE_SALT = 66;
const DITHER_SALT = 77;

export class WorldRenderer {
  private readonly tileset: TilesetImage;

  constructor(tileset: TilesetImage) {
    this.tileset = tileset;
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    streamer: WorldStreamer,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const bounds = camera.getVisibleTileBounds(viewportWidth, viewportHeight);

    for (let worldY = bounds.minY; worldY <= bounds.maxY; worldY++) {
      for (let worldX = bounds.minX; worldX <= bounds.maxX; worldX++) {
        const tile = streamer.getTile(worldX, worldY);
        const screen = camera.worldToScreen(worldX, worldY, viewportWidth, viewportHeight);

        const baseSprite = this.resolveBaseSprite(streamer, tile, worldX, worldY);
        this.drawSprite(ctx, baseSprite, screen.x, screen.y, camera.tileSize);

        if (tile.overlay) {
          this.drawLayer(
            ctx,
            tile.overlay,
            worldX,
            worldY,
            screen.x,
            screen.y,
            camera.tileSize,
            OVERLAY_SPRITE_SALT,
          );
        }
        if (tile.deco) {
          this.drawLayer(
            ctx,
            tile.deco,
            worldX,
            worldY,
            screen.x,
            screen.y,
            camera.tileSize,
            DECO_SPRITE_SALT,
          );
        }
      }
    }
  }

  /**
   * Base layer only: draws a flat tile when all 8 neighbors share this tile's material, an authored
   * autotile edge/corner sprite when one applies (see world/tile/autotile.ts), or a dithered mix of
   * this material and the differing neighbor when neither does (biome pairs with no authored art yet).
   */
  private resolveBaseSprite(
    streamer: WorldStreamer,
    tile: WorldTile,
    worldX: number,
    worldY: number,
  ): TileSprite {
    const neighbors: NeighborMaterials = {
      n: streamer.getTile(worldX, worldY - 1).base,
      e: streamer.getTile(worldX + 1, worldY).base,
      s: streamer.getTile(worldX, worldY + 1).base,
      w: streamer.getTile(worldX - 1, worldY).base,
      nw: streamer.getTile(worldX - 1, worldY - 1).base,
      ne: streamer.getTile(worldX + 1, worldY - 1).base,
      se: streamer.getTile(worldX + 1, worldY + 1).base,
      sw: streamer.getTile(worldX - 1, worldY + 1).base,
    };

    const isInterior = Object.values(neighbors).every((material) => material === tile.base);
    if (isInterior) {
      return pickSprite(getTile(tile.base), worldX, worldY, BASE_SPRITE_SALT);
    }

    const autotiled = pickAutotileSprite(tile.base, neighbors);
    if (autotiled) return autotiled;

    return this.pickDitherSprite(tile.base, neighbors, worldX, worldY);
  }

  /** Fallback for biome pairs with no authored transition set — softens the border instead of a hard edge. */
  private pickDitherSprite(
    material: string,
    neighbors: NeighborMaterials,
    worldX: number,
    worldY: number,
  ): TileSprite {
    const orthogonal = [neighbors.n, neighbors.e, neighbors.s, neighbors.w];
    const differing = orthogonal.filter((neighborMaterial) => neighborMaterial !== material);

    if (differing.length === 0) {
      return pickSprite(getTile(material), worldX, worldY, BASE_SPRITE_SALT);
    }

    const foreign = differing[0]!;
    const roll = hashToUnitFloat(worldX, worldY, DITHER_SALT);
    const chosen = roll < differing.length / 4 ? foreign : material;
    return pickSprite(getTile(chosen), worldX, worldY, BASE_SPRITE_SALT);
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    tileId: string,
    worldX: number,
    worldY: number,
    dx: number,
    dy: number,
    size: number,
    salt: number,
  ): void {
    const sprite = pickSprite(getTile(tileId), worldX, worldY, salt);
    this.drawSprite(ctx, sprite, dx, dy, size);
  }

  private drawSprite(
    ctx: CanvasRenderingContext2D,
    sprite: TileSprite,
    dx: number,
    dy: number,
    size: number,
  ): void {
    this.tileset.drawSprite(ctx, dx, dy, size, sprite.col, sprite.row, TILESET_TILE_SIZE);
  }
}
