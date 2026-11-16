import { CLIFF_SHEET_TILE_SIZE_PX } from '../config/constants';
import type { StairsTile } from '../road/crossingStairs';

const SHEET_URL_KEY = '../../assets/cliff-assets/stairs.png';
const SOUTH_EDGE_ROW = 4;
const NORTH_EDGE_ROW = 5;
const EAST_WEST_UPPER_WEST_FIRST_COLUMN = 0;
const EAST_WEST_UPPER_EAST_FIRST_COLUMN = 2;

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

function sheetPositionOf(stairs: StairsTile): { readonly column: number; readonly row: number } {
  if (stairs.kind === 'northSouth') {
    return {
      column: stairs.widthIndex,
      row: stairs.edge === 'southEdge' ? SOUTH_EDGE_ROW : NORTH_EDGE_ROW,
    };
  }
  const firstColumn =
    stairs.upperSide === -1 ? EAST_WEST_UPPER_WEST_FIRST_COLUMN : EAST_WEST_UPPER_EAST_FIRST_COLUMN;
  return { column: firstColumn + stairs.columnIndex, row: stairs.rowIndex };
}

export function drawStairs(
  ctx: CanvasRenderingContext2D,
  stairs: StairsTile,
  screenX: number,
  screenY: number,
  size: number,
): void {
  if (!stairsSheet || !stairsSheet.complete || stairsSheet.naturalWidth === 0) return;
  const { column, row } = sheetPositionOf(stairs);
  ctx.drawImage(
    stairsSheet,
    column * CLIFF_SHEET_TILE_SIZE_PX,
    row * CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    screenX,
    screenY,
    size,
    size,
  );
}
