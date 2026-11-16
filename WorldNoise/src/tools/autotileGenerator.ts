import { AUTOTILE_QUARTER_COLUMNS, AUTOTILE_QUARTER_SIZE_PX } from '../config/constants';

export const TEXTURE_SIZE_PX = AUTOTILE_QUARTER_SIZE_PX * 2;
export const SHEET_WIDTH_PX = AUTOTILE_QUARTER_COLUMNS * AUTOTILE_QUARTER_SIZE_PX;
export const SHEET_HEIGHT_PX = 128;
export const MAX_INSET_PX = AUTOTILE_QUARTER_SIZE_PX;
export const MAX_WAVE_AMPLITUDE_PX = 4;
export const WAVE_PERIODS_PX = [16, 32] as const;

const FRAME_SIZE_PX = 96;
const FRAME_TOP_PX = 32;
const INNER_CORNER_TILE_LEFT_PX = 64;
const UNUSED_QUARTER_COLUMNS = 4;
const UNUSED_QUARTER_ROWS = 2;

export type EdgeStyle = 'edge' | 'curve' | 'wavy';

export interface GeneratorOptions {
  style: EdgeStyle;
  insetPx: number;
  cornerRadiusPx: number;
  waveAmplitudePx: number;
  wavePeriodPx: number;
}

export interface EffectiveLimits {
  insetPx: number;
  waveAmplitudePx: number;
  outerCornerRadiusPx: number;
  innerCornerRadiusPx: number;
}

interface EdgeOffsets {
  top: number[];
  bottom: number[];
  left: number[];
  right: number[];
}

type GroundTest = (x: number, y: number) => boolean;

function periodic(index: number): number {
  return ((index % TEXTURE_SIZE_PX) + TEXTURE_SIZE_PX) % TEXTURE_SIZE_PX;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), Math.max(min, max));
}

export function effectiveLimits(options: GeneratorOptions): EffectiveLimits {
  const insetPx = clamp(options.insetPx, 0, MAX_INSET_PX);
  const waveRoomPx = Math.min(MAX_WAVE_AMPLITUDE_PX, insetPx, MAX_INSET_PX - insetPx);
  const waveAmplitudePx = options.style === 'wavy' ? clamp(options.waveAmplitudePx, 0, waveRoomPx) : 0;
  return {
    insetPx,
    waveAmplitudePx,
    outerCornerRadiusPx: clamp(options.cornerRadiusPx, 0, MAX_INSET_PX - insetPx - waveAmplitudePx),
    innerCornerRadiusPx: clamp(options.cornerRadiusPx, 0, insetPx - waveAmplitudePx),
  };
}

function edgeOffsets(options: GeneratorOptions, limits: EffectiveLimits): EdgeOffsets {
  const wave = (index: number): number =>
    Math.round(
      limits.waveAmplitudePx * Math.sin((2 * Math.PI * (index - limits.insetPx)) / options.wavePeriodPx),
    );
  const indices = Array.from({ length: TEXTURE_SIZE_PX }, (_, index) => index);
  return {
    top: indices.map(wave),
    left: indices.map(wave),
    bottom: indices.map((index) => wave(TEXTURE_SIZE_PX - 1 - index)),
    right: indices.map((index) => wave(TEXTURE_SIZE_PX - 1 - index)),
  };
}

function isInsideRoundedCorner(
  style: EdgeStyle,
  radius: number,
  distanceAlongFirst: number,
  distanceAlongSecond: number,
): boolean {
  if (radius === 0) return true;
  if (style === 'edge') return distanceAlongFirst + distanceAlongSecond >= radius;
  if (distanceAlongFirst >= radius || distanceAlongSecond >= radius) return true;
  const first = radius - distanceAlongFirst - 0.5;
  const second = radius - distanceAlongSecond - 0.5;
  return first * first + second * second <= radius * radius;
}

function isGroundInFrame(
  options: GeneratorOptions,
  limits: EffectiveLimits,
  offsets: EdgeOffsets,
  u: number,
  v: number,
): boolean {
  const radius = limits.outerCornerRadiusPx;
  const last = FRAME_SIZE_PX - 1 - limits.insetPx;
  const left = limits.insetPx + offsets.left[periodic(v)];
  const right = last - offsets.right[periodic(v)];
  const top = limits.insetPx + offsets.top[periodic(u)];
  const bottom = last - offsets.bottom[periodic(u)];
  if (u < left || u > right || v < top || v > bottom) return false;
  return (
    isInsideRoundedCorner(options.style, radius, u - left, v - top) &&
    isInsideRoundedCorner(options.style, radius, right - u, v - top) &&
    isInsideRoundedCorner(options.style, radius, u - left, bottom - v) &&
    isInsideRoundedCorner(options.style, radius, right - u, bottom - v)
  );
}

function isGroundInInnerCornerTile(
  options: GeneratorOptions,
  limits: EffectiveLimits,
  offsets: EdgeOffsets,
  x: number,
  y: number,
): boolean {
  const radius = limits.innerCornerRadiusPx;
  const last = TEXTURE_SIZE_PX - 1 - limits.insetPx;
  const left = limits.insetPx + offsets.left[periodic(y)];
  const right = last - offsets.right[periodic(y)];
  const top = limits.insetPx + offsets.top[periodic(x)];
  const bottom = last - offsets.bottom[periodic(x)];
  const notches = [
    { isInside: x < left && y < top, first: left - 1 - x, second: top - 1 - y },
    { isInside: x > right && y < top, first: x - right - 1, second: top - 1 - y },
    { isInside: x < left && y > bottom, first: left - 1 - x, second: y - bottom - 1 },
    { isInside: x > right && y > bottom, first: x - right - 1, second: y - bottom - 1 },
  ];
  return !notches.some(
    ({ isInside, first, second }) => isInside && isInsideRoundedCorner(options.style, radius, first, second),
  );
}

function drawRegion(
  sheet: ImageData,
  texture: ImageData,
  isGround: GroundTest,
  size: number,
  sheetLeft: number,
  sheetTop: number,
): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isGround(x, y)) continue;
      const sheetX = sheetLeft + x;
      const sheetY = sheetTop + y;
      const textureIndex = (periodic(sheetY) * TEXTURE_SIZE_PX + periodic(sheetX)) * 4;
      const sheetIndex = (sheetY * SHEET_WIDTH_PX + sheetX) * 4;
      for (let channel = 0; channel < 3; channel++) {
        sheet.data[sheetIndex + channel] = texture.data[textureIndex + channel];
      }
      sheet.data[sheetIndex + 3] = 255;
    }
  }
}

export function generateAutotileSheet(texture: ImageData, options: GeneratorOptions): ImageData {
  const limits = effectiveLimits(options);
  const offsets = edgeOffsets(options, limits);
  const sheet = new ImageData(SHEET_WIDTH_PX, SHEET_HEIGHT_PX);
  drawRegion(
    sheet,
    texture,
    (u, v) => isGroundInFrame(options, limits, offsets, u, v),
    FRAME_SIZE_PX,
    0,
    FRAME_TOP_PX,
  );
  drawRegion(
    sheet,
    texture,
    (x, y) => isGroundInInnerCornerTile(options, limits, offsets, x, y),
    TEXTURE_SIZE_PX,
    INNER_CORNER_TILE_LEFT_PX,
    0,
  );
  return sheet;
}

const GUIDE_GROUND_RGBA = [80, 190, 110, 90];
const GUIDE_TRANSPARENT_RGBA = [230, 70, 70, 110];
const GUIDE_UNUSED_RGBA = [120, 120, 120, 120];

export function guideFromSheet(sheet: ImageData): ImageData {
  const guide = new ImageData(sheet.width, sheet.height);
  const unusedWidthPx = UNUSED_QUARTER_COLUMNS * AUTOTILE_QUARTER_SIZE_PX;
  const unusedHeightPx = UNUSED_QUARTER_ROWS * AUTOTILE_QUARTER_SIZE_PX;
  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < sheet.width; x++) {
      const index = (y * sheet.width + x) * 4;
      const isUnused = x < unusedWidthPx && y < unusedHeightPx;
      const color = isUnused
        ? GUIDE_UNUSED_RGBA
        : sheet.data[index + 3] > 0
          ? GUIDE_GROUND_RGBA
          : GUIDE_TRANSPARENT_RGBA;
      guide.data.set(color, index);
    }
  }
  return guide;
}
