const STEPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

export interface PathNetworkInput {
  readonly width: number;
  readonly height: number;
  readonly walkable: Uint8Array;
  readonly streetTiles: readonly number[];
  readonly strips: readonly (readonly number[])[];
  readonly maxLength: number;
}

export interface PathNetwork {
  readonly connected: readonly boolean[];
  readonly tiles: ReadonlySet<number>;
}

interface Reach {
  readonly distance: Int16Array;
  readonly parent: Int32Array;
}

interface Link {
  readonly length: number;
  readonly meetingTile: number;
}

function reachFrom(input: PathNetworkInput, sources: readonly number[]): Reach {
  const { width, height, walkable, maxLength } = input;
  const distance = new Int16Array(width * height).fill(-1);
  const parent = new Int32Array(width * height).fill(-1);
  let frontier = [...sources];
  for (const source of sources) distance[source] = 0;
  for (let length = 1; length <= maxLength && frontier.length > 0; length++) {
    const next: number[] = [];
    for (const index of frontier) {
      const tileX = index % width;
      const tileY = Math.floor(index / width);
      for (const [dx, dy] of STEPS) {
        const nx = tileX + dx;
        const ny = tileY + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const neighbour = ny * width + nx;
        if (distance[neighbour] !== -1 || !walkable[neighbour]) continue;
        distance[neighbour] = length;
        parent[neighbour] = index;
        next.push(neighbour);
      }
    }
    frontier = next;
  }
  return { distance, parent };
}

function nearestTile(reach: Reach, tiles: readonly number[]): Link | null {
  let best: Link | null = null;
  for (const tile of tiles) {
    const length = reach.distance[tile];
    if (length >= 0 && (best === null || length < best.length)) best = { length, meetingTile: tile };
  }
  return best;
}

function widened(input: PathNetworkInput, connection: ReadonlySet<number>): Set<number> {
  const { width, height, walkable } = input;
  const result = new Set(connection);
  const canTake = (tileX: number, tileY: number): boolean =>
    tileX >= 0 && tileY >= 0 && tileX < width && tileY < height && walkable[tileY * width + tileX] === 1;
  const take = (first: readonly [number, number], second: readonly [number, number]): void => {
    const [tileX, tileY] = canTake(first[0], first[1]) ? first : second;
    if (canTake(tileX, tileY)) result.add(tileY * width + tileX);
  };
  for (const index of connection) {
    const tileX = index % width;
    const tileY = Math.floor(index / width);
    const hasTile = (x: number, y: number): boolean =>
      x >= 0 && y >= 0 && x < width && y < height && connection.has(y * width + x);
    const runsVertically = hasTile(tileX, tileY - 1) || hasTile(tileX, tileY + 1);
    const runsHorizontally = hasTile(tileX - 1, tileY) || hasTile(tileX + 1, tileY);
    if (runsVertically) take([tileX + 1, tileY], [tileX - 1, tileY]);
    if (runsHorizontally) take([tileX, tileY + 1], [tileX, tileY - 1]);
  }
  return result;
}

export function planPathNetwork(input: PathNetworkInput): PathNetwork {
  const nodes: (readonly number[])[] = [input.streetTiles, ...input.strips];
  const reaches = nodes.map((tiles) => reachFrom(input, tiles));
  const links = nodes.map((_, from) =>
    nodes.map((tiles, to) => (from === to ? null : nearestTile(reaches[from], tiles))),
  );

  const inTree = nodes.map((_, index) => index === 0);
  const connected = nodes.map((_, index) => index === 0);
  const connection = new Set<number>();
  for (;;) {
    let best: { from: number; to: number; link: Link } | null = null;
    for (let from = 0; from < nodes.length; from++) {
      if (!inTree[from]) continue;
      for (let to = 0; to < nodes.length; to++) {
        const link = links[from][to];
        if (inTree[to] || link === null) continue;
        if (best === null || link.length < best.link.length) best = { from, to, link };
      }
    }
    if (best === null) break;
    inTree[best.to] = true;
    connected[best.to] = true;
    const { parent } = reaches[best.from];
    for (let step = best.link.meetingTile; step !== -1; step = parent[step]) connection.add(step);
  }

  const tiles = new Set<number>();
  input.strips.forEach((strip, index) => {
    if (connected[index + 1]) for (const tile of strip) tiles.add(tile);
  });
  const droppedStripTiles = new Set<number>();
  input.strips.forEach((strip, index) => {
    if (!connected[index + 1]) for (const tile of strip) droppedStripTiles.add(tile);
  });
  for (const tile of widened(input, connection)) {
    if (!droppedStripTiles.has(tile) || connection.has(tile) || tiles.has(tile)) tiles.add(tile);
  }
  return { connected: connected.slice(1), tiles };
}
