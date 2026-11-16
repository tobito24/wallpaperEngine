import { AUTOTILE_QUARTER_COLUMNS, AUTOTILE_QUARTER_SIZE_PX } from '../config/constants';
import { AUTOTILE_QUARTER_IDS } from './autotile';
import { fallbackColorOf } from './ground';
import type { Ground } from './ground';

const SHEET_DIRECTORY = '../../assets/autotiles/';
const FRAME_WIDTH_PX = AUTOTILE_QUARTER_COLUMNS * AUTOTILE_QUARTER_SIZE_PX;
const PLAIN_GROUND_AUTOTILE_INDEX = 0;

const SHEET_FILE_BY_GROUND: Readonly<Record<Ground, string>> = {
  deepWater: 'deep-water.png',
  shallowWater: 'shallow-water.png',
  beach: 'sand.png',
  snowField: 'snow-field.png',
  tundra: 'tundra.png',
  snowForest: 'snow-forest.png',
  steppe: 'grass-light-wild.png',
  meadow: 'grass.png',
  forest: 'forest.png',
  desert: 'desert.png',
  savanna: 'savanna.png',
  jungle: 'jungle.png',
  mountain: 'gravel.png',
  snowPeak: 'snow-peak.png',
  road: 'brick-path.png',
  bridge: 'bridge.png',
};

const sheetUrls = import.meta.glob<string>('../../assets/autotiles/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function loadSheet(file: string): HTMLImageElement | undefined {
  const url = sheetUrls[SHEET_DIRECTORY + file];
  if (!url) return undefined;
  const image = new Image();
  image.src = url;
  return image;
}

const sheetByGround = new Map<Ground, HTMLImageElement>();
for (const [ground, file] of Object.entries(SHEET_FILE_BY_GROUND) as [Ground, string][]) {
  const sheet = loadSheet(file);
  if (sheet) sheetByGround.set(ground, sheet);
}

function drawQuarter(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  quarterId: number,
  animationFrame: number,
  destinationX: number,
  destinationY: number,
  destinationWidth: number,
  destinationHeight: number,
): void {
  const frameCount = Math.max(1, Math.floor(sheet.naturalWidth / FRAME_WIDTH_PX));
  const frameOffsetPx = (animationFrame % frameCount) * FRAME_WIDTH_PX;
  const position = quarterId - 1;
  ctx.drawImage(
    sheet,
    frameOffsetPx + (position % AUTOTILE_QUARTER_COLUMNS) * AUTOTILE_QUARTER_SIZE_PX,
    Math.floor(position / AUTOTILE_QUARTER_COLUMNS) * AUTOTILE_QUARTER_SIZE_PX,
    AUTOTILE_QUARTER_SIZE_PX,
    AUTOTILE_QUARTER_SIZE_PX,
    destinationX,
    destinationY,
    destinationWidth,
    destinationHeight,
  );
}

function usableSheet(ground: Ground): HTMLImageElement | undefined {
  const sheet = sheetByGround.get(ground);
  return sheet && sheet.complete && sheet.naturalWidth > 0 ? sheet : undefined;
}

export function drawGroundAutotile(
  ctx: CanvasRenderingContext2D,
  ground: Ground,
  autotileIndex: number,
  animationFrame: number,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  const sheet = usableSheet(ground);
  if (!sheet) return false;
  drawSheetQuarters(ctx, sheet, AUTOTILE_QUARTER_IDS[autotileIndex], animationFrame, screenX, screenY, size);
  return true;
}

export function drawGroundUnderlay(
  ctx: CanvasRenderingContext2D,
  underlays: readonly (Ground | null)[],
  animationFrame: number,
  screenX: number,
  screenY: number,
  size: number,
): void {
  const plainQuarterIds = AUTOTILE_QUARTER_IDS[PLAIN_GROUND_AUTOTILE_INDEX];
  const firstHalf = Math.floor(size / 2);
  const secondHalf = size - firstHalf;
  for (let quarter = 0; quarter < underlays.length; quarter++) {
    const underlay = underlays[quarter];
    if (underlay === null) continue;
    const isRight = quarter % 2 === 1;
    const isBottom = quarter >= 2;
    const x = screenX + (isRight ? firstHalf : 0);
    const y = screenY + (isBottom ? firstHalf : 0);
    const width = isRight ? secondHalf : firstHalf;
    const height = isBottom ? secondHalf : firstHalf;
    const sheet = usableSheet(underlay);
    if (sheet) {
      drawQuarter(ctx, sheet, plainQuarterIds[quarter], animationFrame, x, y, width, height);
    } else {
      ctx.fillStyle = fallbackColorOf(underlay);
      ctx.fillRect(x, y, width, height);
    }
  }
}

export function drawSheetQuarters(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  quarterIds: readonly number[],
  animationFrame: number,
  screenX: number,
  screenY: number,
  size: number,
): void {
  const firstHalf = Math.floor(size / 2);
  const secondHalf = size - firstHalf;
  for (let quarter = 0; quarter < quarterIds.length; quarter++) {
    const isRight = quarter % 2 === 1;
    const isBottom = quarter >= 2;
    drawQuarter(
      ctx,
      sheet,
      quarterIds[quarter],
      animationFrame,
      screenX + (isRight ? firstHalf : 0),
      screenY + (isBottom ? firstHalf : 0),
      isRight ? secondHalf : firstHalf,
      isBottom ? secondHalf : firstHalf,
    );
  }
}
