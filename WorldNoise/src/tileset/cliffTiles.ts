import { CLIFF_SHEET_TILE_SIZE_PX } from '../config/constants';
import type { CliffType } from '../elevation/heightLevel';

const SHEET_KEY = '../../dev-assets/tilesets/infinitywalker.png';

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

const cliffSheet = loadSheet();

interface SheetPosition {
  readonly column: number;
  readonly row: number;
}

const FRAME_ORIGIN_COLUMN = 3;
const FIRST_FRAME_ROW = 8;
const FRAME_ROW_STRIDE = 6;
const STONE_GROUP_COUNT = 3;

const OFFSETS_IN_GROUP: Record<CliffType, SheetPosition> = {
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

const GREY_STONE_GROUP = 1;

const GREY_STONE_INNER_OFFSETS: Partial<Record<CliffType, SheetPosition>> = {
  northWestInner: { column: 3, row: 0 },
  northEastInner: { column: 4, row: 0 },
  southEastInner: { column: 4, row: 1 },
  southWestInner: { column: 3, row: 1 },
};

export function drawCliff(
  ctx: CanvasRenderingContext2D,
  cliffType: CliffType,
  heightLevel: number,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  if (!cliffSheet || !cliffSheet.complete || cliffSheet.naturalWidth === 0) return false;

  const group = (heightLevel - 1) % STONE_GROUP_COUNT;
  const offset =
    (group === GREY_STONE_GROUP && GREY_STONE_INNER_OFFSETS[cliffType]) || OFFSETS_IN_GROUP[cliffType];
  ctx.drawImage(
    cliffSheet,
    (FRAME_ORIGIN_COLUMN + offset.column) * CLIFF_SHEET_TILE_SIZE_PX,
    (FIRST_FRAME_ROW + group * FRAME_ROW_STRIDE + offset.row) * CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    CLIFF_SHEET_TILE_SIZE_PX,
    screenX,
    screenY,
    size,
    size,
  );
  return true;
}
