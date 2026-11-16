import { HEIGHT_LEVEL_THRESHOLDS } from '../config/constants';

const SHADE_BY_HEIGHT_LEVEL: ReadonlyArray<string | null> = [
  null,
  'rgba(0, 0, 0, 0.18)',
  null,
  'rgba(255, 255, 255, 0.14)',
  'rgba(255, 255, 255, 0.26)',
];

if (SHADE_BY_HEIGHT_LEVEL.length !== HEIGHT_LEVEL_THRESHOLDS.length + 2) {
  throw new RangeError('SHADE_BY_HEIGHT_LEVEL needs one entry for water and one per land level');
}

export function shadeForHeightLevel(heightLevel: number): string | null {
  return SHADE_BY_HEIGHT_LEVEL[heightLevel] ?? null;
}
