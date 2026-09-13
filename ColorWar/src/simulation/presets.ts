import {
  PRESET_SPECKLE_DENSITY,
  PRESET_STRIPE_WIDTH_TILES,
  PRESET_RING_WIDTH_TILES,
} from '../config/constants';
import { CYCLE } from './Color';
import type { TileColor } from './Color';

export type WorldPreset = 'empty' | 'speckle' | 'sectors' | 'stripes' | 'rings';

export const WORLD_PRESETS: readonly WorldPreset[] = ['empty', 'speckle', 'sectors', 'stripes', 'rings'];

export function isWorldPreset(value: unknown): value is WorldPreset {
  return typeof value === 'string' && (WORLD_PRESETS as readonly string[]).includes(value);
}

// deterministic pseudo-random in [0, 1) from integer tile coords, so a preset looks the
// same after a chunk unloads and reloads instead of reshuffling every time
function hash2D(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

export function presetColorAt(preset: WorldPreset, worldX: number, worldY: number): TileColor {
  switch (preset) {
    case 'empty':
      return 'none';

    case 'speckle': {
      const r = hash2D(worldX, worldY);
      if (r >= PRESET_SPECKLE_DENSITY) return 'none';
      const colorIndex = Math.floor((r / PRESET_SPECKLE_DENSITY) * CYCLE.length);
      return CYCLE[Math.min(colorIndex, CYCLE.length - 1)];
    }

    case 'sectors': {
      if (worldX === 0 && worldY === 0) return CYCLE[0];
      const angle = Math.atan2(worldY, worldX) + Math.PI * 2;
      const sector = Math.floor((angle / (Math.PI * 2)) * CYCLE.length) % CYCLE.length;
      return CYCLE[sector];
    }

    case 'stripes': {
      const band = Math.floor(worldX / PRESET_STRIPE_WIDTH_TILES);
      const cycleIndex = ((band % CYCLE.length) + CYCLE.length) % CYCLE.length;
      return CYCLE[cycleIndex];
    }

    case 'rings': {
      const distance = Math.sqrt(worldX * worldX + worldY * worldY);
      const ring = Math.floor(distance / PRESET_RING_WIDTH_TILES);
      return CYCLE[ring % CYCLE.length];
    }
  }
}
