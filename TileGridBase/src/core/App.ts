import { TILE_SIZE_DEFAULT, PAN_SPEED } from '../config/constants';
import { Camera } from './Camera';
import { attachZoomControls, InputState } from './input';
import { WorldRenderer } from '../render/WorldRenderer';

export class App {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly camera = new Camera(0, 0, TILE_SIZE_DEFAULT);
  private readonly input = new InputState();
  private readonly renderer = new WorldRenderer();

  private readonly canvas: HTMLCanvasElement;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context not available');
    this.ctx = ctx;

    attachZoomControls(this.camera);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  start(): void {
    this.lastTime = performance.now();
    const frame = (time: number) => {
      const dt = Math.min(0.05, (time - this.lastTime) / 1000);
      this.lastTime = time;

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
    this.camera.pan(move.x * PAN_SPEED * dt, move.y * PAN_SPEED * dt);
  }

  private render(): void {
    this.ctx.fillStyle = '#1c1f24';
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    this.renderer.render(this.ctx, this.camera, this.viewportWidth, this.viewportHeight);

    this.ctx.fillStyle = '#cfd3d8';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`tile size: ${this.camera.tileSize}px (wheel / q,e to zoom)`, 8, 16);
    this.ctx.fillText(
      `camera: ${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)} (wasd to move)`,
      8,
      32,
    );
  }
}
