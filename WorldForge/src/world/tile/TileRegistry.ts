export type LayerKind = 'base' | 'overlay' | 'deco';

export interface TileSprite {
  col: number;
  row: number;
  weight: number;
}

export interface TileDef {
  id: string;
  layer: LayerKind;
  sprites: TileSprite[];
}

const registry = new Map<string, TileDef>();

function define(id: string, layer: LayerKind, sprites: TileSprite[]): TileDef {
  const def: TileDef = { id, layer, sprites };
  registry.set(id, def);
  return def;
}

export function getTile(id: string): TileDef {
  const def = registry.get(id);
  if (!def) throw new Error(`Unknown tile id: ${id}`);
  return def;
}

// Sprite coordinates (col, row in the 32px/cell, 8-column tileset grid) are reused from
// InfinityWalker/img/tileset.png — see InfinityWalker/js/tiles.js for the source tile catalogue.
export const TILE = {
  grass: define('grass', 'base', [{ col: 0, row: 5, weight: 1 }]),
  grassLight: define('grassLight', 'base', [
    { col: 0, row: 11, weight: 2 },
    { col: 1, row: 11, weight: 1 },
  ]),
  // Not assigned to any biome yet — has an authored transition to grassLight (see TransitionCatalog.ts),
  // a ready-made further-arid tier if the biome table ever wants a 4th elevation/moisture step.
  grassDry: define('grassDry', 'base', [{ col: 1, row: 13, weight: 1 }]),
  grassDark: define('grassDark', 'base', [
    { col: 2, row: 17, weight: 2 },
    { col: 0, row: 17, weight: 1 },
  ]),
  dirt: define('dirt', 'base', [{ col: 1, row: 7, weight: 1 }]),
  mud: define('mud', 'base', [
    { col: 1, row: 19, weight: 4 },
    { col: 1, row: 17, weight: 1 },
  ]),
  beachSand: define('beachSand', 'base', [{ col: 5, row: 29, weight: 1 }]),
  // Reserved for Phase 2 (rivers/lakes) — has an authored transition to beachSand (see TransitionCatalog.ts).
  beachWater: define('beachWater', 'base', [{ col: 4, row: 31, weight: 1 }]),
  stoneLight: define('stoneLight', 'base', [{ col: 4, row: 9, weight: 1 }]),
  stoneMid: define('stoneMid', 'base', [{ col: 4, row: 15, weight: 1 }]),
  // No dedicated snow/peak art exists in the tileset yet — reused as a placeholder until new art lands.
  stoneDark: define('stoneDark', 'base', [{ col: 4, row: 21, weight: 1 }]),

  rockSmall: define('rockSmall', 'deco', [
    { col: 1, row: 3, weight: 1 },
    { col: 2, row: 3, weight: 1 },
  ]),
  bigStone: define('bigStone', 'deco', [
    { col: 3, row: 3, weight: 1 },
    { col: 6, row: 3, weight: 1 },
  ]),
  tallGrass: define('tallGrass', 'deco', [
    { col: 4, row: 6, weight: 1 },
    { col: 4, row: 12, weight: 1 },
    { col: 4, row: 18, weight: 1 },
  ]),
  fern: define('fern', 'deco', [{ col: 7, row: 1, weight: 1 }]),
  grassTuft: define('grassTuft', 'deco', [
    { col: 3, row: 0, weight: 1 },
    { col: 4, row: 0, weight: 1 },
  ]),
} as const;
