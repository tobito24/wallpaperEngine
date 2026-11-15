import { ELEVATION_CONTRAST, ELEVATION_RAW_RANGE_HIGH, ELEVATION_RAW_RANGE_LOW } from '../config/constants';

if (!(ELEVATION_CONTRAST >= 0 && ELEVATION_CONTRAST < 1)) {
  throw new RangeError('ELEVATION_CONTRAST must be at least 0 and below 1');
}
if (!(ELEVATION_RAW_RANGE_HIGH > ELEVATION_RAW_RANGE_LOW)) {
  throw new RangeError('ELEVATION_RAW_RANGE_HIGH must be above ELEVATION_RAW_RANGE_LOW');
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function biasCurve(t: number, bias: number): number {
  return t / ((1 / bias - 2) * (1 - t) + 1);
}

function contrastCurve(t: number, contrast: number): number {
  const bias = 0.5 - contrast / 2;
  return t < 0.5 ? biasCurve(2 * t, bias) / 2 : 1 - biasCurve(2 - 2 * t, bias) / 2;
}

export function redistributeElevation(rawElevation: number): number {
  const stretched = clamp01(
    (rawElevation - ELEVATION_RAW_RANGE_LOW) / (ELEVATION_RAW_RANGE_HIGH - ELEVATION_RAW_RANGE_LOW),
  );
  return contrastCurve(stretched, ELEVATION_CONTRAST);
}
