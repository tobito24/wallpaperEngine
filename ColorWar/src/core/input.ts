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

export function attachTouchControls(camera: Camera, target: HTMLElement): () => void {
  let lastTouches: TouchList | null = null;

  const touchDistance = (touches: TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (e: TouchEvent) => {
    lastTouches = e.touches;
  };

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();

    if (!lastTouches || lastTouches.length !== e.touches.length) {
      lastTouches = e.touches;
      return;
    }

    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lastTouches[0].clientX;
      const dy = e.touches[0].clientY - lastTouches[0].clientY;
      camera.pan(-dx / camera.tileSize, -dy / camera.tileSize);
    } else if (e.touches.length === 2) {
      const rect = target.getBoundingClientRect();
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      const delta = touchDistance(e.touches) - touchDistance(lastTouches);
      camera.zoomAtScreenPoint(delta, midX, midY, target.clientWidth, target.clientHeight);
    }

    lastTouches = e.touches;
  };

  const onTouchEnd = (e: TouchEvent) => {
    lastTouches = e.touches.length > 0 ? e.touches : null;
  };

  target.addEventListener('touchstart', onTouchStart, { passive: true });
  target.addEventListener('touchmove', onTouchMove, { passive: false });
  target.addEventListener('touchend', onTouchEnd);
  target.addEventListener('touchcancel', onTouchEnd);

  return () => {
    target.removeEventListener('touchstart', onTouchStart);
    target.removeEventListener('touchmove', onTouchMove);
    target.removeEventListener('touchend', onTouchEnd);
    target.removeEventListener('touchcancel', onTouchEnd);
  };
}

export function attachMouseDragControls(camera: Camera, target: HTMLElement): () => void {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    dragging = true;
    target.style.cursor = 'grabbing';
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    camera.pan(-(e.clientX - lastX) / camera.tileSize, -(e.clientY - lastY) / camera.tileSize);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onMouseUp = () => {
    dragging = false;
    target.style.cursor = 'grab';
  };

  target.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return () => {
    target.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
}

export function attachZoomControls(camera: Camera, target: HTMLElement): () => void {
  const onWheel = (e: WheelEvent) => {
    const step = e.deltaY > 0 ? -ZOOM_STEP_PX : ZOOM_STEP_PX;
    const rect = target.getBoundingClientRect();
    camera.zoomAtScreenPoint(
      step,
      e.clientX - rect.left,
      e.clientY - rect.top,
      target.clientWidth,
      target.clientHeight,
    );
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'q') camera.zoomBy(ZOOM_STEP_PX);
    else if (e.key === 'e') camera.zoomBy(-ZOOM_STEP_PX);
  };

  target.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown);

  return () => {
    target.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
  };
}
