import type { Ground } from '../biome/biome';
import { AUTOTILE_FILL_TILE_COLUMN, AUTOTILE_FILL_TILE_ROW, TILESET_TILE_SIZE_PX } from '../config/constants';

const SHEET_DIRECTORY = '../../dev-assets/autotiles/';

const SHEET_FILE_BY_GROUND: Readonly<Record<Ground, string>> = {
  deepWater: 'sea-deep.png',
  shallowWater: 'sea-without-shore.png',
  sand: 'sand.png',
  grass: 'light-grass.png',
  dirt: 'dirt.png',
  rock: 'gravel.png',
  snow: 'white-path.png',
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

export function drawGroundFill(
  ctx: CanvasRenderingContext2D,
  ground: Ground,
  screenX: number,
  screenY: number,
  size: number,
): boolean {
  const sheet = sheetByGround.get(ground);
  if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return false;

  ctx.drawImage(
    sheet,
    AUTOTILE_FILL_TILE_COLUMN * TILESET_TILE_SIZE_PX,
    AUTOTILE_FILL_TILE_ROW * TILESET_TILE_SIZE_PX,
    TILESET_TILE_SIZE_PX,
    TILESET_TILE_SIZE_PX,
    screenX,
    screenY,
    size,
    size,
  );
  return true;
}
