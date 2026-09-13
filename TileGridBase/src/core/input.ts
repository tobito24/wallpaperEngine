import type { Camera } from './Camera';
import { ZOOM_STEP_PX } from '../config/constants';

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

export class DebugState {
  enabled = false;

  constructor(target: Window = window) {
    target.addEventListener('keyup', (e) => {
      if (e.key.toLowerCase() === 'r') this.enabled = !this.enabled;
    });
  }
}

export function attachZoomControls(camera: Camera, target: Window = window): () => void {
  const onWheel = (e: WheelEvent) => {
    const step = e.deltaY > 0 ? -ZOOM_STEP_PX : ZOOM_STEP_PX;
    camera.zoomBy(step);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'q') camera.zoomBy(ZOOM_STEP_PX);
    else if (e.key === 'e') camera.zoomBy(-ZOOM_STEP_PX);
  };

  target.addEventListener('wheel', onWheel, { passive: true });
  target.addEventListener('keydown', onKeyDown);

  return () => {
    target.removeEventListener('wheel', onWheel);
    target.removeEventListener('keydown', onKeyDown);
  };
}
