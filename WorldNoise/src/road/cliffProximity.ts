import { WATER_LEVEL } from '../elevation/heightLevel';

const NEIGHBOUR_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];

function isLandChange(first: number, second: number): boolean {
  return first !== second && first !== WATER_LEVEL && second !== WATER_LEVEL;
}

function spread(
  source: Uint8Array,
  width: number,
  height: number,
  reach: number,
  alongX: boolean,
): Uint8Array {
  const result = new Uint8Array(source.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!source[y * width + x]) continue;
      for (let offset = -reach; offset <= reach; offset++) {
        const nx = alongX ? x + offset : x;
        const ny = alongX ? y : y + offset;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) result[ny * width + nx] = 1;
      }
    }
  }
  return result;
}

export function cliffProximity(levels: Int8Array, width: number, height: number, reach: number): Uint8Array {
  const edge = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      for (const [dx, dy] of NEIGHBOUR_STEPS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= width || ny >= height) continue;
        const neighbour = ny * width + nx;
        if (isLandChange(levels[index], levels[neighbour])) {
          edge[index] = 1;
          edge[neighbour] = 1;
        }
      }
    }
  }
  return spread(spread(edge, width, height, reach, true), width, height, reach, false);
}
