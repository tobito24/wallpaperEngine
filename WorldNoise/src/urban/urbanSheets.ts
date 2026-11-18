import type { UrbanItem } from './urbanTable';

const SHEET_DIRECTORY = '../../assets/urban/';

const spriteUrls = import.meta.glob<string>('../../assets/urban/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const imageByFile = new Map<string, HTMLImageElement>();

export function urbanImage(item: UrbanItem): HTMLImageElement | undefined {
  const file = `${item.name}.png`;
  let image = imageByFile.get(file);
  if (!image) {
    const url = spriteUrls[SHEET_DIRECTORY + file];
    if (!url) return undefined;
    image = new Image();
    image.src = url;
    imageByFile.set(file, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : undefined;
}
