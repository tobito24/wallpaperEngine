export type TileColor = 'none' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet';

export const CYCLE: readonly TileColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

const COLOR_HEX: Record<TileColor, string> = {
  none: '#34383f',
  red: '#d9838a',
  orange: '#dba073',
  yellow: '#d9c583',
  green: '#8fbf9a',
  blue: '#7fa8c9',
  indigo: '#8e93c4',
  violet: '#a98cc0',
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
