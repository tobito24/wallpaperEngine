import { MIN_TILE_SIZE, MAX_TILE_SIZE } from '../config/constants';
import type { Camera } from '../core/Camera';
import type { ColorSimulation } from '../simulation/ColorSimulation';
import { isWorldPreset } from '../simulation/presets';
import type { World } from '../world/World';

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
const PRESET_PROPERTY_KEY = 'combo_preset';

// slider_tilesize in public/project.json is this 0-100 range, not MIN_TILE_SIZE/MAX_TILE_SIZE px
const TILE_SIZE_SLIDER_MIN = 0;
const TILE_SIZE_SLIDER_MAX = 100;

function tileSizeFromSliderPosition(position: number): number {
  const t = (position - TILE_SIZE_SLIDER_MIN) / (TILE_SIZE_SLIDER_MAX - TILE_SIZE_SLIDER_MIN);
  return Math.round(MIN_TILE_SIZE * (MAX_TILE_SIZE / MIN_TILE_SIZE) ** t);
}

export function attachWallpaperPropertyListener(
  camera: Camera,
  colorSimulation: ColorSimulation,
  world: World,
): void {
  window.wallpaperPropertyListener = {
    applyUserProperties(properties) {
      const tileSize = properties[TILE_SIZE_PROPERTY_KEY];
      if (tileSize && typeof tileSize.value === 'number') {
        camera.setTileSize(tileSizeFromSliderPosition(tileSize.value));
      }

      const tickRate = properties[TICK_RATE_PROPERTY_KEY];
      if (tickRate && typeof tickRate.value === 'number') {
        colorSimulation.setTickIntervalMs(tickRate.value);
      }

      const preset = properties[PRESET_PROPERTY_KEY];
      if (preset && isWorldPreset(preset.value)) {
        world.setPreset(preset.value);
        camera.resetPosition();
      }
    },
  };
}
