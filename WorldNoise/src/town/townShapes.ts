export type ChunkOffset = readonly [number, number];

export type TownSizeClass = 'large' | 'medium' | 'small';

export interface TownShape {
  readonly name: string;
  readonly sizeClass: TownSizeClass;
  readonly chunks: readonly ChunkOffset[];
}

const INNER_BLOCK_SIZE_CHUNKS = 3;

function rectangle(x0: number, y0: number, width: number, height: number): ChunkOffset[] {
  const chunks: ChunkOffset[] = [];
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) chunks.push([x, y]);
  }
  return chunks;
}

function rotated(chunks: readonly ChunkOffset[]): ChunkOffset[] {
  return chunks.map(([x, y]): ChunkOffset => [INNER_BLOCK_SIZE_CHUNKS - 1 - y, x]);
}

function rotations(name: string, sizeClass: TownSizeClass, chunks: readonly ChunkOffset[]): TownShape[] {
  const shapes: TownShape[] = [];
  let current: readonly ChunkOffset[] = chunks;
  for (let turn = 0; turn < 4; turn++) {
    shapes.push({ name: `${name}${turn}`, sizeClass, chunks: current });
    current = rotated(current);
  }
  return shapes;
}

const L_CHUNKS: readonly ChunkOffset[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [0, 2],
];

const T_CHUNKS: readonly ChunkOffset[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [1, 1],
  [1, 2],
];

export const TOWN_SHAPES: readonly TownShape[] = [
  { name: 'large', sizeClass: 'large', chunks: rectangle(0, 0, 3, 3) },
  { name: 'tall0', sizeClass: 'medium', chunks: rectangle(0, 0, 2, 3) },
  { name: 'tall1', sizeClass: 'medium', chunks: rectangle(1, 0, 2, 3) },
  { name: 'wide0', sizeClass: 'medium', chunks: rectangle(0, 0, 3, 2) },
  { name: 'wide1', sizeClass: 'medium', chunks: rectangle(0, 1, 3, 2) },
  ...rotations('L', 'medium', L_CHUNKS),
  ...rotations('T', 'medium', T_CHUNKS),
  { name: 'small00', sizeClass: 'small', chunks: rectangle(0, 0, 2, 2) },
  { name: 'small10', sizeClass: 'small', chunks: rectangle(1, 0, 2, 2) },
  { name: 'small01', sizeClass: 'small', chunks: rectangle(0, 1, 2, 2) },
  { name: 'small11', sizeClass: 'small', chunks: rectangle(1, 1, 2, 2) },
];
