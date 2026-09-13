export type TileColor = 'none' | 'red' | 'green' | 'blue';

const CYCLE: readonly TileColor[] = ['red', 'green', 'blue'];

const COLOR_HEX: Record<TileColor, string> = {
  none: '#2c3036',
  red: '#e5484d',
  green: '#46a758',
  blue: '#4098e0',
};

export function colorHex(color: TileColor): string {
  return COLOR_HEX[color];
}

export function nextInCycle(color: TileColor): TileColor {
  if (color === 'none') return CYCLE[0];
  return CYCLE[(CYCLE.indexOf(color) + 1) % CYCLE.length];
}

export function previousInCycle(color: TileColor): TileColor {
  if (color === 'none') return CYCLE[0];
  return CYCLE[(CYCLE.indexOf(color) - 1 + CYCLE.length) % CYCLE.length];
}

export function beatingColor(color: TileColor): TileColor | null {
  if (color === 'none') return null;
  return CYCLE[(CYCLE.indexOf(color) - 1 + CYCLE.length) % CYCLE.length];
}
