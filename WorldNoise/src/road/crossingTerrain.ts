import { footprintOf, plannedLevelAt } from './roadCrossing';
import type { RoadCrossing } from './roadCrossing';
import type { RoadEdge } from './roadEdge';

function byId(a: RoadCrossing, b: RoadCrossing): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function crossingsOf(edges: readonly RoadEdge[]): RoadCrossing[] {
  return edges.flatMap((edge) => edge.crossings).sort(byId);
}

export function flattenCrossings(
  levels: Uint8Array,
  minX: number,
  minY: number,
  size: number,
  crossings: readonly RoadCrossing[],
): void {
  for (const crossing of crossings) {
    const footprint = footprintOf(crossing);
    const firstX = Math.max(minX, footprint.minX);
    const lastX = Math.min(minX + size - 1, footprint.minX + footprint.width - 1);
    const firstY = Math.max(minY, footprint.minY);
    const lastY = Math.min(minY + size - 1, footprint.minY + footprint.height - 1);
    for (let y = firstY; y <= lastY; y++) {
      for (let x = firstX; x <= lastX; x++) {
        levels[(y - minY) * size + (x - minX)] = plannedLevelAt(crossing, x, y);
      }
    }
  }
}
