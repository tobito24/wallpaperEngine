import type { TileSprite } from './TileRegistry';

/**
 * Data-only. Sprite coordinates ported verbatim from InfinityWalker/js/tiles.js's `addTransitionRules`
 * calls (its `[n,e,s,w, nw,ne,se,sw, c_nw,c_ne,c_se,c_sw, d0,d1]` slot order). Only the `featured`
 * material gets dedicated edge sprites; `background` renders as its own flat tile right up to the
 * border — this asymmetry is how the source art actually works, not a simplification.
 */
export interface TransitionSlots {
  n: TileSprite;
  e: TileSprite;
  s: TileSprite;
  w: TileSprite;
  nw: TileSprite;
  ne: TileSprite;
  se: TileSprite;
  sw: TileSprite;
  cNw: TileSprite;
  cNe: TileSprite;
  cSe: TileSprite;
  cSw: TileSprite;
  d0?: TileSprite;
  d1?: TileSprite;
}

export interface TransitionSet {
  /** The material that gets edge sprites (source art's "trans1"). */
  featured: string;
  /** The material that stays flat right up to the border (source art's "trans0"). */
  background: string;
  sprites: TransitionSlots;
}

function sprite(col: number, row: number): TileSprite {
  return { col, row, weight: 1 };
}

export const TRANSITION_SETS: TransitionSet[] = [
  {
    featured: 'dirt',
    background: 'grass',
    sprites: {
      n: sprite(1, 6),
      e: sprite(2, 7),
      s: sprite(1, 8),
      w: sprite(0, 7),
      nw: sprite(0, 6),
      ne: sprite(2, 6),
      se: sprite(2, 8),
      sw: sprite(0, 8),
      cNw: sprite(0, 9),
      cNe: sprite(1, 9),
      cSe: sprite(1, 10),
      cSw: sprite(0, 10),
      d0: sprite(2, 9),
      d1: sprite(2, 10),
    },
  },
  {
    featured: 'grassDry',
    background: 'grassLight',
    sprites: {
      n: sprite(1, 12),
      e: sprite(2, 13),
      s: sprite(1, 14),
      w: sprite(0, 13),
      nw: sprite(0, 12),
      ne: sprite(2, 12),
      se: sprite(2, 14),
      sw: sprite(0, 14),
      cNw: sprite(0, 15),
      cNe: sprite(1, 15),
      cSe: sprite(1, 16),
      cSw: sprite(0, 16),
      d0: sprite(2, 15),
      d1: sprite(2, 16),
    },
  },
  {
    featured: 'mud',
    background: 'grassDark',
    sprites: {
      n: sprite(1, 18),
      e: sprite(2, 19),
      s: sprite(1, 20),
      w: sprite(0, 19),
      nw: sprite(0, 18),
      ne: sprite(2, 18),
      se: sprite(2, 20),
      sw: sprite(0, 20),
      cNw: sprite(0, 21),
      cNe: sprite(1, 21),
      cSe: sprite(1, 22),
      cSw: sprite(0, 22),
      d0: sprite(2, 21),
      d1: sprite(2, 22),
    },
  },
  {
    featured: 'grass',
    background: 'grassDark',
    sprites: {
      n: sprite(1, 30),
      e: sprite(2, 31),
      s: sprite(1, 32),
      w: sprite(0, 31),
      nw: sprite(0, 30),
      ne: sprite(2, 30),
      se: sprite(2, 32),
      sw: sprite(0, 32),
      cNw: sprite(0, 33),
      cNe: sprite(1, 33),
      cSe: sprite(1, 34),
      cSw: sprite(0, 34),
      d0: sprite(2, 33),
      d1: sprite(2, 34),
    },
  },
  {
    featured: 'beachWater',
    background: 'beachSand',
    sprites: {
      n: sprite(4, 30),
      e: sprite(5, 31),
      s: sprite(4, 32),
      w: sprite(3, 31),
      nw: sprite(3, 30),
      ne: sprite(5, 30),
      se: sprite(5, 32),
      sw: sprite(3, 32),
      cNw: sprite(3, 33),
      cNe: sprite(4, 33),
      cSe: sprite(4, 34),
      cSw: sprite(3, 34),
      d0: sprite(5, 33),
      d1: sprite(5, 34),
    },
  },
  {
    featured: 'beachSand',
    background: 'grass',
    sprites: {
      n: sprite(1, 42),
      e: sprite(2, 43),
      s: sprite(1, 44),
      w: sprite(0, 43),
      nw: sprite(0, 42),
      ne: sprite(2, 42),
      se: sprite(2, 44),
      sw: sprite(0, 44),
      cNw: sprite(0, 45),
      cNe: sprite(1, 45),
      cSe: sprite(1, 46),
      cSw: sprite(0, 46),
      d0: sprite(2, 45),
      d1: sprite(2, 46),
    },
  },
  {
    featured: 'dirt',
    background: 'stoneLight',
    sprites: {
      n: sprite(4, 42),
      e: sprite(5, 43),
      s: sprite(4, 44),
      w: sprite(3, 43),
      nw: sprite(3, 42),
      ne: sprite(5, 42),
      se: sprite(5, 44),
      sw: sprite(3, 44),
      cNw: sprite(3, 45),
      cNe: sprite(4, 45),
      cSe: sprite(4, 46),
      cSw: sprite(3, 46),
      d0: sprite(5, 45),
      d1: sprite(5, 46),
    },
  },
  {
    featured: 'stoneLight',
    background: 'stoneMid',
    sprites: {
      n: sprite(1, 47),
      e: sprite(2, 48),
      s: sprite(1, 49),
      w: sprite(0, 48),
      nw: sprite(0, 47),
      ne: sprite(2, 47),
      se: sprite(2, 49),
      sw: sprite(0, 49),
      cNw: sprite(0, 50),
      cNe: sprite(1, 50),
      cSe: sprite(1, 51),
      cSw: sprite(0, 51),
      d0: sprite(2, 50),
      d1: sprite(2, 51),
    },
  },
  {
    featured: 'grass',
    background: 'grassLight',
    sprites: {
      n: sprite(4, 47),
      e: sprite(5, 48),
      s: sprite(4, 49),
      w: sprite(3, 48),
      nw: sprite(3, 47),
      ne: sprite(5, 47),
      se: sprite(5, 49),
      sw: sprite(3, 49),
      cNw: sprite(3, 50),
      cNe: sprite(4, 50),
      cSe: sprite(4, 51),
      cSw: sprite(3, 51),
      d0: sprite(5, 50),
      d1: sprite(5, 51),
    },
  },
];
