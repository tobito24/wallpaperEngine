import {
  TOWN_SIDE_STREET_CHANCE,
  TOWN_SIDE_STREET_EDGE_MARGIN_TILES,
  TOWN_SIDE_STREET_MAX_LENGTH_TILES,
  TOWN_SIDE_STREET_MAX_SPACING_TILES,
  TOWN_SIDE_STREET_MIN_LENGTH_TILES,
  TOWN_SIDE_STREET_MIN_SPACING_TILES,
  TOWN_SIDE_STREET_WIDTH_TILES,
} from '../config/constants';
import type { Point } from '../skeleton/cellGrid';
import type { TownGrid } from './townGrid';
import type { Street } from './townStreets';

export interface SideStreet {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
}

export interface SideStreets {
  readonly streets: readonly SideStreet[];
  readonly mask: Uint8Array;
}

const THROUGH_STREET_HALF_WIDTH_TILES = 1;

interface Segment {
  readonly alongX: boolean;
  readonly lane: number;
  readonly from: number;
  readonly to: number;
}

function segmentsOf(streets: readonly Street[]): Segment[] {
  const segments: Segment[] = [];
  for (const street of streets) {
    for (let index = 0; index + 1 < street.length; index++) {
      const start: Point = street[index];
      const end: Point = street[index + 1];
      if (start.y === end.y) {
        segments.push({
          alongX: true,
          lane: Math.floor(start.y),
          from: Math.floor(Math.min(start.x, end.x)),
          to: Math.floor(Math.max(start.x, end.x)),
        });
      } else if (start.x === end.x) {
        segments.push({
          alongX: false,
          lane: Math.floor(start.x),
          from: Math.floor(Math.min(start.y, end.y)),
          to: Math.floor(Math.max(start.y, end.y)),
        });
      }
    }
  }
  return segments;
}

export function planSideStreets(
  grid: TownGrid,
  throughStreets: readonly Street[],
  random: () => number,
): SideStreets {
  const { minX, minY, width, height, usable, roads } = grid;
  const mask = new Uint8Array(width * height);
  const streets: SideStreet[] = [];

  const indexOf = (x: number, y: number): number => (y - minY) * width + (x - minX);
  const isInside = (x: number, y: number): boolean =>
    x >= minX && y >= minY && x < minX + width && y < minY + height;
  const isFree = (x: number, y: number): boolean =>
    isInside(x, y) && usable[indexOf(x, y)] === 1 && mask[indexOf(x, y)] === 0;
  const isTown = (x: number, y: number): boolean =>
    isInside(x, y) && (usable[indexOf(x, y)] === 1 || roads[indexOf(x, y)] === 1);

  const grow = (segment: Segment, lateral: number, outward: number): void => {
    const tilesAt = (step: number): Point[] => {
      const along = segment.lane + outward * (THROUGH_STREET_HALF_WIDTH_TILES + 1 + step);
      return Array.from({ length: TOWN_SIDE_STREET_WIDTH_TILES }, (_, offset) =>
        segment.alongX ? { x: lateral + offset, y: along } : { x: along, y: lateral + offset },
      );
    };
    let length = 0;
    while (length < TOWN_SIDE_STREET_MAX_LENGTH_TILES) {
      if (!tilesAt(length).every(({ x, y }) => isFree(x, y))) break;
      let hasMargin = true;
      for (let ahead = 1; ahead <= TOWN_SIDE_STREET_EDGE_MARGIN_TILES; ahead++) {
        if (!tilesAt(length + ahead).every(({ x, y }) => isTown(x, y))) hasMargin = false;
      }
      if (!hasMargin) break;
      length++;
    }
    if (length < TOWN_SIDE_STREET_MIN_LENGTH_TILES) return;

    const tiles = Array.from({ length }, (_, step) => tilesAt(step)).flat();
    for (const { x, y } of tiles) mask[indexOf(x, y)] = 1;
    const xs = tiles.map(({ x }) => x);
    const ys = tiles.map(({ y }) => y);
    streets.push({
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs) + 1,
      height: Math.max(...ys) - Math.min(...ys) + 1,
    });
  };

  const spacing = (): number =>
    TOWN_SIDE_STREET_WIDTH_TILES +
    TOWN_SIDE_STREET_MIN_SPACING_TILES +
    Math.floor(random() * (TOWN_SIDE_STREET_MAX_SPACING_TILES - TOWN_SIDE_STREET_MIN_SPACING_TILES + 1));

  for (const segment of segmentsOf(throughStreets)) {
    let lateral =
      segment.from +
      TOWN_SIDE_STREET_EDGE_MARGIN_TILES +
      Math.floor(random() * TOWN_SIDE_STREET_MIN_SPACING_TILES);
    while (lateral + TOWN_SIDE_STREET_WIDTH_TILES - 1 <= segment.to - TOWN_SIDE_STREET_EDGE_MARGIN_TILES) {
      for (const outward of [-1, 1]) {
        if (random() < TOWN_SIDE_STREET_CHANCE) grow(segment, lateral, outward);
      }
      lateral += spacing();
    }
  }
  return { streets, mask };
}
