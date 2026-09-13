import type { Camera } from '../core/Camera';
import type { ColorSimulation } from '../simulation/ColorSimulation';

interface WallpaperProperty {
  value: number | string | boolean;
}

interface WallpaperPropertyListener {
  applyUserProperties(properties: Record<string, WallpaperProperty | undefined>): void;
}

declare global {
  interface Window {
    wallpaperPropertyListener?: WallpaperPropertyListener;
  }
}

const TILE_SIZE_PROPERTY_KEY = 'slider_tilesize';
const TICK_RATE_PROPERTY_KEY = 'slider_tickrate';

export function attachWallpaperPropertyListener(camera: Camera, colorSimulation: ColorSimulation): void {
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
      const tileSize = properties[TILE_SIZE_PROPERTY_KEY];
      if (tileSize && typeof tileSize.value === 'number') {
        camera.setTileSize(tileSize.value);
      }

      const tickRate = properties[TICK_RATE_PROPERTY_KEY];
      if (tickRate && typeof tickRate.value === 'number') {
        colorSimulation.setTickIntervalMs(tickRate.value);
      }
    },
  };
}
