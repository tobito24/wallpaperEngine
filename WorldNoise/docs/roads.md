# Roads: cell grid skeleton and road mask

Part of [WorldNoise](../CLAUDE.md). Source folders: `src/skeleton/`, `src/road/`. The town nodes the roads end at come from
[towns.md](towns.md); the design reasons are in [idea.md](../idea.md), Paths and towns.

## Constants

`config/constants.ts`: `CELL_SIZE_CHUNKS`, `CELL_BUFFER_CHUNKS` (1: the buffer around a town and around a waypoint node inside
its cell; the town shapes need a block of 3 x 3 chunks, so `CELL_SIZE_CHUNKS` minus twice the buffer must be 3, and the ring
of `TOWN_RING_WIDTH_TILES` must fit into the buffer; both are checked when the modules load), `ROAD_EDGE_PROBABILITY`,
`ROAD_MIN_NODE_DEGREE`, `ROAD_HALF_WIDTH_TILES`, the crossing constants (`CROSSING_HALF_LENGTH_TILES`, `CROSSING_LANES_BEFORE_TILES`,
`CROSSING_LANES_AFTER_TILES`, `CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES`, `CROSSING_MAX_FLATTENED_TILES`), the planner constants
(`ROAD_PLANNING_MARGIN_TILES`, `ROAD_RUN_BEFORE_CROSSING_TILES`, `ROAD_LOCK_AFTER_CROSSING_TILES`, `ROAD_MIN_TURN_RUN_TILES`,
`ROAD_MIN_CROSSING_GAP_TILES` and the costs `ROAD_STEP_COST`, `ROAD_TURN_COST`, `ROAD_WATER_STEP_COST`, `ROAD_EDGE_HUGGING_COST`,
`ROAD_CROSSING_COST`, `ROAD_FLATTENED_TILE_COST`, `ROAD_UNPLANNED_CROSSING_COST`, `ROAD_FOREIGN_PLATEAU_COST`), the smoothing constants
(`ROAD_CORNER_RADIUS_TILES`, `ROAD_WAVE_AMPLITUDE_TILES`, `ROAD_WAVE_LENGTH_TILES`, `ROAD_WAVE_MARGIN_TILES`, `ROAD_WAVE_MIN_LENGTH_TILES`,
`ROAD_WAVE_SAMPLE_STEP_TILES`) and the cache limits
`SKELETON_CACHE_MAX_ENTRIES` / `ROAD_EDGE_CACHE_MAX_ENTRIES`.

## Modules

- **`skeleton/cellGrid.ts`** (new) — the Mystery Dungeon style cell grid: cells of `CELL_SIZE_CHUNKS` (5) chunks, one
  node per cell inside the inner 3 x 3 chunks (a buffer of one chunk, `nodeAreaOf`); where in that area a waypoint lies is
  decided by `town/waypointNodes.ts`, the grid itself is topology only. Node candidates and edges are hashes of the seed and the
  cell (`core/keyedRandom.ts`: `randomValue(key)` is a fresh `Alea` stream per key, so a value depends on its key only;
  results are cached by `core/boundedCache.ts`, which clears a cache at `SKELETON_CACHE_MAX_ENTRIES` (20 000) entries
  and so cannot change a result). An edge between two neighbouring cells exists when its hash value is below
  `ROAD_EDGE_PROBABILITY`, or when one of its two nodes needs it: a node with fewer than `ROAD_MIN_NODE_DEGREE` such
  edges also takes the edges with the lowest hash values until it has two. Only hashes of the edge's own cell and of
  its neighbours are needed, so it is local. Topology only: the position of a town node and its gates will come from
  the town layer. Measured on 57 600 cells: no node has fewer than two edges (46 % have 2, 39 % 3, 15 % 4), every
  edge is seen identically from both ends. Degree two does not make one connected network: islands of linked cells and
  closed loops can exist, and a path between two given towns is not guaranteed.
- **`road/roadPlanner.ts`** (new) — `planRoad(start, end)`: the road of one edge, planned on the level field (the result goes through `smoothPolyline`). An end is a point (a
  tile centre) and, at a town gate, the direction outward. Grid A* in a box around the two ends (`ROAD_PLANNING_MARGIN_TILES` 14 tiles
  more on every side, so the road stays inside the two cells of its edge, checked when the module loads: nodes and gates lie at least
  16 tiles inside their cell) over the level of a tile (the noise level with the town override, `levelWithTown`). A state is tile,
  direction, tiles straight so far (up to `ROAD_RUN_BEFORE_CROSSING_TILES`, 4) and the tiles left of the lock after a crossing
  (`ROAD_LOCK_AFTER_CROSSING_TILES`, 4); moves are one tile ahead or a turn. Costs are integers (a step 10), so the result does not
  depend on rounding. Rules, each with its reason:
  - a turn needs the lock to be over and `ROAD_MIN_TURN_RUN_TILES` (4) straight tiles, so the road has straight stretches before and
    after every crossing (the footprint of the stairs is straight for 3 tiles each side) and no zigzag;
  - a level change between two land tiles is allowed only as a crossing: straight ahead, after the 4 straight tiles, not within
    `ROAD_MIN_CROSSING_GAP_TILES` (4) tiles of the last crossing (the 3 tiles each side of two footprints leave a consistent plan
    then: the band between has one level), one level apart, and `flattenCostOf` accepts it (at most `CROSSING_MAX_FLATTENED_TILES`
    tiles to flatten, at most `CROSSING_MAX_CONVERTED_WATER_TILES` water tiles to turn into land; cached per crossing). Its cost is `ROAD_CROSSING_COST` plus `ROAD_FLATTENED_TILE_COST` per flattened
    tile. Any other level change costs `ROAD_UNPLANNED_CROSSING_COST` (60 tiles of detour), so a path always exists and is clean where
    the terrain allows;
  - a north/south crossing is an ordinary step; an east/west crossing is a step to the diagonal tile one row south
    (towards the lower level) or north (towards the upper level): the road below the stairs lies one row south of the road above, both
    ending straight at the stairs, so the row of the path changes by the step and no state is needed for it;
  - a water tile costs `ROAD_WATER_STEP_COST` more (a bridge is a last resort); a tile whose side tiles lie on another level costs
    `ROAD_EDGE_HUGGING_COST` (the road is 3 tiles wide, it should not run along a cliff); a plateau tile of a town costs
    `ROAD_FOREIGN_PLATEAU_COST` unless it is an end (the planner never plans inside a town);
  - a gate end starts (or ends) straight along the gate direction.
  The result before the smoothing is the polyline (the tile centres at the corners, plus the two points of a vertical step at the boundary of an east/west
  crossing, collinear points dropped), the crossings (`RoadCrossing`: axis, boundary, lane = the row or column of the road on the upper
  side, side and levels of the upper level, so the stairs, the footprint and the road mask agree) and the level changes that were no
  crossing (`unplanned`). The search buffers are reused between calls (up to a few million states for a long edge).
- **`road/roadSmoothing.ts`** (new) — `smoothPolyline(points, crossings, ground)`: the planned polyline has right-angle corners and long straights;
  this makes it softer without moving a stair. A corner is cut by a quadratic curve (the corner as control point, `ROAD_CORNER_RADIUS_TILES`
  3 at most, half of the shorter adjacent segment at most), and never closer to a crossing than its straight stretch of
  `CROSSING_HALF_LENGTH_TILES` (3) each side of the boundary: with the 4 straight tiles the planner keeps before and after a crossing the radius
  there is at most 1.5, so the road inside a footprint stays exactly where the stairs expect it. The two points of the vertical step of an east/west
  crossing are never rounded. A straight stretch (after the corners) gets a gentle wave: the free part, `ROAD_WAVE_MARGIN_TILES` (6) in from
  its ends and from every crossing, if at least `ROAD_WAVE_MIN_LENGTH_TILES` (12) long, moves sideways by `sin(2 pi along / ROAD_WAVE_LENGTH_TILES)`
  times `ROAD_WAVE_AMPLITUDE_TILES` (2) times a window that is zero at both ends (the sign is a hash of the position, so it is deterministic;
  amplitude 1 is tried when 2 does not fit). The wave is only built where the corridor (the road and one tile each side) stays on one land level
  and outside every town plateau; elsewhere the road stays straight. `GroundProbe` is the level field of the search box.
- **`road/roadEdge.ts`** (new) — `roadEdge(ax, ay, bx, by)`: the polyline, the crossings and the `candidateOutcomes` (`stairs` or `unplanned`
  with a position, for the debug overlay) of an edge, cached per edge (`ROAD_EDGE_CACHE_MAX_ENTRIES`, 5 000). The ends: a waypoint node
  (`town/waypointNodes.ts`) or, at a town, the gate towards the neighbour (`town/townGates.ts`); inside the plateau the polyline runs from the
  town node (the centre of a footprint chunk) to a point up to `ROAD_RUN_BEFORE_CROSSING_TILES` tiles inside the gate along the gate direction
  and then to the gate, so the stairs at the plateau edge have their straight stretch. `roadEdgesIn(minX, minY, width, height)`: the edges of the
  east and south side of every cell within 2 cells of a rectangle: a road stays inside its two cells, a footprint reaches a few tiles
  out of the road, so an edge two cells away can still touch the rectangle.
- **`road/roadCrossing.ts`** (new) — a *crossing* is a level change of a road on stairs: `travelAxis` (the road runs along x or y), the integer
  `boundary` between two tile columns (rows), the `lane` (row or column of the road on the upper side), the higher side `upperSide` and
  the levels (the lower level is always the upper one minus 1, so a stair never spans two steps). `footprintOf`: 6 tiles along the road (3 each
  side of the boundary) and 7 across for a north/south crossing (the lane and 3 each side), 8 for an east/west one (3 before the lane,
  4 after it: the bulge below ends one row lower, and without the extra row a bay of one tile between the bulge and the terrain behind
  it is closed by the cleanup, measured: 35 of the east/west footprints). `plannedLevelAt`: the straight edge, and for an east/west
  crossing the bulge: the tile next to the boundary on the lower side (`bulgeColumnOf`) is raised to the upper level for 4 rows (lane - 1
  to lane + 2), so the cliff pieces of the bulge come out of the normal rule (two inner corners, two outer corners, two edges).
  `flattenCostOf(crossing)`: the tiles of the footprint whose natural level differs from the straight plan (without the bulge), or null when it is
  more than `CROSSING_MAX_FLATTENED_TILES` (8, or `CROSSING_MAX_FLATTENED_TILES_AT_TOWN` 16 when the footprint touches a town plateau or ring; of 42 tiles, of 48 for an east/west footprint) or when more than
  `CROSSING_MAX_CONVERTED_WATER_TILES` (24) water tiles lie in the water zone (`waterZoneOf`: the footprint plus the clearance the water limit demands for the
  two levels, `waterClearanceTiles` minus 1: none for 2/1, 2 for 3/2, 4 for 4/3). Water in that zone is turned into land by `flattenCrossings` (the
  level of its side of the crossing, `Chunk` gives such a tile the elevation just above the sea level so it is beach, not water), so the water limit finds no
  water inside the clearance and keeps the stairs; the coast moves back by a few tiles there. Every converted tile counts `CROSSING_WATER_TILE_FLATTEN_EQUIVALENT` (3) flattened tiles in the cost, so
  the planner prefers a dry spot. Measured: 17 of 1 201 crossings convert water (at most 5 tiles each). Towns are no
  exclusion: a footprint may lie on the terrace ring and on the plateau of a town, so stairs lead into a town, and it may change plateau
  tiles (at the plateau edge the straight boundary runs through the outline, ring tiles are raised to the plateau level, a notch of the
  outline may be lowered). The town layout (`computeLayout`) keeps the whole footprint of every crossing free of buildings. Crossings of
  different edges whose footprints touch (near a junction or a gate) are not coordinated: they are sorted by id and the later one
  flattens last.
- **`road/crossingTerrain.ts`** (new) — `crossingsOf(edges)`, `flattenCrossings(levels, minX, minY, size, crossings)`: sets every tile of
  a footprint to the upper or the lower level of the crossing, a straight edge. `Chunk` does this on its level block before the
  water limit and the cleanup (measured on 1 024 x 1 024 tiles: of 672 whole footprints 5 differ after the cleanup, every time because another crossing touches it).
- **`road/roadMask.ts`** (new) — `roadTilesIn(minX, minY, width, height)`: marks the tiles whose centre is within
  `ROAD_HALF_WIDTH_TILES` (1.5, about 3 tiles wide) of a road (the polyline of every edge of `roadEdgesIn`). A pure function of the coordinates: two overlapping rectangles agree on every shared tile (0 of
  57 200 compared tiles differed), so roads have no seams at chunk borders. Roads are 5.2 % of the world, one chunk
  costs about 0.03 ms. After the marking, thin spots are filled: a road tile is thin when its horizontal or vertical run is shorter than 3
(`MIN_ROAD_THICKNESS_TILES`); a non-road tile with road on one vertical and one horizontal neighbour, one of them thin, becomes
road. That closes the 2-wide joints of waves and jogs, while the ordinary stair-steps of a rounded bend stay as they are (a first
version filled every inner corner and made bends look squarer). The painting runs 3 tiles beyond the rectangle so the fill
needs no neighbour chunk (overlapping rectangles still agree, checked on 4 areas of 160 x 160 tiles). Stair stretches are
straight, so the footprints are untouched.

## Measured with the planner

On the 392 edges that `roadEdgesIn` returns for 1 024 x 1 024 tiles (one seed): 1 201 crossings and 37 level changes without stairs (36 edges; with the gates first and the higher flatten limit at towns: 70; before: 82, 64 edges), most of them
within 9 tiles of a town (the terrace ring of a town has a cliff every 4 tiles, `TOWN_RING_TERRACE_STEP_TILES`); 328 of the 392 edges have no level
change without stairs. The planning of all edges takes 5 s (13 ms per edge, once, cached), about 112 tiles per edge (107 after the smoothing: the cut corners are shorter), 49 points per polyline, 22 of the 154 edges that lie fully inside the area have a wave. Of 672 whole footprints 5 differ after
the cleanup (another crossing touches them) and 40 have a road tile too many or too few around the stairs (a second road runs near);
no jump of two levels among land, no decorated tile in a footprint, 4.8 tiles flattened per footprint on average (12 at most). Stairs
before the planner (the bent line, the walk for crossings and the straightening): 559 crossings and 1 278 places where a road changed
its level. The prototype of the planner that led here is described in [idea.md](../idea.md), Road planning.

Road tiles next to stairs keep their cliff pieces: leaving them out cut the cliff off abruptly (tried and removed).
