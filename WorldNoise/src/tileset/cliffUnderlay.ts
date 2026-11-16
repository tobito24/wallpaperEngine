import type { Ground } from './ground';

export function lowerNeighbourGround(
  level: number,
  verticalLevel: number,
  verticalGround: Ground,
  horizontalLevel: number,
  horizontalGround: Ground,
  diagonalLevel: number,
  diagonalGround: Ground,
): Ground | null {
  if (verticalLevel < level) return verticalGround;
  if (horizontalLevel < level) return horizontalGround;
  if (diagonalLevel < level) return diagonalGround;
  return null;
}
