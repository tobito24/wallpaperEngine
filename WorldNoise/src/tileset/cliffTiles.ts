import { CLIFF_SHEET_TILE_SIZE_PX } from '../config/constants';
import type { CliffType } from '../elevation/heightLevel';

const SHEET_DIRECTORY = '../../assets/cliff-assets/';
const LOWEST_CLIFF_LEVEL = 2;
const CLIFF_SET_COUNT = 3;

const sheetUrls = import.meta.glob<string>('../../assets/cliff-assets/cliff-?.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function loadSheets(): (HTMLImageElement | undefined)[] {
  return Array.from({ length: CLIFF_SET_COUNT }, (_, set) => {
    const url = sheetUrls[`${SHEET_DIRECTORY}cliff-${set}.png`];
    if (!url) return undefined;
    const image = new Image();
    image.src = url;
    return image;
  });
}

const cliffSheets = loadSheets();

interface SheetPosition {
  readonly column: number;
  readonly row: number;
}

const OFFSETS_IN_SHEET: Record<CliffType, SheetPosition> = {
  northWestOuter: { column: 0, row: 0 },
  northEdge: { column: 1, row: 0 },
  northEastOuter: { column: 2, row: 0 },
  westEdge: { column: 0, row: 1 },
  eastEdge: { column: 2, row: 1 },
  southWestOuter: { column: 0, row: 2 },
  southEdge: { column: 1, row: 2 },
  southEastOuter: { column: 2, row: 2 },
  southEastInner: { column: 3, row: 0 },
  southWestInner: { column: 4, row: 0 },
  northEastInner: { column: 3, row: 1 },
  northWestInner: { column: 4, row: 1 },
};

function sheetForLevel(heightLevel: number): HTMLImageElement | undefined {
  const set = Math.min(Math.max(heightLevel - LOWEST_CLIFF_LEVEL, 0), CLIFF_SET_COUNT - 1);
  const sheet = cliffSheets[set];
  return sheet && sheet.complete && sheet.naturalWidth > 0 ? sheet : undefined;
}

export function drawCliff(
  ctx: CanvasRenderingContext2D,
  cliffType: CliffType,
  heightLevel: number,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  const sheet = sheetForLevel(heightLevel);
  if (!sheet) return false;

  const offset = OFFSETS_IN_SHEET[cliffType];
  ctx.drawImage(
    sheet,
    offset.column * CLIFF_SHEET_TILE_SIZE_PX,
    offset.row * CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    screenX,
    screenY,
    size,
    size,
  );
  return true;
}
