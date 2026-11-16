# Roads: cell grid skeleton and road mask

Part of [WorldNoise](../CLAUDE.md). Source folders: `src/skeleton/`, `src/road/`. The town nodes the roads end at come from
[towns.md](towns.md); the design reasons are in [idea.md](../idea.md), Paths and towns.

## Constants

`config/constants.ts`: `CELL_SIZE_CHUNKS`, `CELL_BUFFER_CHUNKS` (1: the buffer around a town and around a waypoint node inside
its cell; the town shapes need a block of 3 x 3 chunks, so `CELL_SIZE_CHUNKS` minus twice the buffer must be 3, and the ring
of `TOWN_RING_WIDTH_TILES` must fit into the buffer; both are checked when the modules load), `ROAD_EDGE_PROBABILITY`,
`ROAD_MIN_NODE_DEGREE`, `ROAD_HALF_WIDTH_TILES`, `ROAD_BEND_MAX_TILES`, `ROAD_SEGMENT_LENGTH_TILES`, `ROAD_BEND_CONTROL_COUNT`,
the crossing constants (`CROSSING_HALF_LENGTH_TILES`, `CROSSING_HALF_WIDTH_TILES`, `CROSSING_APPROACH_TILES`, `CROSSING_MAX_LANE_SHIFT_TILES`, `CROSSING_BOUNDARY_SEARCH_TILES`, `CROSSING_SAMPLE_STEP_TILES`,
`CROSSING_STRAIGHTENING_STEP_TILES`) and the cache limits `SKELETON_CACHE_MAX_ENTRIES` / `ROAD_EDGE_CACHE_MAX_ENTRIES`.

## Modules

- **`skeleton/cellGrid.ts`** (new) — the Mystery Dungeon style cell grid: cells of `CELL_SIZE_CHUNKS` (5) chunks, one
  waypoint node per cell inside the inner 3 x 3 chunks (a buffer of one chunk), jittered by a hash of the seed and the
  cell (`core/keyedRandom.ts`: `randomValue(key)` is a fresh `Alea` stream per key, so a value depends on its key only;
  results are cached by `core/boundedCache.ts`, which clears a cache at `SKELETON_CACHE_MAX_ENTRIES` (20 000) entries
  and so cannot change a result). An edge between two neighbouring cells exists when its hash value is below
  `ROAD_EDGE_PROBABILITY`, or when one of its two nodes needs it: a node with fewer than `ROAD_MIN_NODE_DEGREE` such
  edges also takes the edges with the lowest hash values until it has two. Only hashes of the edge's own cell and of
  its neighbours are needed, so it is local. Topology only: the position of a town node and its gates will come from
  the town layer. Measured on 57 600 cells: no node has fewer than two edges (46 % have 2, 39 % 3, 15 % 4), every
  edge is seen identically from both ends. Degree two does not make one connected network: islands of linked cells and
  closed loops can exist, and a path between two given towns is not guaranteed.
- **`road/roadCurve.ts`** (new) — `edgeCurve(ax, ay, bx, by)`: the curve of the road of an edge, before the crossings are cut into it, given by the two cells in either
  order (the nodes are put in the canonical order inside, so the result never depends on the order of the call), a line
  between its two nodes bent sideways by up to `ROAD_BEND_MAX_TILES` (6) with `ROAD_BEND_CONTROL_COUNT` (3) smooth
  control offsets from hashes of the edge (zero at both nodes), cut into segments of about `ROAD_SEGMENT_LENGTH_TILES`
  (4). The nodes come from `town/townNodes.ts`, so a road
  ends at the centre of a town; the bend is faded out within the straight radius of a town node (the distance to the
  farthest corner of the footprint, `Town.straightRoadRadius`, 34 to 47 tiles) and over `TOWN_STRAIGHT_ROAD_FADE_TILES`
  (16) after it, so roads run straight through the whole footprint (measured on 32 378 road points inside footprints:
  largest deviation from the straight line 0.0; in the ring around it at most 1.1 tiles). A road stays inside the two cells of its nodes
  (nodes are at least 16 tiles from the cell edge, the bend is at most 6).
- **`road/roadEdge.ts`** (new) — `roadEdge(ax, ay, bx, by)`: the curve of an edge plus its crossings, cached per edge
  (`ROAD_EDGE_CACHE_MAX_ENTRIES`, 5 000); `roadEdgesIn(minX, minY, width, height)`: the edges of the east and south side of every cell around
  a rectangle (a road stays at least 10 tiles away from the border of its cells, so a crossing footprint, at most 9 tiles from the road
  (`CROSSING_HALF_WIDTH_TILES` plus `CROSSING_MAX_LANE_SHIFT_TILES`), never reaches into a cell this misses; checked when the modules load).
- **`road/roadCrossing.ts`, `road/roadStraightening.ts`** (new) — a *crossing* is a level change along the curve of a road. The curve is walked
  in steps of `CROSSING_SAMPLE_STEP_TILES` (0.5) over the terrain level before cleanup (noise level with the town override). A change
  is a candidate when the higher level is at least 2 (a cliff exists) and the lower one is land. The road travels along the axis it moves
  along most (`travelAxis`); the crossing has the integer `boundary` between two tile columns (rows) and the `lane`, the row (column) of the
  road, and the higher side (`upperSide`); the lower level is always the upper one minus 1, so a stair never spans two steps. The footprint
  is 6 tiles along the road (3 each side of the boundary) and 7 across (the lane and 3 each side: the stairs of the next steps need a
  straight cliff of 6 rows). The road is orthogonal to the cliff it meets, so a candidate looks for a place where the cliff already is:
  `shiftedAlongBoundary` tries the lane shifted along the cliff (0, -1, 1, -2, ... up to `CROSSING_MAX_LANE_SHIFT_TILES`, 6) and finds the
  boundary of that lane within `CROSSING_BOUNDARY_SEARCH_TILES` (3) of the first one; the first lane whose terrain supports it wins.
  The terrain supports a crossing when the tiles 2 and 3 tiles from the boundary on both sides, in the lane and 3 tiles to the left and
  right of it, hold their levels (no sliver the cleanup would remove, no boundary at a slant). Further conditions: no water within the footprint plus
  `WATER_LIMIT_REACH_TILES`, no town tile inside, and no other crossing of the same edge closer than `CROSSING_SPACING_TILES` (23, in both x
  and y of the centre, whatever the axes). `straightenAt` then replaces the curve around the crossing (3 tiles each side straight along the
  axis through the middle of the lane, `CROSSING_APPROACH_TILES` (8) of cosine blending back to the curve, so the road goes sideways to the
  shifted lane over those 8 tiles); a crossing where the curve is not monotone along the axis in that window is dropped. Crossings of
  different edges whose footprints touch are not resolved (sorted by id, the later one flattens last). Measured on 309 edges in
  1 024 x 1 024 tiles: 180 crossings, of 134 whole footprints 118 had to change tiles, 2.8 of 42 on average and 5 at most. A footprint of 12 x 11 and
  support at distance 3 gave 48 crossings (148 without any support check, which left box-shaped plateaus and 56 jumps of two levels at their rims);
  support at distance 1 gave 77 with practically nothing to flatten, 2 is the compromise.
- **`road/crossingTerrain.ts`** (new) — `crossingsOf(edges)`, `flattenCrossings(levels, minX, minY, size, crossings)`: sets every tile of
  a footprint to the upper or the lower level of the crossing, a straight edge. `Chunk` does this on its level block before the
  water limit and the cleanup (measured: all 134 footprints inside 1 024 x 1 024 tiles carry exactly their levels after the cleanup, no jump of two among land
  anywhere; 1.1 ms per chunk).
- **`road/roadMask.ts`** (new) — `roadTilesIn(minX, minY, width, height)`: marks the tiles whose centre is within
  `ROAD_HALF_WIDTH_TILES` (1.5, about 3 tiles wide) of a road (the straightened curve of every edge of `roadEdgesIn`). A pure function of the coordinates: two overlapping rectangles agree on every shared tile (0 of
  57 200 compared tiles differed), so roads have no seams at chunk borders. Roads are 5.2 % of the world, one chunk
  costs about 0.03 ms.
