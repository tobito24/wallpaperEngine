import { MIN_TILE_SIZE, MAX_TILE_SIZE } from '../config/constants';
import type { Camera } from '../core/Camera';
import type { Ticker } from '../core/Ticker';

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

// slider_tilesize in public/project.json is this 0-100 range, not MIN_TILE_SIZE/MAX_TILE_SIZE px
const TILE_SIZE_SLIDER_MIN = 0;
const TILE_SIZE_SLIDER_MAX = 100;

function tileSizeFromSliderPosition(position: number): number {
  const t = (position - TILE_SIZE_SLIDER_MIN) / (TILE_SIZE_SLIDER_MAX - TILE_SIZE_SLIDER_MIN);
  return Math.round(MIN_TILE_SIZE * (MAX_TILE_SIZE / MIN_TILE_SIZE) ** t);
}

export function attachWallpaperPropertyListener(camera: Camera, ticker: Ticker): void {
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
      const tileSize = properties[TILE_SIZE_PROPERTY_KEY];
      if (tileSize && typeof tileSize.value === 'number') {
        camera.setTileSize(tileSizeFromSliderPosition(tileSize.value));
      }

      const tickRate = properties[TICK_RATE_PROPERTY_KEY];
      if (tickRate && typeof tickRate.value === 'number') {
        ticker.setTickIntervalMs(tickRate.value);
      }
    },
  };
}
