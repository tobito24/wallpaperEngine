# Decoration

The plan, the properties of an item, the placement passes and the reasons are in [idea.md](../idea.md) ("Decoration"). This doc
describes what exists in the code. Built so far: step 1 (table, loader, dev art). Not built: terrain block, placement, rendering.

- **`src/deco/decoTable.ts`** — `DecoItem` and `DECO_ITEMS`, the one table of all items: `name` (the file stem), `variants` (files
  `<name>-<i>.png`, one file `<name>.png` when 1), `frames`, `pass` (`large`, `medium`, `small`, `flat`), `layer`, `footprint` and `anchorColumn` (where the
  footprint starts in the sprite, counted from the left on the bottom rows), `surface` (`land` or `water`), `biomes` (weight per biome: eligibility and pool weight),
  optional `grounds`, `clearance`, `repeat`, `overlapsDeco`, `overlapsCliff`. `DECO_CELL_SIZE_BY_PASS` (6, 4, 2, 1) and `DECO_PASS_ORDER` (big to small). The table is
  validated when the module loads (`validateDecoTable`): names are unique, footprint plus clearance fit the cell of the pass, weights are positive, and the biomes match the surface
  (water biomes only for `water` items). Adding an item is one row here plus the PNG; the engine does not change. The sixteen dev items are the decoration of `InfinityWalker`.
- **`src/deco/decoSheets.ts`** — loads `assets/deco/*.png` (`import.meta.glob`, like the grounds): `decoFileName`, `decoImage` (undefined until the image is loaded or when
  the PNG is missing, so a missing file draws nothing), `decoSpriteSize` (the sprite size in tiles is the PNG size divided by 32 and by the frames), `decoFilesMissing`.
- **`scripts/cut_infinitywalker_deco.py`** — cuts the items of `InfinityWalker/img/tileset.png` (cells from `InfinityWalker/js/tiles.js`: flowers, tufts, ferns, stump, rocks, logs,
  boulders, shells, lilies, the oak, the palm) into `assets/deco/`, 31 files. Run from `WorldNoise/` with `python scripts/cut_infinitywalker_deco.py` (needs Pillow). The art is
  not cleared for publishing, so `assets/` stays git-ignored; a clone runs the script once.
- **Terrain block (step 2, done).** The deco reads the terrain through `world/terrainBlock.ts` (see [world-and-render.md](world-and-render.md)), the same function `Chunk` uses, with a margin around the chunk. Measured on 400 chunks (cold = first time, with the road and town caches empty; warm = caches full): a block of the chunk (16 tiles) 14.1 ms cold, 2.2 ms warm; with a margin of 8 tiles (32) 17.0 / 4.6 ms; with a margin of 12 tiles (40) 18.1 / 6.0 ms. So the margin costs about 5 ms per chunk once, when it is created, not per frame. If that is too much the deco is computed per block of 2 x 2 chunks and cached.
- Sprites are 32 px per tile. The oak and the palm are 4 x 3 tiles with a footprint of 2 x 1 at column 1 (the trunk stands on the two middle tiles of the bottom row).
