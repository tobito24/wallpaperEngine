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
- **`render/OverviewRenderer.ts`** (new, 2026-11-18) — the zoom-out view. Below `OVERVIEW_BELOW_TILE_SIZE_PX` (8 px per tile) `WorldRenderer` skips the chunks (no `Chunk`, no autotiles, no decoration, no road planning; `World.unloadStale` frees the loaded chunks after a while) and draws one coloured sample per `step` tiles instead, `step` being the smallest power of two for which a sample is at least `OVERVIEW_SAMPLE_MIN_SCREEN_PX` (4) screen pixels, so about the same number of samples fills the screen at every zoom (about 130 000 at 1920 x 1080). A sample is the fallback colour of its ground (`biomeAt` of the unflattened elevation, moisture and temperature; town cores `city`, the plateau level of a town including its margin, water in the plateau becomes land) with the shade of its height level. The samples are cached in blocks of `OVERVIEW_BLOCK_SAMPLES` (32 x 32, one canvas pixel per sample, keyed by step and block, at most `OVERVIEW_CACHE_MAX_BLOCKS`) and drawn scaled; at most `OVERVIEW_BLOCK_BUDGET_MS` (10 ms) of new blocks are built per frame, nearest to the centre first, so the picture fills in while the camera rests. The roads are the straight lines of the cell graph between the nodes (`edgeExists`, `nodePosition`), not the planned roads, which would cost 29 ms per edge. It deliberately does not call `townInfoAt`: that plans the gates and landings of every town it touches (about 15 ms per town), which the overview does not need. Zoom is multiplicative now: `Camera.zoomBy` scales the step with `tileSize / ZOOM_REFERENCE_TILE_SIZE_PX` (32), `MIN_TILE_SIZE` is 0.5 px, and the slider of `slider_tilesize` maps 0 to 100 onto 0.5 to 128 px (default 75 is 32 px; below 8 px the value is not rounded). Measured (1920 x 1080, cold): at 0.5 px 144 blocks in about 1.2 s with frames of 14 ms, warm frames 3 ms; before, 4 px held about 500 chunks.
- **`we/propertyListener.ts`** / **`public/project.json`** — two WE properties so far, `slider_tilesize` and
  `slider_tickrate`. Edited by hand in both places, not derived from each other (see [wallpaper-engine-integration](../../docs/wallpaper-engine-integration.md)). Unchanged
  from `TileGridBase` — no noise-related WE property yet (e.g. a seed picker).
