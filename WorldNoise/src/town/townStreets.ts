import { CHUNK_SIZE, TOWN_CACHE_MAX_ENTRIES } from '../config/constants';
import { remember } from '../core/boundedCache';
import { edgeExists } from '../skeleton/cellGrid';
import type { Point } from '../skeleton/cellGrid';
import { GATE_SIDES, gateDirection, gateSideGeometry, townGate } from './townGates';
import type { GateSide } from './townGates';
import type { Town } from './townPlacement';

export type Street = readonly Point[];

interface Gate {
  readonly side: GateSide;
  readonly point: Point;
}

const streetCache = new Map<string, readonly Street[]>();

function gatesOf(town: Town): Gate[] {
  return GATE_SIDES.filter((side) => {
    const [stepX, stepY] = gateDirection(side);
    return edgeExists(town.cx, town.cy, town.cx + stepX, town.cy + stepY);
  }).map((side) => ({ side, point: townGate(town, side) }));
}

function isFootprintPoint(town: Town, point: Point): boolean {
  const chunkX = Math.floor(point.x / CHUNK_SIZE);
  const chunkY = Math.floor(point.y / CHUNK_SIZE);
  return town.chunks.some(([x, y]) => x === chunkX && y === chunkY);
}

function middleOf(low: number, high: number): number {
  return Math.floor((low + high) / 2) + 0.5;
}

function joinOpposite(from: Point, to: Point, travelsAlongX: boolean): Street {
  if (travelsAlongX) {
    if (from.y === to.y) return [from, to];
    const jogX = middleOf(from.x, to.x);
    return [from, { x: jogX, y: from.y }, { x: jogX, y: to.y }, to];
  }
  if (from.x === to.x) return [from, to];
  const jogY = middleOf(from.y, to.y);
  return [from, { x: from.x, y: jogY }, { x: to.x, y: jogY }, to];
}

function laneOfThroughStreetAt(through: Street, across: number, travelsAlongX: boolean): number {
  const first = through[0];
  const last = through[through.length - 1];
  if (travelsAlongX) {
    return across < middleOf(first.x, last.x) ? first.y : last.y;
  }
  return across < middleOf(first.y, last.y) ? first.x : last.x;
}

function gateOn(gates: readonly Gate[], side: GateSide): Gate | undefined {
  return gates.find((gate) => gate.side === side);
}

function throughStreets(gates: readonly Gate[]): { streets: Street[]; travelsAlongX: boolean[] } {
  const streets: Street[] = [];
  const travelsAlongX: boolean[] = [];
  const west = gateOn(gates, 'west');
  const east = gateOn(gates, 'east');
  const north = gateOn(gates, 'north');
  const south = gateOn(gates, 'south');
  if (west && east) {
    streets.push(joinOpposite(west.point, east.point, true));
    travelsAlongX.push(true);
  }
  if (north && south) {
    streets.push(joinOpposite(north.point, south.point, false));
    travelsAlongX.push(false);
  }
  return { streets, travelsAlongX };
}

function branchStreet(gate: Gate, through: Street, throughAlongX: boolean): Street {
  const lane = laneOfThroughStreetAt(through, throughAlongX ? gate.point.x : gate.point.y, throughAlongX);
  return throughAlongX
    ? [gate.point, { x: gate.point.x, y: lane }]
    : [gate.point, { x: lane, y: gate.point.y }];
}

function cornerStreet(gates: readonly Gate[]): Street {
  const northOrSouth = gates.find((gate) => gateSideGeometry(gate.side).alongX) as Gate;
  const eastOrWest = gates.find((gate) => !gateSideGeometry(gate.side).alongX) as Gate;
  const corner = { x: northOrSouth.point.x, y: eastOrWest.point.y };
  return [eastOrWest.point, corner, northOrSouth.point];
}

function deadEndStreet(town: Town, gate: Gate): Street {
  const [outwardX, outwardY] = gateDirection(gate.side);
  const depth =
    Math.abs(outwardX) * Math.abs(town.center.x - gate.point.x) +
    Math.abs(outwardY) * Math.abs(town.center.y - gate.point.y);
  let end = gate.point;
  for (let tiles = 1; tiles <= depth; tiles++) {
    const candidate = { x: gate.point.x - outwardX * tiles, y: gate.point.y - outwardY * tiles };
    if (!isFootprintPoint(town, candidate)) break;
    end = candidate;
  }
  return [gate.point, end];
}

function planStreets(town: Town): Street[] {
  const gates = gatesOf(town);
  if (gates.length === 0) return [];
  if (gates.length === 1) return [deadEndStreet(town, gates[0])];

  const { streets, travelsAlongX } = throughStreets(gates);
  if (streets.length === 2) return streets;
  if (streets.length === 1) {
    const branches = gates.filter((gate) => !isOnStreet(streets[0], gate));
    return [...streets, ...branches.map((gate) => branchStreet(gate, streets[0], travelsAlongX[0]))];
  }
  return [cornerStreet(gates)];
}

function isOnStreet(street: Street, gate: Gate): boolean {
  return street.some((point) => point.x === gate.point.x && point.y === gate.point.y);
}

export function townStreets(town: Town): readonly Street[] {
  return remember(streetCache, TOWN_CACHE_MAX_ENTRIES, `${town.cx},${town.cy}`, () => planStreets(town));
}
