import type { Camera } from './Camera';
import { ZOOM_STEP } from '../config/constants';

/** Tracks currently-held keys so movement can be sampled once per frame (dt-scaled),
 * instead of stepping the camera directly from discrete keydown events. */
export class InputState {
  private readonly keys = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    target.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    target.addEventListener('blur', () => this.keys.clear());
  }

  isDown(key: string): boolean {
    return this.keys.has(key);
  }

  /** Normalized WASD/arrow-key direction vector (zero if nothing held, unit length otherwise
   * so diagonal movement isn't faster). */
  getMoveVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.isDown('a') || this.isDown('arrowleft')) x -= 1;
    if (this.isDown('d') || this.isDown('arrowright')) x += 1;
    if (this.isDown('w') || this.isDown('arrowup')) y -= 1;
    if (this.isDown('s') || this.isDown('arrowdown')) y += 1;

    const length = Math.hypot(x, y);
    if (length > 0) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }
}

/** Wheel/q/e zoom controls (changes Camera.tileSize). Returns a function to remove the listeners. */
export function attachZoomControls(camera: Camera, target: Window = window): () => void {
  const onWheel = (e: WheelEvent) => {
    const step = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    camera.zoomBy(step);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'q') camera.zoomBy(ZOOM_STEP);
    else if (e.key === 'e') camera.zoomBy(-ZOOM_STEP);
  };

  target.addEventListener('wheel', onWheel, { passive: true });
  target.addEventListener('keydown', onKeyDown);

  return () => {
    target.removeEventListener('wheel', onWheel);
    target.removeEventListener('keydown', onKeyDown);
  };
}
