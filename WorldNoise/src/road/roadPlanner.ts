import {
  CELL_BUFFER_CHUNKS,
  CHUNK_SIZE,
  ROAD_CLIFF_NEAR_COST,
  ROAD_CLIFF_NEAR_REACH_TILES,
  ROAD_CROSSING_COST,
  ROAD_EDGE_CACHE_MAX_ENTRIES,
  ROAD_EDGE_HUGGING_COST,
  ROAD_FLATTENED_TILE_COST,
  ROAD_FOREIGN_PLATEAU_COST,
  ROAD_LOCK_AFTER_CROSSING_TILES,
  ROAD_MIN_CROSSING_GAP_TILES,
  ROAD_MIN_TURN_RUN_TILES,
  ROAD_PLANNING_MARGIN_TILES,
  ROAD_RUN_BEFORE_CROSSING_TILES,
  ROAD_STEP_COST,
  ROAD_TURN_COST,
  ROAD_UNPLANNED_CROSSING_COST,
  ROAD_WATER_STEP_COST,
} from '../config/constants';
import { remember } from '../core/boundedCache';
import { MinHeap } from '../core/binaryHeap';
import { elevationNoise } from '../elevation/elevationNoise';
import { WATER_LEVEL, heightLevelAt } from '../elevation/heightLevel';
import type { Point } from '../skeleton/cellGrid';
import { levelWithTown, townInfoAt } from '../town/townTerrain';
import { cliffProximity } from './cliffProximity';
import { flattenCostOf } from './roadCrossing';
import type { RoadCrossing, Side, TravelAxis } from './roadCrossing';
import { smoothPolyline } from './roadSmoothing';
import type { GroundProbe } from './roadSmoothing';

type Step = readonly [number, number];

export interface PlanEnd {
  readonly point: Point;
  readonly outward: Step | null;
}

export interface PlannedRoad {
  readonly polyline: readonly Point[];
  readonly crossings: readonly RoadCrossing[];
  readonly unplanned: readonly Point[];
}

if (ROAD_PLANNING_MARGIN_TILES > CELL_BUFFER_CHUNKS * CHUNK_SIZE) {
  throw new RangeError('The search box of a road must stay inside the two cells of its edge');
}

const DIRECTIONS: readonly Step[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
const RUN_STATES = ROAD_RUN_BEFORE_CROSSING_TILES + 1;
const LOCK_STATES = ROAD_LOCK_AFTER_CROSSING_TILES + 1;
const STATES_PER_CELL = 4 * RUN_STATES * LOCK_STATES;
const LATEST_LOCK_FOR_CROSSING = ROAD_LOCK_AFTER_CROSSING_TILES - ROAD_MIN_CROSSING_GAP_TILES + 1;
const UNREACHED = 0x7fffffff;
const NO_PREDECESSOR = -1;

interface Grid {
  readonly minX: number;
  readonly minY: number;
  readonly width: number;
  readonly height: number;
  readonly levels: Int8Array;
  readonly inside: Uint8Array;
  readonly nearCliff: Uint8Array;
  readonly relaxed: boolean;
}

interface State {
  readonly cell: number;
  readonly direction: number;
  readonly run: number;
  readonly lock: number;
}

interface PathCell {
  readonly x: number;
  readonly y: number;
  readonly lock: number;
}

interface CrossingChoice {
  readonly crossing: RoadCrossing;
  readonly flattenedTiles: number;
}

interface CellMove {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly fromLevel: number;
  readonly toLevel: number;
}

let costBuffer = new Int32Array(0);
let predecessorBuffer = new Int32Array(0);
const choiceCache = new Map<string, CrossingChoice | null>();

function encode(state: State): number {
  return ((state.cell * 4 + state.direction) * RUN_STATES + state.run) * LOCK_STATES + state.lock;
}

function decode(code: number): State {
  const lock = code % LOCK_STATES;
  let rest = (code - lock) / LOCK_STATES;
  const run = rest % RUN_STATES;
  rest = (rest - run) / RUN_STATES;
  const direction = rest % 4;
  return { cell: (rest - direction) / 4, direction, run, lock };
}

function buildGrid(start: Point, end: Point, relaxed: boolean): Grid {
  const minX = Math.floor(Math.min(start.x, end.x)) - ROAD_PLANNING_MARGIN_TILES;
  const minY = Math.floor(Math.min(start.y, end.y)) - ROAD_PLANNING_MARGIN_TILES;
  const width = Math.ceil(Math.abs(start.x - end.x)) + 2 * ROAD_PLANNING_MARGIN_TILES + 1;
  const height = Math.ceil(Math.abs(start.y - end.y)) + 2 * ROAD_PLANNING_MARGIN_TILES + 1;
  const levels = new Int8Array(width * height);
  const inside = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const info = townInfoAt(minX + x, minY + y);
      levels[y * width + x] = levelWithTown(
        heightLevelAt(minX + x, minY + y, elevationNoise(minX + x, minY + y)),
        info,
      );
      inside[y * width + x] = info?.inside ? 1 : 0;
    }
  }
  const nearCliff = cliffProximity(levels, width, height, ROAD_CLIFF_NEAR_REACH_TILES);
  return { minX, minY, width, height, levels, inside, nearCliff, relaxed };
}

function crossingChoice(
  axis: TravelAxis,
  boundary: number,
  lane: number,
  upperSide: Side,
  upperLevel: number,
  relaxed: boolean,
): CrossingChoice | null {
  const key = `${axis}:${boundary}:${lane}:${upperSide}:${upperLevel}:${relaxed}`;
  return remember(choiceCache, ROAD_EDGE_CACHE_MAX_ENTRIES, key, () => {
    const crossing: RoadCrossing = {
      id: `${axis}:${boundary}:${lane}`,
      travelAxis: axis,
      boundary,
      lane,
      upperSide,
      upperLevel,
      lowerLevel: upperLevel - 1,
    };
    const flattenedTiles = flattenCostOf(crossing, relaxed);
    return flattenedTiles === null ? null : { crossing, flattenedTiles };
  });
}

function oppositeOf(side: Side): Side {
  return side === 1 ? -1 : 1;
}

function choiceOfMove(move: CellMove, relaxed: boolean): CrossingChoice | null {
  if (Math.abs(move.fromLevel - move.toLevel) !== 1) return null;
  const upperIsAfter = move.toLevel > move.fromLevel;
  const upperLevel = Math.max(move.fromLevel, move.toLevel);
  if (move.fromX !== move.toX) {
    const forward: Side = move.toX > move.fromX ? 1 : -1;
    return crossingChoice(
      'x',
      forward === 1 ? move.fromX + 1 : move.fromX,
      upperIsAfter ? move.toY : move.fromY,
      upperIsAfter ? forward : oppositeOf(forward),
      upperLevel,
      relaxed,
    );
  }
  const forward: Side = move.toY > move.fromY ? 1 : -1;
  return crossingChoice(
    'y',
    forward === 1 ? move.fromY + 1 : move.fromY,
    move.fromX,
    upperIsAfter ? forward : oppositeOf(forward),
    upperLevel,
    relaxed,
  );
}

function isLandChange(fromLevel: number, toLevel: number): boolean {
  return fromLevel !== toLevel && fromLevel !== WATER_LEVEL && toLevel !== WATER_LEVEL;
}

function sidesDifferFrom(grid: Grid, cell: number, direction: number, level: number): boolean {
  const [dx, dy] = DIRECTIONS[direction];
  const x = cell % grid.width;
  const y = Math.floor(cell / grid.width);
  for (const sign of [1, -1]) {
    const sx = x - dy * sign;
    const sy = y + dx * sign;
    if (sx < 0 || sy < 0 || sx >= grid.width || sy >= grid.height) continue;
    if (grid.levels[sy * grid.width + sx] !== level) return true;
  }
  return false;
}

function moveOf(grid: Grid, fromCell: number, toCell: number): CellMove {
  return {
    fromX: (fromCell % grid.width) + grid.minX,
    fromY: Math.floor(fromCell / grid.width) + grid.minY,
    toX: (toCell % grid.width) + grid.minX,
    toY: Math.floor(toCell / grid.width) + grid.minY,
    fromLevel: grid.levels[fromCell],
    toLevel: grid.levels[toCell],
  };
}

function directionOf(step: Step): number {
  return DIRECTIONS.findIndex(([dx, dy]) => dx === step[0] && dy === step[1]);
}

function search(grid: Grid, start: PlanEnd, end: PlanEnd): number[] {
  const size = grid.width * grid.height * STATES_PER_CELL;
  if (costBuffer.length < size) {
    costBuffer = new Int32Array(size);
    predecessorBuffer = new Int32Array(size);
  }
  costBuffer.fill(UNREACHED, 0, size);
  predecessorBuffer.fill(NO_PREDECESSOR, 0, size);

  const cellOf = (point: Point): number =>
    (Math.floor(point.y) - grid.minY) * grid.width + (Math.floor(point.x) - grid.minX);
  const startCell = cellOf(start.point);
  const endCell = cellOf(end.point);
  const endX = endCell % grid.width;
  const endY = Math.floor(endCell / grid.width);
  const heuristic = (cell: number): number =>
    (Math.abs((cell % grid.width) - endX) + Math.abs(Math.floor(cell / grid.width) - endY)) * ROAD_STEP_COST;
  const arrivalDirection = end.outward === null ? -1 : directionOf([-end.outward[0], -end.outward[1]]);

  const heap = new MinHeap();
  const startDirections = start.outward === null ? [0, 1, 2, 3] : [directionOf(start.outward)];
  const startRun = start.outward === null ? 0 : ROAD_RUN_BEFORE_CROSSING_TILES;
  for (const direction of startDirections) {
    const code = encode({ cell: startCell, direction, run: startRun, lock: 0 });
    costBuffer[code] = 0;
    heap.push(heuristic(startCell), code);
  }

  const relax = (from: number, to: State, stepCost: number): void => {
    const code = encode(to);
    const cost = costBuffer[from] + stepCost;
    if (cost < costBuffer[code]) {
      costBuffer[code] = cost;
      predecessorBuffer[code] = from;
      heap.push(cost + heuristic(to.cell), code);
    }
  };

  while (heap.size > 0) {
    const code = heap.pop();
    const state = decode(code);
    if (
      state.cell === endCell &&
      (end.outward === null ||
        (state.direction === arrivalDirection && state.run === ROAD_RUN_BEFORE_CROSSING_TILES))
    ) {
      return pathOf(code);
    }
    const x = state.cell % grid.width;
    const y = Math.floor(state.cell / grid.width);
    const fromLevel = grid.levels[state.cell];
    const mayCross = state.run === ROAD_RUN_BEFORE_CROSSING_TILES && state.lock <= LATEST_LOCK_FOR_CROSSING;
    const straightRun = Math.min(ROAD_RUN_BEFORE_CROSSING_TILES, state.run + 1);
    const lock = Math.max(0, state.lock - 1);

    for (const direction of [state.direction, (state.direction + 1) % 4, (state.direction + 3) % 4]) {
      const turning = direction !== state.direction;
      if (turning && (state.lock > 0 || state.run < ROAD_MIN_TURN_RUN_TILES)) continue;
      const nx = x + DIRECTIONS[direction][0];
      const ny = y + DIRECTIONS[direction][1];
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      const next = ny * grid.width + nx;
      const toLevel = grid.levels[next];

      let stepCost = ROAD_STEP_COST + (turning ? ROAD_TURN_COST : 0);
      let nextLock = lock;
      if (grid.inside[next] === 1 && next !== endCell && next !== startCell) {
        stepCost += ROAD_FOREIGN_PLATEAU_COST;
      }
      if (toLevel === WATER_LEVEL) stepCost += ROAD_WATER_STEP_COST;

      if (isLandChange(fromLevel, toLevel)) {
        const choice =
          !turning && mayCross && direction % 2 === 1
            ? choiceOfMove(moveOf(grid, state.cell, next), grid.relaxed)
            : null;
        if (choice === null) {
          stepCost += ROAD_UNPLANNED_CROSSING_COST;
        } else {
          stepCost += ROAD_CROSSING_COST + ROAD_FLATTENED_TILE_COST * choice.flattenedTiles;
          nextLock = ROAD_LOCK_AFTER_CROSSING_TILES;
        }
      } else if (fromLevel === toLevel && toLevel !== WATER_LEVEL) {
        if (sidesDifferFrom(grid, next, direction, toLevel)) stepCost += ROAD_EDGE_HUGGING_COST;
        if (grid.nearCliff[next] === 1) stepCost += ROAD_CLIFF_NEAR_COST;
      }
      relax(code, { cell: next, direction, run: turning ? 1 : straightRun, lock: nextLock }, stepCost);
    }

    if (state.direction % 2 === 0 && mayCross) {
      for (const sideways of [1, -1]) {
        const nx = x + DIRECTIONS[state.direction][0];
        const ny = y + sideways;
        if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
        const next = ny * grid.width + nx;
        const toLevel = grid.levels[next];
        if (!isLandChange(fromLevel, toLevel) || toLevel < fromLevel !== (sideways === 1)) continue;
        const choice = choiceOfMove(moveOf(grid, state.cell, next), grid.relaxed);
        if (choice === null) continue;
        const foreignPlateauCost =
          grid.inside[next] === 1 && next !== endCell && next !== startCell ? ROAD_FOREIGN_PLATEAU_COST : 0;
        relax(
          code,
          { cell: next, direction: state.direction, run: straightRun, lock: ROAD_LOCK_AFTER_CROSSING_TILES },
          ROAD_STEP_COST +
            ROAD_CROSSING_COST +
            ROAD_FLATTENED_TILE_COST * choice.flattenedTiles +
            foreignPlateauCost,
        );
      }
    }
  }
  throw new RangeError('No road path found inside the search box');
}

function pathOf(goal: number): number[] {
  const codes: number[] = [];
  for (let code = goal; code !== NO_PREDECESSOR; code = predecessorBuffer[code]) codes.push(code);
  return codes.reverse();
}

function cellsOf(grid: Grid, codes: readonly number[]): PathCell[] {
  return codes.map((code) => {
    const state = decode(code);
    return {
      x: (state.cell % grid.width) + grid.minX,
      y: Math.floor(state.cell / grid.width) + grid.minY,
      lock: state.lock,
    };
  });
}

function levelOfCell(grid: Grid, cell: PathCell): number {
  return grid.levels[(cell.y - grid.minY) * grid.width + (cell.x - grid.minX)];
}

interface Extracted {
  readonly crossings: RoadCrossing[];
  readonly steps: Map<number, RoadCrossing>;
  readonly unplanned: Point[];
}

function extract(grid: Grid, cells: readonly PathCell[]): Extracted {
  const extracted: Extracted = { crossings: [], steps: new Map(), unplanned: [] };
  for (let index = 0; index + 1 < cells.length; index++) {
    const from = cells[index];
    const to = cells[index + 1];
    const fromLevel = levelOfCell(grid, from);
    const toLevel = levelOfCell(grid, to);
    if (!isLandChange(fromLevel, toLevel)) continue;
    const choice =
      to.lock === ROAD_LOCK_AFTER_CROSSING_TILES
        ? choiceOfMove(
            { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, fromLevel, toLevel },
            grid.relaxed,
          )
        : null;
    if (choice === null) {
      extracted.unplanned.push({ x: (from.x + to.x) / 2 + 0.5, y: (from.y + to.y) / 2 + 0.5 });
      continue;
    }
    extracted.crossings.push(choice.crossing);
    if (from.x !== to.x && from.y !== to.y) extracted.steps.set(index, choice.crossing);
  }
  return extracted;
}

function withoutRedundantPoints(points: readonly Point[]): Point[] {
  const distinct = points.filter(
    (point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y,
  );
  return distinct.filter((point, index) => {
    if (index === 0 || index === distinct.length - 1) return true;
    const before = distinct[index - 1];
    const after = distinct[index + 1];
    const straightOn =
      (point.x - before.x) * (after.y - point.y) === (point.y - before.y) * (after.x - point.x) &&
      (point.x - before.x) * (after.x - point.x) + (point.y - before.y) * (after.y - point.y) > 0;
    return !straightOn;
  });
}

function polylineOf(cells: readonly PathCell[], steps: ReadonlyMap<number, RoadCrossing>): Point[] {
  const points: Point[] = [];
  cells.forEach((cell, index) => {
    points.push({ x: cell.x + 0.5, y: cell.y + 0.5 });
    const crossing = steps.get(index);
    if (crossing) {
      points.push({ x: crossing.boundary, y: cell.y + 0.5 });
      points.push({ x: crossing.boundary, y: cells[index + 1].y + 0.5 });
    }
  });
  return withoutRedundantPoints(points);
}

function probeOf(grid: Grid): GroundProbe {
  const indexOf = (tileX: number, tileY: number): number =>
    tileX < grid.minX ||
    tileY < grid.minY ||
    tileX >= grid.minX + grid.width ||
    tileY >= grid.minY + grid.height
      ? -1
      : (tileY - grid.minY) * grid.width + (tileX - grid.minX);
  return {
    levelAt: (tileX, tileY) => {
      const index = indexOf(tileX, tileY);
      return index < 0 ? -1 : grid.levels[index];
    },
    isTown: (tileX, tileY) => {
      const index = indexOf(tileX, tileY);
      return index < 0 || grid.inside[index] === 1;
    },
  };
}

function planWith(start: PlanEnd, end: PlanEnd, relaxed: boolean): PlannedRoad {
  const grid = buildGrid(start.point, end.point, relaxed);
  const cells = cellsOf(grid, search(grid, start, end));
  const extracted = extract(grid, cells);
  return {
    polyline: smoothPolyline(polylineOf(cells, extracted.steps), extracted.crossings, probeOf(grid)),
    crossings: extracted.crossings,
    unplanned: extracted.unplanned,
  };
}

export function planRoad(start: PlanEnd, end: PlanEnd): PlannedRoad {
  const strict = planWith(start, end, false);
  if (strict.unplanned.length === 0) return strict;
  const relaxed = planWith(start, end, true);
  return relaxed.unplanned.length < strict.unplanned.length ? relaxed : strict;
}
