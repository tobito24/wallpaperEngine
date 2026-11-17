# Towns: placement, terrain, buildings

Part of [WorldNoise](../CLAUDE.md). Source folder: `src/town/`. A town reads the base ground ([terrain.md](terrain.md)); the
road layer reads the town nodes ([roads.md](roads.md)), never the other way round. Design reasons: [idea.md](../idea.md),
Paths and towns.

## Constants

`config/constants.ts`: `TOWN_CELL_PROBABILITY`, `TOWN_DESIGNED_SHARE`, `TOWN_MIN_LAND_SHARE`, `TOWN_RING_WIDTH_TILES`,
`TOWN_SAMPLE_STRIDE_TILES`, `TOWN_LARGE_WEIGHT`, `TOWN_MEDIUM_WEIGHT`, `TOWN_CACHE_MAX_ENTRIES`,
`TOWN_OUTLINE_WOBBLE_TILES`, `TOWN_BUILDING_MARGIN_TILES`, `TOWN_BUILDING_STREET_MARGIN_TILES`, `TOWN_DOOR_PATH_MAX_TILES`, `TOWN_HOUSES_PER_CHUNK`.
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
  (`TOWN_RING_TERRACE_STEP_TILES` 4 tiles per step, so the limit widens by one step every four tiles and neighbouring ring tiles never differ by more than one level; a step of 2 put a cliff every 2 tiles into the ring, too close for stairs),
  water stays water. `Chunk`
  uses it for the final level, and inside a footprint the ground is `city` paving, or `cityStreet` on a road tile (`groundOf`; the biome is still `TOWN_BIOME`, the meadow, for the decoration; a higher ground next to a town, like forest or jungle, draws its rim over it, water in the footprint
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
  fits where all its tiles are free and a door path exists. Tiles within `TOWN_BUILDING_STREET_MARGIN_TILES` (1) of a street are never free (a strip of paving along the street, the "sidewalk"). The door path is a strip along the whole south edge of the building (`TOWN_DOOR_PATH_WIDTH_TILES` = 2 rows, as wide as the building; the door position of the sprite is not known, so the whole front is paved), plus, unless the strip already touches a sidewalk, a shortest connection (breadth first, at most `TOWN_DOOR_PATH_MAX_TILES` = 10 tiles, around the building itself) from the strip to a sidewalk tile, widened to the same width. All its tiles must be free or sidewalk. The tiles are the side paths, drawn as `cityStreet` (`townPathAt(town, x, y)`, read by `Chunk`), and no later building may stand on them. A placed building blocks its tiles and a margin of `TOWN_BUILDING_MARGIN_TILES` (1); a building without a door path is not placed there.
  A building that finds no place is left out, the Center too (a town may have no Center or Mart: decided with the user, not every town needs one). The road layer is read by the layout, never the other way round. `Tile` draws the
  piece (`tileset/outsideSheet.ts`, `drawOutsideTile`) after the cliff and before the level shade. Not done: fountain, lamps, plaza fields (`cityGrass`), trees and fences; no fountain was found in the sheet yet.
- **`town/waypointNodes.ts`** (new) — `waypointPosition(cx, cy)`: the node of a cell without a town. 48 candidate tiles are drawn
  uniformly from the node area of the cell by hash (`node:cx:cy:index:x|y`); each gets a clearance, the Chebyshev distance to the nearest
  tile of another base level (`heightLevelAt` of the noise, not the cleaned levels and no crossings) or to water, searched up to 8 tiles
  (a tile in water has 0, a tile with nothing in reach 9); the candidate with the largest clearance wins, the lower index on a tie. The
  node area lies 16 tiles inside the cell and the radius is 8, so only the own cell is read. Cached per cell, about 1.7 ms per cell cold.
  Measured on 93 waypoint cells (13 x 13 cells, one seed): before (a random point) 21 % of all nodes lay in water and 28 % within 3 tiles of
  a level change; now none of the waypoint nodes lies in water (one would only if the whole node area were sea) and 3 of 93 have a clearance of 3 or less (16 candidates: 14 of 93, so 48).
  Stairs on the 309 edges of 1 024 x 1 024 tiles: 551 -> 571, failures of the kinds road curve 53 -> 15, no straight edge 79 -> 53, water 3 -> 1.
- **`town/townGates.ts`** (new) — `townGate(town, side)`: the gate of a town on a side (`gateSideOf(stepX, stepY)` turns the step to the
  neighbouring cell into east, west, south or north). Only the sides that have an edge are asked, so a town has as many gates as roads
  (measured on 76 towns of 13 x 13 cells: 35 with 2 gates, 28 with 3, 13 with 4; every node has at least two edges). The gate is a plateau tile
  on the straight footprint edge, chosen before the outline wobble is built: the lanes of the outermost footprint tiles of that side (the
  deepest row of the bounding box, so a notch of an L or T shape does not count), the middle third of them, and among those the lane with the
  lowest cost: water tiles in a strip of `TOWN_GATE_WATER_HALF_WIDTH_TILES` (4) each side and `TOWN_GATE_WATER_DEPTH_TILES` (14) outward times `TOWN_GATE_WATER_COST` (100; stairs need dry land) plus the number of tiles that differ in level from the one straight beyond the gate (`levelVariation`: `TOWN_GATE_LEVEL_HALF_WIDTH_TILES` = 2 each side, `TOWN_GATE_LEVEL_DEPTH_TILES` = 3 deep, level read as the base level limited to the plateau level +-1, the ring) so the stairs at the plateau edge find a straight edge (measured on 97 towns, 239 gates: gates with an unplanned crossing within 12 tiles 24, now 17); a tie is broken by hash (`gate:cx:cy:side`); cached per town and side. Opposite sides share one lane so a straight street can join them: the lane comes from the lanes both sides have (common lanes), in both middle thirds unless a lane outside them is cheaper, with the cost of both gates added and the hash key of the pair (`gate:cx:cy:east-west`, `gate:cx:cy:north-south`), so both sides compute the same lane; only where the two sides have no lane in common each side picks alone (measured on 1507 towns: all of them share a lane, before 7 %). It does not read the plateau outline, so
  `townTerrain` can read the gates: `gateTaperedWobble` takes the outline wobble down to 0 within `TOWN_GATE_STRAIGHT_HALF_WIDTH_TILES` (4)
  of the gate lane and lets it grow by one per tile beyond that, so the plateau edge is straight where the stairs go and the gate tile is always
  plateau (measured: all 304 gates of 76 towns). The taper is built for all four sides, whether the side has a road or not, so the plateau does
  not depend on the road graph.
- **`town/townNodes.ts`** (new) — `nodePosition(cx, cy)`: the centre of the town of the cell, else the waypoint. The road layer reads
  these; the town does not read the road. What is inside a town beyond lawn and the straight roads (houses, fountain, fences) is not
  built yet. The planned road (`road/roadPlanner.ts`) starts at the outer end of the gate pad straight along its axis; the road of the graph ends there. A **gate pad** (`town/townPads.ts`, `padsOf(town)`) is a rectangle outside the plateau edge in front of every gate that has an edge: `TOWN_GATE_PAD_DEPTH_TILES` (6) deep and `TOWN_GATE_PAD_WIDTH_TILES` (7, `TOWN_GATE_PAD_TILES_BEFORE_LANE` = 3 tiles before the gate lane, so it covers the 7 lanes of a stairs footprint; the plan said 6 x 6, measured: gates with an unplanned crossing within 3 tiles of the pad end 12 of 239 with 6 wide, 9 with 7 wide) at the plateau level. `townInfoAt` reports a pad tile as `inside` (plateau level, town ground, water becomes land) and measures the ring distance from the union of footprint and pads, so a cliff at a pad edge is at most one step high. `townLayout` ignores tiles outside its rectangle (`isInLayout`). The stairs find a straight pad edge; the gate lane cost reads the levels beyond the pad (`levelVariation`, depth 7 to 9). Not solved: 23 of 239 gates still have an unplanned crossing within 12 tiles of the pad end, mostly further out on the terrace ring. Inside the plateau the
  streets of `town/townStreets.ts` take over (`townStreets(town)`, a list of polylines, cached per town, added to `roadEdgesIn` as edges without crossings so the road mask paints them like roads): four gates give two crossing straight streets (west-east, north-south), three gates the straight street of the opposite pair plus a straight branch from the third gate at a right angle to it, two opposite gates one straight street, two neighbouring gates one street with a right-angled corner, one gate a dead end up to the centre line (never built so far: every node has at least two edges). Opposite gates share a lane, so the streets are straight; a jog in the middle exists in the code for the case that they do not. Measured on 1507 towns: no street leaves the footprint. Known limits the layout step has to deal with: `Chunk` hard-codes the
  town ground (`city` and `cityStreet` inside a footprint, no `cityGrass` yet) and `roadTilesIn` paints roads over the whole footprint, so a layout that
  owns its ground and roads needs a town-layer call that can replace or veto both; `townInfoAt` only says inside or ring
  (a fence or stairs step also needs the distance to the footprint edge and the base level); `Tile.elevation` stays the
  base value, so inside a footprint that was water it disagrees with the level and the ground (decoration must use the
  level and the town info); a ring tile keeps its base biome while its level is limited (the biome of a lowered or raised
  ring tile is not decided); the 97 % land check samples every second tile, so a one tile wide channel can be filled.
