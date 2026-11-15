export type Redistribution = (rawValue: number) => number;

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

export function createRedistribution(
  rawRangeLow: number,
  rawRangeHigh: number,
  contrast: number,
): Redistribution {
  if (!(contrast >= 0 && contrast < 1)) {
    throw new RangeError('contrast must be at least 0 and below 1');
  }
  if (!(rawRangeHigh > rawRangeLow)) {
    throw new RangeError('rawRangeHigh must be above rawRangeLow');
  }

  return (rawValue: number): number =>
    contrastCurve(clamp01((rawValue - rawRangeLow) / (rawRangeHigh - rawRangeLow)), contrast);
}
