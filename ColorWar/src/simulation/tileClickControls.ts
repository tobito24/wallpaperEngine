import type { Camera } from '../core/Camera';
import type { World } from '../world/World';
import { previousInCycle } from './Color';

const CLICK_MOVE_TOLERANCE_PX = 6;

export function attachTileClickControls(camera: Camera, target: HTMLElement, world: World): () => void {
  let downX = 0;
  let downY = 0;

  const advanceTileAt = (screenX: number, screenY: number): void => {
    const rect = target.getBoundingClientRect();
    const worldPoint = camera.screenToWorld(
      screenX - rect.left,
      screenY - rect.top,
      target.clientWidth,
      target.clientHeight,
    );
    const tile = world.getLoadedTile(Math.floor(worldPoint.x), Math.floor(worldPoint.y));
    if (tile) tile.color = previousInCycle(tile.color);
  };

  const onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    downX = e.clientX;
    downY = e.clientY;
  };

  const onMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_MOVE_TOLERANCE_PX) return;
    advanceTileAt(e.clientX, e.clientY);
  };

  const onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    downX = e.touches[0].clientX;
    downY = e.touches[0].clientY;
  };

  const onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length !== 0 || e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    if (Math.hypot(touch.clientX - downX, touch.clientY - downY) > CLICK_MOVE_TOLERANCE_PX) return;
    advanceTileAt(touch.clientX, touch.clientY);
  };

  target.addEventListener('mousedown', onMouseDown);
  target.addEventListener('mouseup', onMouseUp);
  target.addEventListener('touchstart', onTouchStart, { passive: true });
  target.addEventListener('touchend', onTouchEnd);

  return () => {
    target.removeEventListener('mousedown', onMouseDown);
    target.removeEventListener('mouseup', onMouseUp);
    target.removeEventListener('touchstart', onTouchStart);
    target.removeEventListener('touchend', onTouchEnd);
  };
}
