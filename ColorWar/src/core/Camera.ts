import { MIN_TILE_SIZE, MAX_TILE_SIZE } from '../config/constants';

export interface TileBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

/** Position in world tiles (fractional); zoom is tileSize in px. */
export class Camera {
  x: number;
  y: number;
  tileSize: number;

  constructor(x = 0, y = 0, tileSize = 32) {
    this.x = x;
    this.y = y;
    this.tileSize = tileSize;
  }

  setTileSize(tileSize: number): void {
    this.tileSize = Math.min(MAX_TILE_SIZE, Math.max(MIN_TILE_SIZE, tileSize));
  }

  zoomBy(deltaTileSize: number): void {
    this.setTileSize(this.tileSize + deltaTileSize);
  }

  zoomAtScreenPoint(
    deltaTileSize: number,
    screenX: number,
    screenY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const oldTileSize = this.tileSize;
    this.zoomBy(deltaTileSize);

    const offsetX = screenX - viewportWidth / 2;
    const offsetY = screenY - viewportHeight / 2;
    this.x += offsetX / oldTileSize - offsetX / this.tileSize;
    this.y += offsetY / oldTileSize - offsetY / this.tileSize;
  }

  pan(dxWorldTiles: number, dyWorldTiles: number): void {
    this.x += dxWorldTiles;
    this.y += dyWorldTiles;
  }

  getVisibleTileBounds(viewportWidth: number, viewportHeight: number): TileBounds {
    const halfCols = viewportWidth / 2 / this.tileSize;
    const halfRows = viewportHeight / 2 / this.tileSize;
    return {
      minX: Math.floor(this.x - halfCols) - 1,
      minY: Math.floor(this.y - halfRows) - 1,
      maxX: Math.ceil(this.x + halfCols) + 1,
      maxY: Math.ceil(this.y + halfRows) + 1,
    };
  }

  /** Floors to whole CSS px — a sub-pixel offset here shows up as visible seams between tiles. */
  worldToScreen(worldX: number, worldY: number, viewportWidth: number, viewportHeight: number): ScreenPoint {
    return {
      x: Math.floor((worldX - this.x) * this.tileSize + viewportWidth / 2),
      y: Math.floor((worldY - this.y) * this.tileSize + viewportHeight / 2),
    };
  }

  /** Inverse of worldToScreen — used to map a click/tap back to the world tile under it. */
  screenToWorld(
    screenX: number,
    screenY: number,
    viewportWidth: number,
    viewportHeight: number,
  ): ScreenPoint {
    return {
      x: this.x + (screenX - viewportWidth / 2) / this.tileSize,
      y: this.y + (screenY - viewportHeight / 2) / this.tileSize,
    };
  }
}
