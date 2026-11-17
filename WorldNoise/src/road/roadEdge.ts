import { ROAD_EDGE_CACHE_MAX_ENTRIES, ROAD_RUN_BEFORE_CROSSING_TILES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { cellIndexOf, edgeExists, edgeKey, isEdgeOrdered } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { gateDirection, gateSideOf, townGate } from '../town/townGates';
import { nodePosition } from '../town/townNodes';
import { townOfCell } from '../town/townPlacement';
import { townInfoAt } from '../town/townTerrain';
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

interface EdgeEnd {
  readonly plan: PlanEnd;
  readonly insidePoints: readonly Point[];
}

const EDGE_DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
];
const CELL_PADDING = 2;

const edgeCache = new Map<string, RoadEdge>();

function straightApproach(gate: Point, step: readonly [number, number]): Point {
  let approach = gate;
  for (let tiles = 1; tiles <= ROAD_RUN_BEFORE_CROSSING_TILES; tiles++) {
    const candidate = { x: gate.x - step[0] * tiles, y: gate.y - step[1] * tiles };
    if (!townInfoAt(Math.floor(candidate.x), Math.floor(candidate.y))?.inside) break;
    approach = candidate;
  }
  return approach;
}

function edgeEnd(cx: number, cy: number, towardCx: number, towardCy: number): EdgeEnd {
  const town = townOfCell(cx, cy);
  if (!town) return { plan: { point: nodePosition(cx, cy), outward: null }, insidePoints: [] };
  const side = gateSideOf(towardCx - cx, towardCy - cy);
  const gate = townGate(town, side);
  const outward = gateDirection(side);
  return {
    plan: { point: gate, outward },
    insidePoints: [town.center, straightApproach(gate, outward)],
  };
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
  const planned = planRoad(start.plan, end.plan);
  return {
    polyline: [...start.insidePoints, ...planned.polyline, ...[...end.insidePoints].reverse()],
    crossings: planned.crossings,
    candidateOutcomes: [
      ...planned.crossings.map((crossing) => ({ ...crossingPosition(crossing), outcome: 'stairs' as const })),
      ...planned.unplanned.map((point) => ({ ...point, outcome: 'unplanned' as const })),
    ],
  };
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
    }
  }
  return edges;
}
