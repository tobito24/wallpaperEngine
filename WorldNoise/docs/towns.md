# Towns: placement, terrain, buildings

Part of [WorldNoise](../CLAUDE.md). Source folder: `src/town/`. A town reads the base ground ([terrain.md](terrain.md)); the
road layer reads the town nodes ([roads.md](roads.md)), never the other way round. Design reasons: [idea.md](../idea.md),
Paths and towns.

## Constants

`config/constants.ts`: `TOWN_CELL_PROBABILITY`, `TOWN_DESIGNED_SHARE`, `TOWN_MIN_LAND_SHARE`, `TOWN_RING_WIDTH_TILES`,
`TOWN_SAMPLE_STRIDE_TILES`, `TOWN_STRAIGHT_ROAD_FADE_TILES`, `TOWN_LARGE_WEIGHT`, `TOWN_MEDIUM_WEIGHT`, `TOWN_CACHE_MAX_ENTRIES`,
`TOWN_OUTLINE_WOBBLE_TILES`, `TOWN_BUILDING_MARGIN_TILES`, `TOWN_BUILDING_MAX_ROAD_DISTANCE_TILES`, `TOWN_HOUSES_PER_CHUNK`.
`CELL_SIZE_CHUNKS` and `CELL_BUFFER_CHUNKS` are described in [roads.md](roads.md).

## Modules

- **`town/townShapes.ts`** (new) — the footprint shapes as chunk offsets inside the inner 3 x 3 chunks of a cell: `large`
  (3 x 3), the medium shapes `tall`, `wide` (2 x 3, 3 x 2), `L` and `T` (5 chunks, four rotations each), and the small
  2 x 2 at its four positions.
- **`town/townPlacement.ts`** (new) — `townOfCell(cx, cy)`: a pure function of the cell and the base ground, cached. A cell
  wants a town with probability `TOWN_CELL_PROBABILITY` (0.7); a hash picks the size class (`TOWN_LARGE_WEIGHT` 0.3,
  `TOWN_MEDIUM_WEIGHT` 0.4, the rest small); the shapes of the class are tried in a hash order, a shape is taken when at
  least `TOWN_MIN_LAND_SHARE` (97 %) of its sampled tiles (every `TOWN_SAMPLE_STRIDE_TILES`, 2, tile) are land of the base
  ground; if none fits, the next smaller class is tried, otherwise the cell keeps a plain waypoint. The plateau level is
  the most common land level of the base ground in the footprint, at most the level whose water
  clearance (`waterClearanceTiles`, 3 tiles for level 3, 5 for level 4) is free of water around the footprint chunks, so a coastal town
  is level 2 (a level 3 plateau needs two tiles of level 2 between it and water for the two cliff rings; before, a coastal town of
  level 3 touched water directly: 154 tiles in 64 x 64 chunks, now 0, and the natural terrain never has it), the node of the town is the centre of the chunk of the
  footprint nearest to its centroid (so it lies inside an L or T), and a hash makes `TOWN_DESIGNED_SHARE` (20 %) of the
  towns designed. Measured on 14 400 cells: towns in 41 % (large 542, medium 3 286, small 2 084), designed 20.4 %,
  plateau levels 1 / 2 / 3 in 799 / 1 336 / 3 777 towns with three levels (towns stand inland, where the land is high; with four levels
  and the clearance on 4 096 chunks: 7 / 46 / 10 / 6 of 69 towns), 0.56 ms per cell.
- **`town/townTerrain.ts`** (new) — `townInfoAt(x, y)` (inside the footprint, or in the ring of `TOWN_RING_WIDTH_TILES` (8)
  around it, looked up in the tile's own cell only) and `levelWithTown(baseLevel, info)`: inside the level is the plateau
  level, in the ring a land level is limited to the plateau level minus up to plus `1 + floor(ringDistance / TOWN_RING_TERRACE_STEP_TILES)`
  (2 tiles per step, so the limit widens by one step every two tiles and neighbouring ring tiles never differ by more than one level),
  water stays water. `Chunk`
  uses it for the final level, and inside a footprint the ground is the meadow (`TOWN_BIOME`; a higher ground next to a town, like forest or jungle, draws its rim over it, water in the footprint
  becomes land). The outline is wavy: a tile of the chunk footprint is inside only when its distance to the nearest
  non-town chunk is larger than a stepped noise value of 0 to `TOWN_OUTLINE_WOBBLE_TILES` (4, `outlineNoise`, frequency
  0.05, 1 octave: calm waves of about 20 tiles); eroded tiles count as ring, so the footprint only shrinks and the ring still reaches 8 tiles outside
  the chunks (the wobble never adds reach); a water tile in the eroded zone stays water. Measured on the straight
  outline, before the wobble: 858 015 neighbouring land tile pairs around 40 towns: no level jump of two, the footprints of
  neighbouring cells are at least 32 tiles apart, all footprint chunks lie in the inner 3 x 3 chunks.
- **`town/townBuildings.ts`** and **`town/townLayout.ts`** (new) — the first town content. `BUILDING_TYPES` lists the
  buildings as rectangles of the private `Outside` sheet (tile column, row, width, height; found by looking at the sheet
  with a tile grid, as it holds no index): Pokemon Center 0.326 (5 x 5), Mart 0.331 (4 x 4), and five houses of 5 x 4
  (0.171 blue, 0.192 orange, 0.198 red, 0.179 grey, 3.183 purple). `townDecorationAt(town, x, y)` returns the sheet tile a
  tile shows or null. The layout of a town is computed once (cached per town, `TOWN_CACHE_MAX_ENTRIES`) as a pure function
  of the town: tiles that are inside the wavy footprint and not road are free; the Center, the Mart (towns of two or more
  chunks) and `floor(chunks * TOWN_HOUSES_PER_CHUNK)` random houses are tried in an order of positions shuffled by the town's seeded random stream, and one
  fits where all its tiles are free and a road tile lies within `TOWN_BUILDING_MAX_ROAD_DISTANCE_TILES` (4) of the tile in
  front of its door (bottom middle). A placed building blocks its tiles and a margin of `TOWN_BUILDING_MARGIN_TILES` (1).
  A building that finds no place is left out, the Center too (a small or heavily eroded town can end up without one; the road layout step has to guarantee it). The road layer is read by the layout, never the other way round. `Tile` draws the
  piece (`tileset/outsideSheet.ts`, `drawOutsideTile`) after the cliff and before the level shade. Not done: the layout
  of the roads themselves (loop, fountain, side paths, gates), trees and fences; no fountain was found in the sheet yet.
- **`town/townNodes.ts`** (new) — `nodePosition(cx, cy)`: the centre of the town of the cell, else the waypoint;
  `straightRoadRadiusOf`: the straight radius of the town, or null for a waypoint. The road layer reads these; the town
  does not read the road. What is inside a town beyond lawn and the straight roads (houses, fountain, fences) is not built
  yet. The roads enter a town at the angle of the neighbouring node, so the approaches are straight but not
  axis-parallel; the layout step can improve that. Known limits the layout step has to deal with: `Chunk` hard-codes the
  town ground (`TOWN_BIOME` inside a footprint) and `roadTilesIn` paints roads over the whole footprint, so a layout that
  owns its ground and roads needs a town-layer call that can replace or veto both; `townInfoAt` only says inside or ring
  (a fence or stairs step also needs the distance to the footprint edge and the base level); `Tile.elevation` stays the
  base value, so inside a footprint that was water it disagrees with the level and the ground (decoration must use the
  level and the town info); a ring tile keeps its base biome while its level is limited (the biome of a lowered or raised
  ring tile is not decided); the 97 % land check samples every second tile, so a one tile wide channel can be filled.
