import { TICK_INTERVAL_DEFAULT_MS, MIN_TICK_INTERVAL_MS, MAX_TICK_INTERVAL_MS } from '../config/constants';
import { beatingColor } from './Color';
import type { TileColor } from './Color';
import type { World } from '../world/World';
import type { Tile } from '../world/Tile';

export class ColorSimulation {
  tickIntervalMs = TICK_INTERVAL_DEFAULT_MS;
  private accumulatedMs = 0;

  setTickIntervalMs(value: number): void {
    this.tickIntervalMs = Math.min(MAX_TICK_INTERVAL_MS, Math.max(MIN_TICK_INTERVAL_MS, value));
  }

  update(dtMs: number, world: World): void {
    this.accumulatedMs += dtMs;
    if (this.accumulatedMs < this.tickIntervalMs) return;
    this.accumulatedMs = 0;
    this.step(world);
  }

  // no cascading/recursive spread within one step
  private step(world: World): void {
    const nextColors = new Map<Tile, TileColor>();

    for (const chunk of world.getLoadedChunks()) {
      for (const tile of chunk.tiles) {
        if (tile.color === 'none') {
          const neigborColors = [
            world.getLoadedTile(tile.worldX, tile.worldY - 1)?.color,
            world.getLoadedTile(tile.worldX + 1, tile.worldY)?.color,
            world.getLoadedTile(tile.worldX, tile.worldY + 1)?.color,
            world.getLoadedTile(tile.worldX - 1, tile.worldY)?.color,
          ].filter((color): color is TileColor => color !== undefined && color !== 'none');

          if (neigborColors.length === 0) continue;

          const randomNeighborColor = neigborColors[Math.floor(Math.random() * neigborColors.length)];
          nextColors.set(tile, randomNeighborColor);
          continue;
        }

        const beater = beatingColor(tile.color);
        const beatenByNeighbor =
          beater !== null &&
          (world.getLoadedTile(tile.worldX, tile.worldY - 1)?.color === beater ||
            world.getLoadedTile(tile.worldX + 1, tile.worldY)?.color === beater ||
            world.getLoadedTile(tile.worldX, tile.worldY + 1)?.color === beater ||
            world.getLoadedTile(tile.worldX - 1, tile.worldY)?.color === beater);

        nextColors.set(tile, beatenByNeighbor ? (beater as TileColor) : tile.color);
      }
    }

    for (const [tile, color] of nextColors) {
      tile.color = color;
    }
  }
}
