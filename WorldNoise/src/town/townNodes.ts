import type { Point } from '../skeleton/cellGrid';
import { townOfCell } from './townPlacement';
import { waypointPosition } from './waypointNodes';

export function nodePosition(cx: number, cy: number): Point {
  return townOfCell(cx, cy)?.center ?? waypointPosition(cx, cy);
}
