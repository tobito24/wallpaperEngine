import type { Camera } from './Camera';

/** Wheel/q/e zoom controls, same convention InfinityWalker used. Returns a function to remove the listeners. */
export function attachZoomControls(camera: Camera, target: Window = window): () => void {
  const onWheel = (e: WheelEvent) => {
    const step = e.deltaY > 0 ? -2 : 2;
    camera.zoomBy(step);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'q') camera.zoomBy(1);
    else if (e.key === 'e') camera.zoomBy(-1);
  };

  target.addEventListener('wheel', onWheel, { passive: true });
  target.addEventListener('keydown', onKeyDown);

  return () => {
    target.removeEventListener('wheel', onWheel);
    target.removeEventListener('keydown', onKeyDown);
  };
}
