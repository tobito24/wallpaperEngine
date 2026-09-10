import { TILE_SIZE_DEFAULT } from '../config/constants';
import { generationConfig } from '../config/generationConfig';
import { Camera } from './Camera';
import { attachZoomControls } from './input';
import { WorldStreamer } from '../world/chunk/WorldStreamer';
import { WorldRenderer } from '../render/WorldRenderer';
import { TilesetImage } from '../render/TilesetImage';
import { DebugOverlay } from '../render/DebugOverlay';

const EXPONENT_STEP = 0.1;
const MIN_EXPONENT = 0.2;

export class App {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera(0, 0, TILE_SIZE_DEFAULT);
  private readonly streamer = new WorldStreamer();
  private readonly tileset = new TilesetImage();
  private readonly renderer = new WorldRenderer(this.tileset);
  private readonly debugOverlay = new DebugOverlay();

  private readonly canvas: HTMLCanvasElement;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context not available');
    this.ctx = ctx;

    attachZoomControls(this.camera);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => this.handleDebugKeys(e));
    this.resize();
  }

  start(): void {
    const frame = () => {
      this.update();
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private handleDebugKeys(e: KeyboardEvent): void {
    if (e.key === 'h') this.debugOverlay.cycleMode();
    else if (e.key === '[') this.adjustElevationExponent(-EXPONENT_STEP);
    else if (e.key === ']') this.adjustElevationExponent(EXPONENT_STEP);
  }

  private adjustElevationExponent(delta: number): void {
    generationConfig.elevationRedistributionExponent = Math.max(
      MIN_EXPONENT,
      generationConfig.elevationRedistributionExponent + delta,
    );
    this.streamer.reset();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.canvas.style.width = `${this.viewportWidth}px`;
    this.canvas.style.height = `${this.viewportHeight}px`;
    this.canvas.width = Math.floor(this.viewportWidth * dpr);
    this.canvas.height = Math.floor(this.viewportHeight * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private update(): void {
    const bounds = this.camera.getVisibleTileBounds(this.viewportWidth, this.viewportHeight);
    this.streamer.unloadOutside(bounds.minX, bounds.minY, bounds.maxX, bounds.maxY);
  }

  private render(): void {
    this.ctx.fillStyle = '#1c1f24';
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    if (this.debugOverlay.mode === 'tiles') {
      this.renderer.render(this.ctx, this.camera, this.streamer, this.viewportWidth, this.viewportHeight);
    } else {
      this.debugOverlay.renderHeatmap(
        this.ctx,
        this.camera,
        this.streamer,
        this.viewportWidth,
        this.viewportHeight,
      );
    }

    this.debugOverlay.renderHud(this.ctx, [
      `mode: ${this.debugOverlay.mode} (h to cycle)`,
      `elevation exponent: ${generationConfig.elevationRedistributionExponent.toFixed(2)} ([ / ] to adjust)`,
      `seed: ${generationConfig.seed}`,
      `tile size: ${this.camera.tileSize}px (wheel / q,e to zoom)`,
    ]);
  }
}
