const tintedByImage = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();

export function tintedSprite(image: HTMLImageElement, shade: string): HTMLCanvasElement {
  let byShade = tintedByImage.get(image);
  if (!byShade) {
    byShade = new Map();
    tintedByImage.set(image, byShade);
  }
  const cached = byShade.get(shade);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (context) {
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = shade;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  byShade.set(shade, canvas);
  return canvas;
}
