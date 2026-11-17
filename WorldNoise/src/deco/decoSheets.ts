import { DECO_TILE_SIZE_PX } from '../config/constants';
import type { DecoItem } from './decoTable';

const SHEET_DIRECTORY = '../../assets/deco/';

const spriteUrls = import.meta.glob<string>('../../assets/deco/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const imageByFile = new Map<string, HTMLImageElement>();

export function decoFileName(item: DecoItem, variant: number): string {
  return item.variants === 1 ? `${item.name}.png` : `${item.name}-${variant}.png`;
}

function imageOf(file: string): HTMLImageElement | undefined {
  const cached = imageByFile.get(file);
  if (cached) return cached;
  const url = spriteUrls[SHEET_DIRECTORY + file];
  if (!url) return undefined;
  const image = new Image();
  image.src = url;
  imageByFile.set(file, image);
  return image;
}

export function decoImage(item: DecoItem, variant: number): HTMLImageElement | undefined {
  const image = imageOf(decoFileName(item, variant));
  return image && image.complete && image.naturalWidth > 0 ? image : undefined;
}

export interface DecoSpriteSize {
  readonly widthTiles: number;
  readonly heightTiles: number;
}

export function decoSpriteSize(item: DecoItem, image: HTMLImageElement): DecoSpriteSize {
  return {
    widthTiles: image.naturalWidth / item.frames / DECO_TILE_SIZE_PX,
    heightTiles: image.naturalHeight / DECO_TILE_SIZE_PX,
  };
}

export function decoFilesMissing(item: DecoItem): string[] {
  const files: string[] = [];
  for (let variant = 0; variant < item.variants; variant++) {
    const file = decoFileName(item, variant);
    if (!spriteUrls[SHEET_DIRECTORY + file]) files.push(file);
  }
  return files;
}
