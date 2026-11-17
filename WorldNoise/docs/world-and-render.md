# World, chunks, rendering, properties

Part of [WorldNoise](../CLAUDE.md). The glue between the generation layers ([terrain](terrain.md), [tileset](tileset.md),
[roads](roads.md), [towns](towns.md)) and the screen. Inherited constants (tile size range/zoom, pan speed, chunk size/unload
delay, tick interval range) live in `config/constants.ts` unchanged from `TileGridBase`.

- **`world/Tile.ts`** — one grid cell, owns its own `draw()`. Holds an `elevation: number` (0-1, kept as its own
  value), a `heightLevel`, its `cliffType`, its `biome`, its final `ground` (the biome, or road or bridge),
  its `autotileIndex`, its `underlays` (the lower ground that shows through the transparent rim, per quarter, or none) and its
  `cliffUnderlays` (the lower neighbour under the corners of a cliff piece) and its `stairs` (the `StairsTile` of a stair tile, drawn over the cliff piece) and its `cliffTopAutotileIndex` (set on a tile of the inner
  ring of a cliff; all set at construction), draws the underlay quarters, then the ground (autotile, else the flat color of the
  ground), then either the cliff underlay quarters and the cliff piece or the inner ring autotile, and the level shade — this is exactly the extension point
  `TileGridBase/CLAUDE.md` describes this file as, and mirrors how `ColorWar`'s `Tile.ts` draws from its own
  simulation color.
- **`world/Chunk.ts`** — `CHUNK_SIZE × CHUNK_SIZE` block of tiles, built eagerly on construction. Imports
  the noise channels directly (not constructor-injected) and evaluates elevation, height level, biome and road on a
  grid padded by one tile on every side, so the cliff pieces (which read the eight neighbours) and the autotile neighbour mask (computed from the final
  grounds, road and bridge included) of the border tiles come from the same pure functions of the coordinates, never
  from a neighbouring chunk (no seams). Noise-based generation is cheap
  enough that eager per-chunk generation should still be fine here (unlike WFC, which needed more careful
  chunk-boundary handling in `InfinityWalker`).
- **`world/terrainBlock.ts`** — `terrainBlockAt(minX, minY, size)`: everything the terrain decides for a square of tiles, a pure function of the coordinates: elevations (with reclaimed land), final levels (towns, crossings flattened, water limit, cleanup), `cliffLayout` (pieces and inner rings), biomes, `townInfos` and `insideTowns`, the road mask, the stairs, and the final `grounds` (`groundOf`, town paths included). Inside it works on a block `LEVEL_BLOCK_MARGIN` (9 tiles: cliff reach 3, cleanup 2, water limit 4) larger on every side, so the whole square is exact. `Chunk` takes a block of the chunk plus one tile (`PADDED_SIZE` 18) and only builds the tiles from it; the deco will take a larger one. The refactor changed no tile: a hash over every tile field of 400 chunks is the same before and after.: visible bounds → sync chunks → draw each tile. With the debug mode (`r`) it also
  draws the chunk borders with the chunk coordinates (`x,y`, top left of each chunk) and `render/crossingDebug.ts`: a colored square on every place where a road changes its level, by what
  became of it (`RoadEdge.candidateOutcomes`), and a legend in the HUD: green stairs, red a level change without stairs (the planner
  found no stairs there). The square sits on the boundary (stairs: the centre of the crossing, east/west ones at the upper lane).
  Unchanged from `TileGridBase`.
- **`we/propertyListener.ts`** / **`public/project.json`** — two WE properties so far, `slider_tilesize` and
  `slider_tickrate`. Edited by hand in both places, not derived from each other (see [wallpaper-engine-integration](../../docs/wallpaper-engine-integration.md)). Unchanged
  from `TileGridBase` — no noise-related WE property yet (e.g. a seed picker).
