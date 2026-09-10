import { TRANSITION_SETS, type TransitionSlots } from './TransitionCatalog';
import type { TileSprite } from './TileRegistry';

export interface NeighborMaterials {
  n: string;
  e: string;
  s: string;
  w: string;
  nw: string;
  ne: string;
  se: string;
  sw: string;
}

type Slot = keyof TransitionSlots;

/**
 * Classic blob-autotile classification: each flag means "this neighbor is the *background*
 * material of the candidate transition set". Returns which of the 14 sprite slots applies, or
 * `null` for geometry the 14-slot scheme can't represent (e.g. a 3-material corner) — callers
 * should fall back to a softer dither in that case rather than guess.
 */
export function classifySlot(
  n: boolean,
  e: boolean,
  s: boolean,
  w: boolean,
  nw: boolean,
  ne: boolean,
  se: boolean,
  sw: boolean,
): Slot | null {
  const orthoCount = Number(n) + Number(e) + Number(s) + Number(w);

  if (orthoCount === 1) {
    if (n) return 'n';
    if (e) return 'e';
    if (s) return 's';
    return 'w';
  }

  if (orthoCount === 2) {
    if (n && w) return 'nw';
    if (n && e) return 'ne';
    if (e && s) return 'se';
    if (s && w) return 'sw';
    return null; // opposite pair (n+s or e+w) — ambiguous "through-strip", not represented
  }

  if (orthoCount === 0) {
    const diagonalCount = Number(nw) + Number(ne) + Number(se) + Number(sw);

    if (diagonalCount === 1) {
      if (nw) return 'cNw';
      if (ne) return 'cNe';
      if (se) return 'cSe';
      return 'cSw';
    }

    if (diagonalCount === 2) {
      if (nw && se) return 'd0';
      if (ne && sw) return 'd1';
    }

    return null;
  }

  return null; // 3+ orthogonal neighbors differ — rare, ambiguous, fall back to dither
}

/**
 * Picks the edge/corner sprite for `material` given its 8 neighbors' materials, or `null` if no
 * authored transition set applies (either no matching pair, or geometry `classifySlot` can't place).
 */
export function pickAutotileSprite(material: string, neighbors: NeighborMaterials): TileSprite | null {
  for (const set of TRANSITION_SETS) {
    if (set.featured !== material) continue;

    const background = set.background;
    const n = neighbors.n === background;
    const e = neighbors.e === background;
    const s = neighbors.s === background;
    const w = neighbors.w === background;
    const nw = neighbors.nw === background;
    const ne = neighbors.ne === background;
    const se = neighbors.se === background;
    const sw = neighbors.sw === background;

    if (!(n || e || s || w || nw || ne || se || sw)) continue; // this pair isn't touching here

    const slot = classifySlot(n, e, s, w, nw, ne, se, sw);
    if (slot === null) continue;

    const sprite = set.sprites[slot];
    if (sprite) return sprite;
  }

  return null;
}
