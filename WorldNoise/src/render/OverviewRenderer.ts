import { biomeAt } from '../biome/biome';
import {
  ELEVATION_SEA_LEVEL,
  OVERVIEW_BLOCK_BUDGET_MS,
  OVERVIEW_BLOCK_SAMPLES,
  OVERVIEW_CACHE_MAX_BLOCKS,
  OVERVIEW_ROAD_MIN_WIDTH_PX,
  OVERVIEW_SAMPLE_MIN_SCREEN_PX,
  TOWN_MARGIN_TILES,
} from '../config/constants';
import type { Camera, TileBounds } from '../core/Camera';
import { shadeForHeightLevel } from '../elevation/color';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import { moistureNoise } from '../moisture/moistureNoise';
import { cellIndexOf, edgeExists } from '../skeleton/cellGrid';
import { temperatureNoise } from '../temperature/temperatureNoise';
import { fallbackColorOf } from '../tileset/ground';
import { nodePosition } from '../town/townNodes';
import { distanceToCore } from '../town/townCore';
import { townOfCell } from '../town/townPlacement';

const RECLAIMED_LAND_ELEVATION = ELEVATION_SEA_LEVEL + 0.001;
const OVERVIEW_FALLBACK_STEP_FACTORS: readonly number[] = [4, 2, 0.5, 0.25];
const NEIGHBOUR_CELL_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];

function groundColorAt(tileX: number, tileY: number): { color: string; shade: string | null } {
  const baseElevation = elevationNoise(tileX, tileY);
  const town = townOfCell(cellIndexOf(tileX), cellIndexOf(tileY));
  const coreDistance = town ? distanceToCore(town, tileX + 0.5, tileY + 0.5) : Infinity;
  const onPlateau = town !== null && coreDistance <= TOWN_MARGIN_TILES;
  const level = onPlateau ? town.plateauLevel : heightLevelAt(tileX, tileY, baseElevation);
  const shade = shadeForHeightLevel(level);
  if (coreDistance === 0) return { color: fallbackColorOf('city'), shade };
  const elevation =
    level > WATER_LEVEL && baseElevation <= ELEVATION_SEA_LEVEL ? RECLAIMED_LAND_ELEVATION : baseElevation;
  const biome = biomeAt(elevation, moistureNoise(tileX, tileY), temperatureNoise(tileX, tileY));
  return { color: fallbackColorOf(biome.id), shade };
}

export class OverviewRenderer {
  private readonly blocks = new Map<string, HTMLCanvasElement>();

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    bounds: TileBounds,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    let step = 1;
    while (step * camera.tileSize < OVERVIEW_SAMPLE_MIN_SCREEN_PX) step *= 2;
    const blockTiles = OVERVIEW_BLOCK_SAMPLES * step;

    const centreX = camera.x / blockTiles - 0.5;
    const centreY = camera.y / blockTiles - 0.5;
    const visible: { x: number; y: number }[] = [];
    for (let y = Math.floor(bounds.minY / blockTiles); y <= Math.floor(bounds.maxY / blockTiles); y++) {
      for (let x = Math.floor(bounds.minX / blockTiles); x <= Math.floor(bounds.maxX / blockTiles); x++) {
        visible.push({ x, y });
      }
    }
    visible.sort(
      (a, b) => Math.hypot(a.x - centreX, a.y - centreY) - Math.hypot(b.x - centreX, b.y - centreY),
    );

    const deadlineMs = performance.now() + OVERVIEW_BLOCK_BUDGET_MS;
    for (const block of visible) {
      const key = `${step}:${block.x}:${block.y}`;
      let canvas = this.blocks.get(key);
      if (!canvas && performance.now() < deadlineMs) {
        canvas = this.buildBlock(block.x * blockTiles, block.y * blockTiles, step);
        this.remember(key, canvas);
      }
      if (!canvas) {
        this.drawFallback(ctx, camera, block, step, blockTiles, viewportWidth, viewportHeight);
        continue;
      }
      const from = camera.worldToScreen(
        block.x * blockTiles,
        block.y * blockTiles,
        viewportWidth,
        viewportHeight,
      );
      const to = camera.worldToScreen(
        (block.x + 1) * blockTiles,
        (block.y + 1) * blockTiles,
        viewportWidth,
        viewportHeight,
      );
      ctx.drawImage(canvas, from.x, from.y, to.x - from.x, to.y - from.y);
    }

    this.drawRoads(ctx, camera, bounds, viewportWidth, viewportHeight);
  }

  private drawFallback(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    block: { x: number; y: number },
    step: number,
    blockTiles: number,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    const left = block.x * blockTiles;
    const top = block.y * blockTiles;
    for (const factor of OVERVIEW_FALLBACK_STEP_FACTORS) {
      const otherStep = step * factor;
      if (otherStep < 1) continue;
      const span = OVERVIEW_BLOCK_SAMPLES * otherStep;
      for (let by = Math.floor(top / span); by <= Math.floor((top + blockTiles - 1) / span); by++) {
        for (let bx = Math.floor(left / span); bx <= Math.floor((left + blockTiles - 1) / span); bx++) {
          const canvas = this.blocks.get(`${otherStep}:${bx}:${by}`);
          if (!canvas) continue;
          const minX = Math.max(left, bx * span);
          const minY = Math.max(top, by * span);
          const maxX = Math.min(left + blockTiles, (bx + 1) * span);
          const maxY = Math.min(top + blockTiles, (by + 1) * span);
          const from = camera.worldToScreen(minX, minY, viewportWidth, viewportHeight);
          const to = camera.worldToScreen(maxX, maxY, viewportWidth, viewportHeight);
          ctx.drawImage(
            canvas,
            (minX - bx * span) / otherStep,
            (minY - by * span) / otherStep,
            (maxX - minX) / otherStep,
            (maxY - minY) / otherStep,
            from.x,
            from.y,
            to.x - from.x,
            to.y - from.y,
          );
        }
      }
    }
  }

  private remember(key: string, canvas: HTMLCanvasElement): void {
    this.blocks.set(key, canvas);
    if (this.blocks.size <= OVERVIEW_CACHE_MAX_BLOCKS) return;
    const oldest = this.blocks.keys().next().value;
    if (oldest !== undefined) this.blocks.delete(oldest);
  }

  private buildBlock(minX: number, minY: number, step: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = OVERVIEW_BLOCK_SAMPLES;
    canvas.height = OVERVIEW_BLOCK_SAMPLES;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context not available');
    const halfStep = Math.floor(step / 2);
    for (let sy = 0; sy < OVERVIEW_BLOCK_SAMPLES; sy++) {
      for (let sx = 0; sx < OVERVIEW_BLOCK_SAMPLES; sx++) {
        const { color, shade } = groundColorAt(minX + sx * step + halfStep, minY + sy * step + halfStep);
        ctx.fillStyle = color;
        ctx.fillRect(sx, sy, 1, 1);
        if (shade) {
          ctx.fillStyle = shade;
          ctx.fillRect(sx, sy, 1, 1);
        }
      }
    }
    return canvas;
  }

  private drawRoads(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    bounds: TileBounds,
    viewportWidth: number,
    viewportHeight: number,
  ): void {
    ctx.strokeStyle = fallbackColorOf('road');
    ctx.lineWidth = Math.max(OVERVIEW_ROAD_MIN_WIDTH_PX, 3 * camera.tileSize);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let cy = cellIndexOf(bounds.minY) - 1; cy <= cellIndexOf(bounds.maxY) + 1; cy++) {
      for (let cx = cellIndexOf(bounds.minX) - 1; cx <= cellIndexOf(bounds.maxX) + 1; cx++) {
        for (const [dx, dy] of NEIGHBOUR_CELL_STEPS) {
          if (!edgeExists(cx, cy, cx + dx, cy + dy)) continue;
          const from = nodePosition(cx, cy);
          const to = nodePosition(cx + dx, cy + dy);
          const start = camera.worldToScreen(from.x, from.y, viewportWidth, viewportHeight);
          const end = camera.worldToScreen(to.x, to.y, viewportWidth, viewportHeight);
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
        }
      }
    }
    ctx.stroke();
  }
}
