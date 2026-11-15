import type { BiomeGround } from '../biome/biome';
import { AUTOTILE_QUARTER_COLUMNS, AUTOTILE_QUARTER_SIZE_PX } from '../config/constants';
import { AUTOTILE_QUARTER_IDS } from './autotile';
import type { Ground, OverlayGround } from './ground';

const SHEET_DIRECTORY = '../../dev-assets/autotiles/';
const FRAME_WIDTH_PX = AUTOTILE_QUARTER_COLUMNS * AUTOTILE_QUARTER_SIZE_PX;

const SHEET_FILE_BY_BIOME_GROUND: Readonly<Record<BiomeGround, string>> = {
  deepWater: 'sea-deep.png',
  shallowWater: 'sea-without-shore.png',
  sand: 'sand.png',
  grass: 'light-grass.png',
  dirt: 'dirt.png',
  rock: 'gravel.png',
  snow: 'white-path.png',
};

const SHEET_FILE_BY_OVERLAY_GROUND: Readonly<Partial<Record<OverlayGround, string>>> = {
  road: 'brick-path.png',
};

const SHEET_FILE_BY_GROUND: Readonly<Partial<Record<Ground, string>>> = {
  ...SHEET_FILE_BY_BIOME_GROUND,
  ...SHEET_FILE_BY_OVERLAY_GROUND,
};

const sheetUrls = import.meta.glob<string>('../../dev-assets/autotiles/*.png', {
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

export function drawGroundAutotile(
  ctx: CanvasRenderingContext2D,
  ground: Ground,
  autotileIndex: number,
  animationFrame: number,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  const sheet = sheetByGround.get(ground);
  if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return false;

  const frameCount = Math.max(1, Math.floor(sheet.naturalWidth / FRAME_WIDTH_PX));
  const frameOffsetPx = (animationFrame % frameCount) * FRAME_WIDTH_PX;

  const firstHalf = Math.floor(size / 2);
  const secondHalf = size - firstHalf;
  const quarterIds = AUTOTILE_QUARTER_IDS[autotileIndex];
  for (let quarter = 0; quarter < quarterIds.length; quarter++) {
    const position = quarterIds[quarter] - 1;
    const isRight = quarter % 2 === 1;
    const isBottom = quarter >= 2;
    ctx.drawImage(
      sheet,
      frameOffsetPx + (position % AUTOTILE_QUARTER_COLUMNS) * AUTOTILE_QUARTER_SIZE_PX,
      Math.floor(position / AUTOTILE_QUARTER_COLUMNS) * AUTOTILE_QUARTER_SIZE_PX,
      AUTOTILE_QUARTER_SIZE_PX,
      AUTOTILE_QUARTER_SIZE_PX,
      screenX + (isRight ? firstHalf : 0),
      screenY + (isBottom ? firstHalf : 0),
      isRight ? secondHalf : firstHalf,
      isBottom ? secondHalf : firstHalf,
    );
  }
  return true;
}
