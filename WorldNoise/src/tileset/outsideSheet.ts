import { OUTSIDE_SHEET_TILE_SIZE_PX } from '../config/constants';

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

export interface SheetTile {
  readonly column: number;
  readonly row: number;
}

export function drawOutsideTile(
  ctx: CanvasRenderingContext2D,
  tile: SheetTile,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  if (!outsideSheet || !outsideSheet.complete || outsideSheet.naturalWidth === 0) return false;

  ctx.drawImage(
    outsideSheet,
    tile.column * OUTSIDE_SHEET_TILE_SIZE_PX,
    tile.row * OUTSIDE_SHEET_TILE_SIZE_PX,
    OUTSIDE_SHEET_TILE_SIZE_PX,
    OUTSIDE_SHEET_TILE_SIZE_PX,
    screenX,
    screenY,
    size,
    size,
  );
  return true;
}
