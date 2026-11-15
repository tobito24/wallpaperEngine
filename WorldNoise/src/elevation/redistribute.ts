import { ELEVATION_CONTRAST, ELEVATION_RAW_RANGE_HIGH, ELEVATION_RAW_RANGE_LOW } from '../config/constants';

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function biasCurve(t: number, bias: number): number {
  return t / ((1 / bias - 2) * (1 - t) + 1);
}

function gainCurve(t: number, gain: number): number {
  return t < 0.5 ? biasCurve(2 * t, 1 - gain) / 2 : 1 - biasCurve(2 - 2 * t, 1 - gain) / 2;
}

export function redistributeElevation(rawElevation: number): number {
  const stretched = clamp01(
    (rawElevation - ELEVATION_RAW_RANGE_LOW) / (ELEVATION_RAW_RANGE_HIGH - ELEVATION_RAW_RANGE_LOW),
  );
  return gainCurve(stretched, ELEVATION_CONTRAST);
}
