import { CELL_BUFFER_CHUNKS, CELL_SIZE_CHUNKS } from '../config/constants';

export type ChunkOffset = readonly [number, number];

export type TownShapeKind = 'large' | 'tall' | 'wide' | 'L' | 'T' | 'O' | 'small';

export interface TownShape {
  readonly name: string;
  readonly kind: TownShapeKind;
  readonly chunks: readonly ChunkOffset[];
  readonly holes: readonly ChunkOffset[];
}

export const TOWN_BLOCK_CHUNKS = CELL_SIZE_CHUNKS - 2 * CELL_BUFFER_CHUNKS;

if (TOWN_BLOCK_CHUNKS !== 3) {
  throw new RangeError('The town shapes are made for a block of 3 x 3 chunks inside the buffer of a cell');
}

function rectangle(x0: number, y0: number, width: number, height: number): ChunkOffset[] {
  const chunks: ChunkOffset[] = [];
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) chunks.push([x, y]);
  }
  return chunks;
}

function rotated(chunks: readonly ChunkOffset[]): ChunkOffset[] {
  return chunks.map(([x, y]): ChunkOffset => [TOWN_BLOCK_CHUNKS - 1 - y, x]);
}

function rotations(kind: TownShapeKind, chunks: readonly ChunkOffset[]): TownShape[] {
  const shapes: TownShape[] = [];
  let current: readonly ChunkOffset[] = chunks;
  for (let turn = 0; turn < 4; turn++) {
    shapes.push({ name: `${kind}${turn}`, kind, chunks: current, holes: [] });
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

function shape(name: string, kind: TownShapeKind, chunks: readonly ChunkOffset[]): TownShape {
  return { name, kind, chunks, holes: [] };
}

const O_HOLE: ChunkOffset = [1, 1];

export const TOWN_SHAPES: readonly TownShape[] = [
  shape('large', 'large', rectangle(0, 0, 3, 3)),
  shape('tall0', 'tall', rectangle(0, 0, 2, 3)),
  shape('tall1', 'tall', rectangle(1, 0, 2, 3)),
  shape('wide0', 'wide', rectangle(0, 0, 3, 2)),
  shape('wide1', 'wide', rectangle(0, 1, 3, 2)),
  ...rotations('L', L_CHUNKS),
  ...rotations('T', T_CHUNKS),
  {
    name: 'O',
    kind: 'O',
    chunks: rectangle(0, 0, 3, 3).filter(([x, y]) => x !== O_HOLE[0] || y !== O_HOLE[1]),
    holes: [O_HOLE],
  },
  shape('small00', 'small', rectangle(0, 0, 2, 2)),
  shape('small10', 'small', rectangle(1, 0, 2, 2)),
  shape('small01', 'small', rectangle(0, 1, 2, 2)),
  shape('small11', 'small', rectangle(1, 1, 2, 2)),
];

export const TOWN_SHAPE_KIND_WEIGHTS: Readonly<Record<TownShapeKind, number>> = {
  small: 30,
  large: 15,
  tall: 15,
  wide: 15,
  L: 15,
  T: 10,
  O: 8,
};
