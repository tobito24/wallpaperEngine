import { TILESET_TILE_SIZE_PX } from '../config/constants';

export interface TileRegion {
  readonly column: number;
  readonly row: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const SHEET_KEY = '../../dev-assets/tilesets/outside.png';

const sheetUrls = import.meta.glob<string>('../../dev-assets/tilesets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function loadSheet(): HTMLImageElement | undefined {
  const url = sheetUrls[SHEET_KEY];
  if (!url) return undefined;
  const image = new Image();
  image.src = url;
  return image;
}

const outsideSheet = loadSheet();

export function drawOutsideRegion(
  ctx: CanvasRenderingContext2D,
  region: TileRegion,
  destX: number,
  destY: number,
  destWidth: number,
  destHeight: number,
): boolean {
  if (!outsideSheet || !outsideSheet.complete || outsideSheet.naturalWidth === 0) return false;

  ctx.drawImage(
    outsideSheet,
    region.column * TILESET_TILE_SIZE_PX + region.x,
    region.row * TILESET_TILE_SIZE_PX + region.y,
    region.width,
    region.height,
    destX,
    destY,
    destWidth,
    destHeight,
  );
  return true;
}
