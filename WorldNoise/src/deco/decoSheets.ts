import { DECO_TILE_SIZE_PX } from '../config/constants';
import { DECO_STRIP_PARTS } from './decoTable';
import type { DecoItem } from './decoTable';

const SHEET_DIRECTORY = '../../assets/deco/';

const spriteUrls = import.meta.glob<string>('../../assets/deco/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const imageByFile = new Map<string, HTMLImageElement>();

export type DecoStripImages = Readonly<Record<(typeof DECO_STRIP_PARTS)[number], HTMLImageElement>>;

export function decoStripFileName(item: DecoItem, part: (typeof DECO_STRIP_PARTS)[number]): string {
  return `${item.name}-${part}.png`;
}

export function decoFileName(item: DecoItem, variant: number): string {
  const stem = item.fileStem ?? item.name;
  return item.variants === 1 ? `${stem}.png` : `${stem}-${variant}.png`;
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

export function decoStripImages(item: DecoItem): DecoStripImages | undefined {
  const images = DECO_STRIP_PARTS.map((part) => imageOf(decoStripFileName(item, part)));
  if (images.some((image) => !image || !image.complete || image.naturalWidth === 0)) return undefined;
  const [left, middle, right] = images as HTMLImageElement[];
  return { left, middle, right };
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
  if (item.strip) {
    return DECO_STRIP_PARTS.map((part) => decoStripFileName(item, part)).filter(
      (file) => !spriteUrls[SHEET_DIRECTORY + file],
    );
  }
  const files: string[] = [];
  for (let variant = 0; variant < item.variants; variant++) {
    const file = decoFileName(item, variant);
    if (!spriteUrls[SHEET_DIRECTORY + file]) files.push(file);
  }
  return files;
}
