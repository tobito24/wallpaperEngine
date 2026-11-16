import { CLIFF_SHEET_TILE_SIZE_PX } from '../config/constants';
import type { NorthSouthStairs } from '../road/crossingStairs';

const SHEET_URL_KEY = '../../assets/cliff-assets/stairs.png';
const SOUTH_EDGE_ROW = 4;
const NORTH_EDGE_ROW = 5;

const stairsUrls = import.meta.glob<string>('../../assets/cliff-assets/stairs.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function loadSheet(): HTMLImageElement | undefined {
  const url = stairsUrls[SHEET_URL_KEY];
  if (!url) return undefined;
  const image = new Image();
  image.src = url;
  return image;
}

const stairsSheet = loadSheet();

export function drawNorthSouthStairs(
  ctx: CanvasRenderingContext2D,
  stairs: NorthSouthStairs,
  screenX: number,
  screenY: number,
  size: number,
): void {
  if (!stairsSheet || !stairsSheet.complete || stairsSheet.naturalWidth === 0) return;
  ctx.drawImage(
    stairsSheet,
    stairs.widthIndex * CLIFF_SHEET_TILE_SIZE_PX,
    (stairs.edge === 'southEdge' ? SOUTH_EDGE_ROW : NORTH_EDGE_ROW) * CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    screenX,
    screenY,
    size,
    size,
  );
}
