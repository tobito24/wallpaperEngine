# Roads: cell grid skeleton and road mask

Part of [WorldNoise](../CLAUDE.md). Source folders: `src/skeleton/`, `src/road/`. The town nodes the roads end at come from
[towns.md](towns.md); the design reasons are in [idea.md](../idea.md), Paths and towns.

## Constants

`config/constants.ts`: `CELL_SIZE_CHUNKS`, `CELL_BUFFER_CHUNKS` (1: the buffer around a town and around a waypoint node inside
its cell; the town shapes need a block of 3 x 3 chunks, so `CELL_SIZE_CHUNKS` minus twice the buffer must be 3, and the ring
of `TOWN_RING_WIDTH_TILES` must fit into the buffer; both are checked when the modules load), `ROAD_EDGE_PROBABILITY`,
`ROAD_MIN_NODE_DEGREE`, `ROAD_HALF_WIDTH_TILES`, `ROAD_BEND_MAX_TILES`, `ROAD_SEGMENT_LENGTH_TILES`, `ROAD_BEND_CONTROL_COUNT`,
the crossing constants (`CROSSING_HALF_LENGTH_TILES`, `CROSSING_LANES_BEFORE_TILES`, `CROSSING_LANES_AFTER_TILES`, `CROSSING_EAST_WEST_EXTRA_LANES_AFTER_TILES`, `CROSSING_APPROACH_TILES`, `CROSSING_MAX_LANE_SHIFT_TILES`, `CROSSING_BOUNDARY_SEARCH_TILES`, `CROSSING_MAX_FLATTENED_TILES`, `CROSSING_SAMPLE_STEP_TILES`,
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
  a rectangle (a road stays at least 10 tiles away from the border of its cells, so a crossing footprint, at most 10 tiles from the road
  (`CROSSING_LANES_AFTER_TILES` plus the extra lane of an east/west crossing plus `CROSSING_MAX_LANE_SHIFT_TILES` plus one for the rounding of the lane), never reaches into a cell this misses; checked when the modules load).
- **`road/roadCrossing.ts`, `road/roadStraightening.ts`** (new) — a *crossing* is a level change along the curve of a road. The curve is walked
  in steps of `CROSSING_SAMPLE_STEP_TILES` (0.5) over the terrain level before cleanup (noise level with the town override). A change
  is a candidate when the higher level is at least 2 (a cliff exists) and the lower one is land. The road travels along the axis it moves
  along most (`travelAxis`); the crossing has the integer `boundary` between two tile columns (rows) and the `lane`, the row (column) of the
  road, and the higher side (`upperSide`); the lower level is always the upper one minus 1, so a stair never spans two steps. The footprint
  is 6 tiles along the road (3 each side of the boundary) and 7 across for a north/south crossing (the lane and 3 each side), 8 for an
  east/west one (3 before the lane, 4 after it: the bulge below ends one row lower, and without the extra row a bay of one tile
  between the bulge and the terrain behind it is closed by the cleanup, measured: 35 of the east/west footprints inside the area). The road is orthogonal to the cliff it meets, so a candidate looks for a place where the cliff already is:
  `placeCrossing(candidate, preferredLane, isAllowed)` tries the lanes within `CROSSING_MAX_LANE_SHIFT_TILES` (5) of the lane of the candidate,
  nearest to the preferred lane first, finds the
  boundary of that lane within `CROSSING_BOUNDARY_SEARCH_TILES` (3) of the first one and counts the tiles of the footprint whose natural level
  differs from the planned one (`tilesToFlatten`); the buildable lane with the fewest wins (the lane nearest to the preferred one on a tie) and needs at most
  `CROSSING_MAX_FLATTENED_TILES` (8 of 42), so a boundary in steps of one tile is accepted and a sliver or a slant is not. Buildable: no
  water within the footprint plus the clearance the water limit demands for the two levels (`waterClearanceTiles` minus 1: none for 2/1, 2 for
  3/2, 4 for 4/3) and no town tile inside the footprint. Crossings of one edge that are far apart (`CROSSING_SPACING_TILES`, 23 in x and y of
  the centre, whatever the axes) are independent. Closer ones of the same axis chain into a run when the gap between their straight stretches
  (`|boundary difference|` minus 6) is at least twice their lane difference; a candidate close to the last crossing of the edge therefore
  prefers the lane of that crossing and only takes lanes where the chain holds, so the road runs straight through the cliffs of a run
  instead of wandering sideways between them. `straightenThrough` replaces the curve around a run
  (3 tiles each side of every boundary straight along the axis through the middle of the lane; `CROSSING_APPROACH_TILES` (8) of cosine
  blending to the curve on the outer sides, so the road goes sideways to a shifted lane over those 8 tiles; between two crossings the lane
  blends from one to the other: each crossing has the weight 1 on its straight stretch and a cosine fade outside, the lane is the
  curve mixed with the average of the lanes weighted by weight / (1 - weight), which is exactly the lane of the crossing on its stretch).
  A run where the curve is not monotone along the axis in the window is not built. Crossings of different edges whose footprints touch
  are not resolved (sorted by id, the later one flattens last). Measured on 309 edges in 1 024 x 1 024 tiles: 301 crossings (176 of them
  north/south, 125 east/west; 334 before the east/west bulge, which costs lanes), of 227 whole footprints 0 differ after the cleanup, 4.8 tiles changed on
  average and 12 at most (an east/west footprint has 6 x 8 tiles), no jump of two levels
  among land, the road in the lane exactly 3 tiles wide. History: 12 x 11 footprint with the support check at distance 3 gave 48 crossings (148
  without any check, which left box-shaped plateaus and 56 jumps of two levels at their rims), 6 x 7 with a stricter check 180; before the chain
  rule roughly half of the candidates that passed the terrain checks were lost to the spacing of 23; with the chain rule 62 of the 201
  dropped placements overlapped an accepted crossing (cliffs less than 6 tiles apart, no room for two stairs) and 89 could not chain
  because the lanes of their straight places were too far apart, the case the preferred lane addresses (268 -> 334 crossings).
  **East/west crossings** (`travelAxis` x, the cliff runs north/south) are stairs of 2 x 4 tiles over a bulge: `plannedLevelAt` raises the
  tile next to the boundary on the lower side (`bulgeColumnOf`) to the upper level for 4 rows (lane - 1 to lane + 2), so the cliff pieces
  of the bulge come out of the normal rule (two inner corners, two outer corners, two edges, measured on all east/west crossings inside
  1 024 x 1 024 tiles) and `tilesToFlatten` counts without the bulge. The road on the lower side lies one row south of the upper one
  (`lowerSideLaneOffsetTiles`, 1): in `straightenThrough` every crossing has a lane before and a lane after its boundary (the upper and
  the lower lane in the order of the progress along the curve), the sample at the boundary exists twice, so the polyline steps
  by one row in the middle of the stairs and both roads end straight at the stairs (measured: the road tiles next to the stairs are
  exactly rows lane - 1 to lane + 1 on the upper side and lane to lane + 2 on the lower side in all of them). `chainsOnto` adds that offset to the
  lane difference.
- **`road/crossingTerrain.ts`** (new) — `crossingsOf(edges)`, `flattenCrossings(levels, minX, minY, size, crossings)`: sets every tile of
  a footprint to the upper or the lower level of the crossing, a straight edge. `Chunk` does this on its level block before the
  water limit and the cleanup (measured: all 227 footprints inside 1 024 x 1 024 tiles carry exactly their levels after the cleanup; 1.8 ms per chunk).
- **`road/roadMask.ts`** (new) — `roadTilesIn(minX, minY, width, height)`: marks the tiles whose centre is within
  `ROAD_HALF_WIDTH_TILES` (1.5, about 3 tiles wide) of a road (the straightened curve of every edge of `roadEdgesIn`). A pure function of the coordinates: two overlapping rectangles agree on every shared tile (0 of
  57 200 compared tiles differed), so roads have no seams at chunk borders. Roads are 5.2 % of the world, one chunk
  costs about 0.03 ms.
