# Roads: cell grid skeleton and road mask

Part of [WorldNoise](../CLAUDE.md). Source folders: `src/skeleton/`, `src/road/`. The town nodes the roads end at come from
[towns.md](towns.md); the design reasons are in [idea.md](../idea.md), Paths and towns.

## Constants

`config/constants.ts`: `CELL_SIZE_CHUNKS`, `CELL_BUFFER_CHUNKS` (1: the buffer around a town and around a waypoint node inside
its cell; the town shapes need a block of 3 x 3 chunks, so `CELL_SIZE_CHUNKS` minus twice the buffer must be 3, and the ring
of `TOWN_RING_WIDTH_TILES` must fit into the buffer; both are checked when the modules load), `ROAD_EDGE_PROBABILITY`,
`ROAD_MIN_NODE_DEGREE`, `ROAD_HALF_WIDTH_TILES`, `ROAD_BEND_MAX_TILES`, `ROAD_SEGMENT_LENGTH_TILES`, `ROAD_BEND_CONTROL_COUNT`,
and the cache limits `SKELETON_CACHE_MAX_ENTRIES` / `ROAD_POLYLINE_CACHE_MAX_ENTRIES`.

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
- **`road/roadCurve.ts`** (new) — `edgePolyline(ax, ay, bx, by)`: the road of an edge, given by the two cells in either
  order (the nodes are put in the canonical order inside, so the result never depends on the order of the call), a line
  between its two nodes bent sideways by up to `ROAD_BEND_MAX_TILES` (6) with `ROAD_BEND_CONTROL_COUNT` (3) smooth
  control offsets from hashes of the edge (zero at both nodes), cut into segments of about `ROAD_SEGMENT_LENGTH_TILES`
  (4); cached per edge (`ROAD_POLYLINE_CACHE_MAX_ENTRIES`, 5 000). The nodes come from `town/townNodes.ts`, so a road
  ends at the centre of a town; the bend is faded out within the straight radius of a town node (the distance to the
  farthest corner of the footprint, `Town.straightRoadRadius`, 34 to 47 tiles) and over `TOWN_STRAIGHT_ROAD_FADE_TILES`
  (16) after it, so roads run straight through the whole footprint (measured on 32 378 road points inside footprints:
  largest deviation from the straight line 0.0; in the ring around it at most 1.1 tiles). A road stays inside the two cells of its nodes
  (nodes are at least 16 tiles from the cell edge, the bend is at most 6).
- **`road/roadMask.ts`** (new) — `roadTilesIn(minX, minY, width, height)`: marks the tiles whose centre is within
  `ROAD_HALF_WIDTH_TILES` (1.5, about 3 tiles wide) of a road, looking at the east and south edge of every cell around
  the rectangle. A pure function of the coordinates: two overlapping rectangles agree on every shared tile (0 of
  57 200 compared tiles differed), so roads have no seams at chunk borders. Roads are 5.2 % of the world, one chunk
  costs about 0.03 ms.
