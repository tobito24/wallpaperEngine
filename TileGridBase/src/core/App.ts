import { TILE_SIZE_DEFAULT, PAN_SPEED_TILES_PER_SEC } from '../config/constants';
import { Camera } from './Camera';
import {
  attachMouseDragControls,
  attachTouchControls,
  attachZoomControls,
  DebugState,
  InputState,
} from './input';
import { WorldRenderer } from '../render/WorldRenderer';
import { World } from '../world/World';

export class App {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera(0, 0, TILE_SIZE_DEFAULT);
  private readonly input = new InputState();
  private readonly debugState = new DebugState();
  private readonly world = new World();
  private readonly renderer = new WorldRenderer();

  private readonly canvas: HTMLCanvasElement;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private lastFrameTimeMs = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context not available');
    this.ctx = ctx;

    attachZoomControls(this.camera);
    attachMouseDragControls(this.camera, this.canvas);
    attachTouchControls(this.camera, this.canvas);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start(): void {
    this.lastFrameTimeMs = performance.now();
    const frame = (timeMs: number) => {
      const dt = Math.min(0.05, (timeMs - this.lastFrameTimeMs) / 1000);
      this.lastFrameTimeMs = timeMs;

      this.update(dt);
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
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

  private update(dt: number): void {
    const move = this.input.getMoveVector();
    this.camera.pan(move.x * PAN_SPEED_TILES_PER_SEC * dt, move.y * PAN_SPEED_TILES_PER_SEC * dt);
  }

  private renderBackground(): void {
    this.ctx.fillStyle = '#1c1f24';
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
  }

  private renderDebugHud(): void {
    this.ctx.fillStyle = '#cfd3d8';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`tile size: ${this.camera.tileSize}px (wheel / q,e to zoom)`, 8, 16);
    this.ctx.fillText(
      `camera: ${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)} (wasd to move)`,
      8,
      32,
    );
    this.ctx.fillText(`chunks loaded: ${this.world.loadedChunkCount}`, 8, 48);
    this.ctx.fillText('debug: on (r to toggle)', 8, 64);
  }

  private render(): void {
    this.renderBackground();

    this.renderer.render(
      this.ctx,
      this.camera,
      this.world,
      this.viewportWidth,
      this.viewportHeight,
      this.lastFrameTimeMs,
      this.debugState.enabled,
    );

    if (this.debugState.enabled) this.renderDebugHud();
  }
}
