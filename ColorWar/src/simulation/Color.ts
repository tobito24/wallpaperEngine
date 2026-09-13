export type TileColor = 'none' | 'red' | 'green' | 'blue';

export const CYCLE: readonly TileColor[] = ['red', 'green', 'blue'];

const COLOR_HEX: Record<TileColor, string> = {
  none: '#34383f',
  red: '#d96c75',
  green: '#6fba82',
  blue: '#649fd1',
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
