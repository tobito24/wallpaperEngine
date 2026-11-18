import {
  SEED,
  TOWN_MARGIN_TILES,
  TOWN_OUTLINE_NOISE_FREQUENCY,
  TOWN_OUTLINE_NOISE_OCTAVES,
  TOWN_GATE_STRAIGHT_HALF_WIDTH_TILES,
  TOWN_OUTLINE_WOBBLE_TILES,
  TOWN_RING_TERRACE_STEP_TILES,
  TOWN_CELL_BUFFER_TILES,
  TOWN_RING_WIDTH_TILES,
} from '../config/constants';
import { createFractalNoise2D } from '../core/noise';
import { WATER_LEVEL } from '../elevation/heightLevel';
import { cellIndexOf } from '../skeleton/cellGrid';
import { GATE_SIDES, gateSideGeometry, townGate } from './townGates';
import { distanceToLandings, landingsOf, levelSourcesAt } from './townPads';
import { townOfCell } from './townPlacement';
import type { Town } from './townPlacement';
import { distanceToCore } from './townCore';

export type TownZone = 'core' | 'margin' | 'ring';

export interface TownTileInfo {
  readonly town: Town;
  readonly zone: TownZone;
  readonly inside: boolean;
  readonly fixedLevel?: number;
  readonly ringLow?: number;
  readonly ringHigh?: number;
}

const outlineNoise = createFractalNoise2D(
  `${SEED}:townOutline`,
  TOWN_OUTLINE_NOISE_OCTAVES,
  TOWN_OUTLINE_NOISE_FREQUENCY,
  0.5,
  2,
);

const MAX_OUTLINE_WOBBLE_TILES = TOWN_OUTLINE_WOBBLE_TILES + 1;

function outlineWobbleAt(x: number, y: number): number {
  const share = Math.min(1, Math.max(0, outlineNoise(x, y)));
  return Math.floor(share * (TOWN_OUTLINE_WOBBLE_TILES + 1));
}

function gateTaperedWobble(tileX: number, tileY: number, town: Town, wobble: number): number {
  let tapered = wobble;
  for (const side of GATE_SIDES) {
    const gate = townGate(town, side);
    const { alongX } = gateSideGeometry(side);
    const alongGate = Math.abs((alongX ? tileX : tileY) + 0.5 - (alongX ? gate.x : gate.y));
    const depthFromGate = Math.abs((alongX ? tileY : tileX) + 0.5 - (alongX ? gate.y : gate.x));
    if (depthFromGate > TOWN_OUTLINE_WOBBLE_TILES) continue;
    tapered = Math.min(tapered, Math.max(0, Math.floor(alongGate - TOWN_GATE_STRAIGHT_HALF_WIDTH_TILES)));
  }
  return tapered;
}

function ringBandAt(town: Town, x: number, y: number, distanceToFootprint: number): TownTileInfo {
  const sources = [
    { distance: distanceToFootprint, level: town.plateauLevel },
    ...levelSourcesAt(town, x, y),
  ];
  let ringLow = -Infinity;
  let ringHigh = Infinity;
  for (const source of sources) {
    if (source.distance > TOWN_RING_WIDTH_TILES) continue;
    const allowed = 1 + Math.floor(source.distance / TOWN_RING_TERRACE_STEP_TILES);
    ringLow = Math.max(ringLow, source.level - allowed);
    ringHigh = Math.min(ringHigh, source.level + allowed);
  }
  return { town, zone: 'ring', inside: false, ringLow, ringHigh };
}

export function townInfoAt(tileX: number, tileY: number): TownTileInfo | null {
  const town = townOfCell(cellIndexOf(tileX), cellIndexOf(tileY));
  if (!town) return null;

  const x = tileX + 0.5;
  const y = tileY + 0.5;
  const coreDistance = distanceToCore(town, x, y);
  if (coreDistance === 0) return { town, zone: 'core', inside: true };
  if (coreDistance <= TOWN_MARGIN_TILES) {
    const depthFromEdge = TOWN_MARGIN_TILES - coreDistance;
    const inside =
      depthFromEdge > MAX_OUTLINE_WOBBLE_TILES ||
      depthFromEdge > gateTaperedWobble(tileX, tileY, town, outlineWobbleAt(x, y));
    return inside ? { town, zone: 'margin', inside } : ringBandAt(town, x, y, 0);
  }
  const landingDistance = distanceToLandings(town, x, y);
  if (landingDistance === 0) {
    const landing = landingsOf(town).find(
      (candidate) =>
        tileX >= candidate.minX &&
        tileX <= candidate.maxX &&
        tileY >= candidate.minY &&
        tileY <= candidate.maxY,
    );
    if (landing) return { town, zone: 'ring', inside: false, fixedLevel: landing.level };
  }
  const plateauDistance = coreDistance - TOWN_MARGIN_TILES;
  const ringDistance = Math.min(plateauDistance, landingDistance);
  if (ringDistance > TOWN_RING_WIDTH_TILES || coreDistance > TOWN_CELL_BUFFER_TILES) return null;
  return ringBandAt(town, x, y, plateauDistance);
}

export function levelWithTown(baseLevel: number, info: TownTileInfo | null): number {
  if (!info) return baseLevel;
  if (info.fixedLevel !== undefined) return info.fixedLevel;
  if (info.inside) return info.town.plateauLevel;
  if (baseLevel === WATER_LEVEL) return baseLevel;

  return Math.min(info.ringHigh ?? baseLevel, Math.max(info.ringLow ?? baseLevel, baseLevel));
}
