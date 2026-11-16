import Alea from 'alea';
import { AUTOTILE_QUARTER_COLUMNS, AUTOTILE_QUARTER_SIZE_PX } from '../config/constants';

export const TEXTURE_SIZE_PX = AUTOTILE_QUARTER_SIZE_PX * 2;
export const SHEET_WIDTH_PX = AUTOTILE_QUARTER_COLUMNS * AUTOTILE_QUARTER_SIZE_PX;
export const SHEET_HEIGHT_PX = 128;
export const MAX_INSET_PX = AUTOTILE_QUARTER_SIZE_PX;
export const MAX_WAVE_AMPLITUDE_PX = 4;
export const MAX_DITHER_PX = 2;
export const MAX_SHADE_WIDTH_PX = 3;
export const WAVE_PERIODS_PX = [16, 32] as const;

const FRAME_SIZE_PX = 96;
const FRAME_TOP_PX = 32;
const INNER_CORNER_TILE_LEFT_PX = 64;
const UNUSED_QUARTER_COLUMNS = 4;
const UNUSED_QUARTER_ROWS = 2;
const ROUGH_RUN_MIN_PX = 2;
const ROUGH_RUN_SPREAD_PX = 4;
const RING_REACH_MARGIN_PX = 1;
const RING_TOLERANCE_PX = 0.5;

export type EdgeStyle = 'edge' | 'curve' | 'wavy' | 'rough';
export type WaveShape = 'sine' | 'triangle' | 'square' | 'scallop';
export type FillMode = 'full' | 'rim';

export interface Sides<Value> {
  top: Value;
  right: Value;
  bottom: Value;
  left: Value;
}

export interface GeneratorOptions {
  style: EdgeStyle;
  insets: Sides<number>;
  outerCornerRadiusPx: number;
  innerCornerRadiusPx: number;
  waveShape: WaveShape;
  waveAmplitudePx: number;
  wavePeriodPx: number;
  roughSeed: string;
  fillMode: FillMode;
  rimWidthPx: number;
  ditherPx: number;
  shadeWidthPx: number;
  shadeAmountPercent: number;
  textureOffsetXPx: number;
  textureOffsetYPx: number;
}

export interface EffectiveLimits {
  insets: Sides<number>;
  waveAmplitudes: Sides<number>;
  outerCornerRadiusPx: number;
  innerCornerRadiusPx: number;
  maxOuterCornerRadiusPx: number;
  maxInnerCornerRadiusPx: number;
  rimWidthPx: number;
  maxRimWidthPx: number;
  ditherPx: number;
  shadeWidthPx: number;
}

type GroundTest = (x: number, y: number) => boolean;

interface EdgeOffsets {
  top: number[];
  bottom: number[];
  left: number[];
  right: number[];
}

interface RegionStyle {
  limits: EffectiveLimits;
  options: GeneratorOptions;
  offsets: EdgeOffsets;
}

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

function periodic(index: number): number {
  return ((index % TEXTURE_SIZE_PX) + TEXTURE_SIZE_PX) % TEXTURE_SIZE_PX;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), Math.max(min, max));
}

function mapSides<Input, Output>(
  sides: Sides<Input>,
  convert: (value: Input, side: keyof Sides<Input>) => Output,
): Sides<Output> {
  return {
    top: convert(sides.top, 'top'),
    right: convert(sides.right, 'right'),
    bottom: convert(sides.bottom, 'bottom'),
    left: convert(sides.left, 'left'),
  };
}

export function effectiveLimits(options: GeneratorOptions): EffectiveLimits {
  const insets = mapSides(options.insets, (inset) => clamp(inset, 0, MAX_INSET_PX));
  const isWaving = options.style === 'wavy' || options.style === 'rough';
  const waveAmplitudes = mapSides(insets, (inset) =>
    isWaving
      ? clamp(options.waveAmplitudePx, 0, Math.min(MAX_WAVE_AMPLITUDE_PX, inset, MAX_INSET_PX - inset))
      : 0,
  );
  const outerRoom = SIDES.map((side) => MAX_INSET_PX - insets[side] - waveAmplitudes[side]);
  const innerRoom = SIDES.map((side) => insets[side] - waveAmplitudes[side]);
  const maxOuterCornerRadiusPx = Math.max(0, Math.min(...outerRoom));
  const maxInnerCornerRadiusPx = Math.max(0, Math.min(...innerRoom));
  const maxRimWidthPx = Math.max(1, Math.min(...outerRoom));
  return {
    insets,
    waveAmplitudes,
    outerCornerRadiusPx: clamp(options.outerCornerRadiusPx, 0, maxOuterCornerRadiusPx),
    innerCornerRadiusPx: clamp(options.innerCornerRadiusPx, 0, maxInnerCornerRadiusPx),
    maxOuterCornerRadiusPx,
    maxInnerCornerRadiusPx,
    rimWidthPx: clamp(options.rimWidthPx, 1, maxRimWidthPx),
    maxRimWidthPx,
    ditherPx: clamp(options.ditherPx, 0, MAX_DITHER_PX),
    shadeWidthPx: clamp(options.shadeWidthPx, 0, MAX_SHADE_WIDTH_PX),
  };
}

function waveValue(shape: WaveShape, phase: number): number {
  switch (shape) {
    case 'sine':
      return Math.sin(2 * Math.PI * phase);
    case 'triangle':
      if (phase < 0.25) return 4 * phase;
      return phase < 0.75 ? 2 - 4 * phase : 4 * phase - 4;
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'scallop':
      return 1 - 2 * Math.sqrt(Math.max(0, 1 - (2 * phase - 1) ** 2));
  }
}

function roughProfile(random: () => number, amplitude: number): number[] {
  const profile: number[] = [];
  while (profile.length < TEXTURE_SIZE_PX) {
    const value = Math.floor(random() * (2 * amplitude + 1)) - amplitude;
    const run = ROUGH_RUN_MIN_PX + Math.floor(random() * ROUGH_RUN_SPREAD_PX);
    for (let step = 0; step < run && profile.length < TEXTURE_SIZE_PX; step++) profile.push(value);
  }
  return profile;
}

function edgeOffsets(options: GeneratorOptions, limits: EffectiveLimits): EdgeOffsets {
  const indices = Array.from({ length: TEXTURE_SIZE_PX }, (_, index) => index);
  const period = options.wavePeriodPx;
  const wave = (index: number, amplitude: number): number =>
    Math.round(amplitude * waveValue(options.waveShape, (((index % period) + period) % period) / period));
  const { insets, waveAmplitudes } = limits;
  if (options.style === 'rough') {
    const random = Alea(options.roughSeed);
    return {
      top: roughProfile(random, waveAmplitudes.top),
      right: roughProfile(random, waveAmplitudes.right),
      bottom: roughProfile(random, waveAmplitudes.bottom),
      left: roughProfile(random, waveAmplitudes.left),
    };
  }
  return {
    top: indices.map((index) => wave(index - insets.left, waveAmplitudes.top)),
    left: indices.map((index) => wave(index - insets.top, waveAmplitudes.left)),
    bottom: indices.map((index) => wave(TEXTURE_SIZE_PX - 1 - index - insets.right, waveAmplitudes.bottom)),
    right: indices.map((index) => wave(TEXTURE_SIZE_PX - 1 - index - insets.bottom, waveAmplitudes.right)),
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

function isGroundInFrame({ options, limits, offsets }: RegionStyle, u: number, v: number): boolean {
  const radius = limits.outerCornerRadiusPx;
  const { insets } = limits;
  const left = insets.left + offsets.left[periodic(v)];
  const right = FRAME_SIZE_PX - 1 - insets.right - offsets.right[periodic(v)];
  const top = insets.top + offsets.top[periodic(u)];
  const bottom = FRAME_SIZE_PX - 1 - insets.bottom - offsets.bottom[periodic(u)];
  if (u < left || u > right || v < top || v > bottom) return false;
  return (
    isInsideRoundedCorner(options.style, radius, u - left, v - top) &&
    isInsideRoundedCorner(options.style, radius, right - u, v - top) &&
    isInsideRoundedCorner(options.style, radius, u - left, bottom - v) &&
    isInsideRoundedCorner(options.style, radius, right - u, bottom - v)
  );
}

function isGroundInInnerCornerTile({ options, limits, offsets }: RegionStyle, x: number, y: number): boolean {
  const radius = limits.innerCornerRadiusPx;
  const { insets } = limits;
  const left = insets.left + offsets.left[periodic(y)];
  const right = TEXTURE_SIZE_PX - 1 - insets.right - offsets.right[periodic(y)];
  const top = insets.top + offsets.top[periodic(x)];
  const bottom = TEXTURE_SIZE_PX - 1 - insets.bottom - offsets.bottom[periodic(x)];
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

function ringReachPx(options: GeneratorOptions, limits: EffectiveLimits): number {
  const rim = options.fillMode === 'rim' ? limits.rimWidthPx : 0;
  const widest = Math.max(rim, limits.ditherPx, limits.shadeWidthPx);
  return widest === 0 ? 0 : Math.ceil(widest + RING_TOLERANCE_PX) + RING_REACH_MARGIN_PX;
}

function distancesToOutside(isGround: GroundTest, size: number, reach: number): Float32Array {
  const gridSize = size + 2 * reach;
  const isGroundInGrid = new Uint8Array(gridSize * gridSize);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++)
      isGroundInGrid[y * gridSize + x] = isGround(x - reach, y - reach) ? 1 : 0;
  }
  const distances = new Float32Array(size * size).fill(Infinity);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isGroundInGrid[(y + reach) * gridSize + x + reach]) continue;
      let nearestSquared = Infinity;
      for (let dy = -reach; dy <= reach; dy++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const squared = dx * dx + dy * dy;
          if (squared >= nearestSquared) continue;
          if (!isGroundInGrid[(y + reach + dy) * gridSize + x + reach + dx]) nearestSquared = squared;
        }
      }
      distances[y * size + x] = Math.sqrt(nearestSquared);
    }
  }
  return distances;
}

function shadeChannel(value: number, factor: number): number {
  return Math.min(255, Math.max(0, Math.round(value * factor)));
}

function drawRegion(
  sheet: ImageData,
  texture: ImageData,
  { options, limits }: RegionStyle,
  isGround: GroundTest,
  size: number,
  sheetLeft: number,
  sheetTop: number,
): void {
  const reach = ringReachPx(options, limits);
  const distances = reach > 0 ? distancesToOutside(isGround, size, reach) : undefined;
  const shadeFactor = 1 + options.shadeAmountPercent / 100;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!isGround(x, y)) continue;
      const distance = distances ? distances[y * size + x] : Infinity;
      if (options.fillMode === 'rim' && distance > limits.rimWidthPx + RING_TOLERANCE_PX) continue;
      const sheetX = sheetLeft + x;
      const sheetY = sheetTop + y;
      const ditherRing =
        distance <= limits.ditherPx + RING_TOLERANCE_PX
          ? Math.max(1, Math.ceil(distance - RING_TOLERANCE_PX))
          : 0;
      if (ditherRing > 0 && (sheetX + sheetY + ditherRing) % 2 === 0) continue;
      const textureIndex =
        (periodic(sheetY + options.textureOffsetYPx) * TEXTURE_SIZE_PX +
          periodic(sheetX + options.textureOffsetXPx)) *
        4;
      const isShaded = limits.shadeWidthPx > 0 && distance <= limits.shadeWidthPx + RING_TOLERANCE_PX;
      const sheetIndex = (sheetY * sheet.width + sheetX) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const value = texture.data[textureIndex + channel];
        sheet.data[sheetIndex + channel] = isShaded ? shadeChannel(value, shadeFactor) : value;
      }
      sheet.data[sheetIndex + 3] = 255;
    }
  }
}

export function generateAutotileSheet(textures: ImageData[], options: GeneratorOptions): ImageData {
  const limits = effectiveLimits(options);
  const regionStyle: RegionStyle = { options, limits, offsets: edgeOffsets(options, limits) };
  const sheet = new ImageData(SHEET_WIDTH_PX * textures.length, SHEET_HEIGHT_PX);
  textures.forEach((texture, frame) => {
    const frameLeft = frame * SHEET_WIDTH_PX;
    drawRegion(
      sheet,
      texture,
      regionStyle,
      (u, v) => isGroundInFrame(regionStyle, u, v),
      FRAME_SIZE_PX,
      frameLeft,
      FRAME_TOP_PX,
    );
    drawRegion(
      sheet,
      texture,
      regionStyle,
      (x, y) => isGroundInInnerCornerTile(regionStyle, x, y),
      TEXTURE_SIZE_PX,
      frameLeft + INNER_CORNER_TILE_LEFT_PX,
      0,
    );
  });
  return sheet;
}

const GUIDE_GROUND_RGBA = [80, 190, 110, 90];
const GUIDE_TRANSPARENT_RGBA = [230, 70, 70, 110];
const GUIDE_UNUSED_RGBA = [120, 120, 120, 120];

export function guideFromSheet(sheet: ImageData): ImageData {
  const guide = new ImageData(SHEET_WIDTH_PX, sheet.height);
  const unusedWidthPx = UNUSED_QUARTER_COLUMNS * AUTOTILE_QUARTER_SIZE_PX;
  const unusedHeightPx = UNUSED_QUARTER_ROWS * AUTOTILE_QUARTER_SIZE_PX;
  for (let y = 0; y < sheet.height; y++) {
    for (let x = 0; x < SHEET_WIDTH_PX; x++) {
      const isUnused = x < unusedWidthPx && y < unusedHeightPx;
      const hasGround = sheet.data[(y * sheet.width + x) * 4 + 3] > 0;
      const color = isUnused ? GUIDE_UNUSED_RGBA : hasGround ? GUIDE_GROUND_RGBA : GUIDE_TRANSPARENT_RGBA;
      guide.data.set(color, (y * SHEET_WIDTH_PX + x) * 4);
    }
  }
  return guide;
}
