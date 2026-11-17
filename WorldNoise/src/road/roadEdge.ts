import { ROAD_EDGE_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { cellIndexOf, edgeExists, edgeKey, isEdgeOrdered } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { gateDirection, gateSideOf, townGate } from '../town/townGates';
import { nodePosition } from '../town/townNodes';
import { townOfCell } from '../town/townPlacement';
import { townStreets } from '../town/townStreets';
import type { CrossingOutcome, RoadCrossing } from './roadCrossing';
import { planRoad } from './roadPlanner';
import type { PlanEnd } from './roadPlanner';

export interface CandidateOutcome {
  readonly x: number;
  readonly y: number;
  readonly outcome: CrossingOutcome;
}

export interface RoadEdge {
  readonly polyline: readonly Point[];
  readonly crossings: readonly RoadCrossing[];
  readonly candidateOutcomes: readonly CandidateOutcome[];
}

const EDGE_DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];
const CELL_PADDING = 2;

const edgeCache = new Map<string, RoadEdge>();

function edgeEnd(cx: number, cy: number, towardCx: number, towardCy: number): PlanEnd {
  const town = townOfCell(cx, cy);
  if (!town) return { point: nodePosition(cx, cy), outward: null };
  const side = gateSideOf(towardCx - cx, towardCy - cy);
  const gate = townGate(town, side);
  const outward = gateDirection(side);
  return { point: gate, outward };
}

function crossingPosition(crossing: RoadCrossing): Point {
  return crossing.travelAxis === 'x'
    ? { x: crossing.boundary, y: crossing.lane }
    : { x: crossing.lane, y: crossing.boundary };
}

function buildEdge(ax: number, ay: number, bx: number, by: number): RoadEdge {
  const ordered = isEdgeOrdered(ax, ay, bx, by);
  const start = ordered ? edgeEnd(ax, ay, bx, by) : edgeEnd(bx, by, ax, ay);
  const end = ordered ? edgeEnd(bx, by, ax, ay) : edgeEnd(ax, ay, bx, by);
  const planned = planRoad(start, end);
  return {
    polyline: planned.polyline,
    crossings: planned.crossings,
    candidateOutcomes: [
      ...planned.crossings.map((crossing) => ({ ...crossingPosition(crossing), outcome: 'stairs' as const })),
      ...planned.unplanned.map((point) => ({ ...point, outcome: 'unplanned' as const })),
    ],
  };
}

function streetEdge(street: readonly Point[]): RoadEdge {
  return { polyline: street, crossings: [], candidateOutcomes: [] };
}

export function roadEdge(ax: number, ay: number, bx: number, by: number): RoadEdge {
  return remember(edgeCache, ROAD_EDGE_CACHE_MAX_ENTRIES, edgeKey(ax, ay, bx, by), () =>
    buildEdge(ax, ay, bx, by),
  );
}

export function roadEdgesIn(minX: number, minY: number, width: number, height: number): RoadEdge[] {
  const edges: RoadEdge[] = [];
  const firstCellX = cellIndexOf(minX) - CELL_PADDING;
  const lastCellX = cellIndexOf(minX + width - 1) + CELL_PADDING;
  const firstCellY = cellIndexOf(minY) - CELL_PADDING;
  const lastCellY = cellIndexOf(minY + height - 1) + CELL_PADDING;
  for (let cy = firstCellY; cy <= lastCellY; cy++) {
    for (let cx = firstCellX; cx <= lastCellX; cx++) {
      for (const [dx, dy] of EDGE_DIRECTIONS) {
        if (edgeExists(cx, cy, cx + dx, cy + dy)) edges.push(roadEdge(cx, cy, cx + dx, cy + dy));
      }
      const town = townOfCell(cx, cy);
      if (town) edges.push(...townStreets(town).map(streetEdge));
    }
  }
  return edges;
}
