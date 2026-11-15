# WorldNoise

**Status: cloned from `TileGridBase`, first noise layer (elevation) in place (2026-09-14).** Next in the lineage after
`WorldGenerator` (done, WFC) → `InfinityWalker` (paused, chunked WFC) → `TileGridBase` (active base) →
**`WorldNoise`**. This is the noise-based world-generation fork `TileGridBase/CLAUDE.md` described as "not
started" (originally scoped under the working name `WorldForge` before the 2026-09-13 reset that turned
`TileGridBase` into a generic, reusable base — see that project's `CLAUDE.md` and git history before the reset
for the torn-out reference implementation).

Being built step by step in small increments rather than all at once — check `notes.md` for the current step
before starting work here.

## Goal

Replace `TileGridBase`'s placeholder even/odd checkerboard with real procedurally generated terrain, using
**noise instead of Wave Function Collapse** (the approach `WorldGenerator`/`InfinityWalker` used):

- Independent **elevation / moisture / temperature** noise channels (likely layered/fractal noise per channel).
- A **redistribution curve** applied to raw noise so elevation isn't flat-distributed (more lowland/highland,
  less mid-value mush).
- A **biome lookup table** (Minecraft/Terraria-style) mapping `(elevation, moisture, temperature)` → biome →
  tile appearance.

All three channels (elevation with its redistribution curve and height levels, moisture, temperature) and the biome
lookup table exist. A tile draws its biome as a flat color; the tileset art, rules and decoration are still to come.

## Inherited from `TileGridBase` (unchanged)

Camera (pan/zoom, cursor/pinch-anchored zoom), chunked tile streaming, debug mode (`r`, HUD + chunk borders),
mouse-drag/touch pan and pinch-zoom, and the confirmed finding that **keyboard input doesn't reach an applied
desktop wallpaper — only mouse/touch and WE properties do**. `world/World.ts` in particular is currently
byte-identical to `TileGridBase`'s. See `TileGridBase/CLAUDE.md` for the full writeup — not re-documented here.

## Architecture (additions on top of TileGridBase)

Idea and plan: `idea.md`. Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

Following the same split `ColorWar` uses: new, fork-specific logic lives in its own top-level folder (here
`src/elevation/`, `src/moisture/` and `src/temperature/`, one folder per noise channel) rather than growing
the inherited `core`/`world` classes — those only get small additive changes (a new field, an extra import),
nothing restructured.

- **`config/constants.ts`** — tile size range/zoom, pan speed, chunk size/unload delay, tick interval range
  (inherited from `TileGridBase`), plus **`SEED`** (new — the one shared root seed for every pseudo-random/noise
  channel in the project, not just elevation; each channel salts it with its own name, e.g. `` `${SEED}:elevation` ``
  in `elevation/elevationNoise.ts`, so channels don't end up as identical noise fields) and
  **`ELEVATION_OCTAVES`, `ELEVATION_BASE_FREQUENCY`, `ELEVATION_PERSISTENCE`, `ELEVATION_LACUNARITY`,
  `ELEVATION_RAW_RANGE_LOW`/`_HIGH`, `ELEVATION_CONTRAST`, the elevation limits `ELEVATION_DEEP_WATER_LEVEL`,
  `ELEVATION_SEA_LEVEL`, `ELEVATION_BEACH_LEVEL`, `ELEVATION_ROCK_LEVEL`, `HEIGHT_LEVEL_OCTAVES`,
  `HEIGHT_LEVEL_THRESHOLDS`, `CLIFF_SHEET_TILE_SIZE_PX`** and the seven noise constants of the elevation channel again
  for each of `MOISTURE_*` and `TEMPERATURE_*` (octaves, base frequency, persistence, lacunarity, raw range low/high,
  contrast), plus `TEMPERATURE_REFERENCE_ELEVATION`, `TEMPERATURE_DROP_PER_ELEVATION` and the band thresholds
  `MOISTURE_BAND_THRESHOLDS` / `TEMPERATURE_BAND_THRESHOLDS`, and the road constants `CELL_SIZE_CHUNKS`,
  `ROAD_EDGE_PROBABILITY`, `ROAD_MIN_NODE_DEGREE`, `ROAD_HALF_WIDTH_TILES`, `ROAD_BEND_MAX_TILES`,
  `ROAD_SEGMENT_LENGTH_TILES`, `ROAD_BEND_CONTROL_COUNT` and the two cache limits `SKELETON_CACHE_MAX_ENTRIES` /
  `ROAD_POLYLINE_CACHE_MAX_ENTRIES`, and the town constants `TOWN_CELL_PROBABILITY`, `TOWN_DESIGNED_SHARE`,
  `TOWN_MIN_LAND_SHARE`, `TOWN_RING_WIDTH_TILES`, `TOWN_SAMPLE_STRIDE_TILES`, `TOWN_STRAIGHT_ROAD_FADE_TILES`,
  `TOWN_LARGE_WEIGHT`, `TOWN_MEDIUM_WEIGHT`, `TOWN_CACHE_MAX_ENTRIES`, plus `CELL_BUFFER_CHUNKS` (1: the buffer
  around a town and around a waypoint node inside its cell; the town shapes need a block of 3 x 3 chunks, so
  `CELL_SIZE_CHUNKS` minus twice the buffer must be 3, and the ring of `TOWN_RING_WIDTH_TILES` must fit into the buffer;
  both are checked when the modules load) (new — tuning
  constants live here, same as `ColorWar`'s `PRESET_*` constants, even though the code that consumes them lives in a
  feature folder).
- **`core/noise.ts`** (new, generic infra alongside `core/Ticker.ts`) — `createFractalNoise2D(seed, octaves,
  baseFrequency, persistence, lacunarity)`: wraps `simplex-noise`'s `createNoise2D`, seeded via `alea(seed)` (so
  the same seed always regenerates the same world — no world state needs to be stored/persisted). Layers
  `octaves` calls of simplex noise at doubling frequency (`lacunarity`) and halving amplitude (`persistence`) —
  classic fractal Brownian motion — and normalizes the weighted sum from simplex's native ~[-1, 1] range to
  [0, 1]. Knows nothing about elevation/tiles/biomes — purely a noise-field primitive, reused as-is by the
  elevation, moisture and temperature channels.
- **`elevation/elevationNoise.ts`** (new) — `export const elevationNoise: Noise2D`, a single module-level
  function: the private raw fractal noise (`createFractalNoise2D` + the `ELEVATION_*` constants above) passed through
  `redistributeElevation`. A ready-to-call function, not a class to instantiate — there's currently no live-mutable
  elevation state (no WE property changes the seed), so unlike `ColorWar`'s `WorldPreset` this doesn't need to be
  owned/passed around by `World`; `Chunk` just imports it directly.
- **`core/redistribute.ts`** (new, generic like `core/noise.ts`) — `createRedistribution(rawRangeLow, rawRangeHigh,
  contrast)`: raw fractal noise is bell-shaped (98 % of the values between 0.24 and 0.76, half between 0.4 and 0.6),
  so the raw range is stretched to 0..1 (values outside are clamped) and then pushed away from the middle by an
  S-curve. `contrast` is in [0, 1): 0 leaves the stretched value unchanged, higher values give more lowland and
  highland and less middle. Both ranges are checked when the function is created, so a bad constant fails loudly
  instead of producing NaN. The result is symmetric around 0.5. Every noise channel makes its own redistribution
  from its own constants.
- **`elevation/redistribute.ts`** (new) — `redistributeElevation`, the redistribution made from the `ELEVATION_*`
  constants. Retuning those moves the elevation limits (`ELEVATION_*_LEVEL`) used by the biome table, which are measured
  against the redistributed values.
- **`moisture/moistureNoise.ts`, `temperature/temperatureNoise.ts`** (new) — `moistureNoise` and `temperatureNoise`,
  built like `elevationNoise` (own seed salt `${SEED}:moisture` / `${SEED}:temperature`, fractal noise, own
  redistribution), one folder per channel. Base frequency is 0.005, half of the elevation's 0.01; a biome patch is about
  80 to 100 tiles wide (looked at in the biome map at this frequency), the terrain features about 100, so patches are
  about as large as the terrain features or larger. Contrast is 0.2, which makes each channel close to
  evenly spread over 0..1 (5 10 12 12 11 11 12 12 10 5 percent per tenth), so every (moisture, temperature) cell of a
  biome table is about equally likely. Measured on 250 000 tiles: correlation between any two of elevation, moisture
  and temperature is below 0.01. Temperature is plain noise, not tied to a latitude (the world is endless and has no
  latitude); how it falls with height is `temperature/temperatureAtElevation.ts`.
- **`temperature/temperatureAtElevation.ts`** (new) — `temperatureAtElevation(temperature, elevation)`: the air gets
  colder with height, `TEMPERATURE_DROP_PER_ELEVATION` (1.2) per unit of elevation above
  `TEMPERATURE_REFERENCE_ELEVATION` (0.58, the measured mean elevation of the land, so cold and hot land stay about
  equally common: 32 % each of the land below the rock limit). The biome table uses this value for the temperature
  band. Result: a cold region has snow down to the lowland; where the base temperature is in the hot third, the highest
  tiles above the rock limit are snow peak for 27 % of them and rock for the rest, and lower down such a region stays
  steppe, savanna or desert. Only the base temperature noise is called hot or cold here; the band of a tile uses
  the temperature after the drop.
- **`biome/biome.ts`** (new) — `biomeAt(elevation, moisture, temperature)` returns a `Biome` (`id`, `ground`, flat
  `color`). Water, beach and mountain follow the elevation (`ELEVATION_DEEP_WATER_LEVEL`, `_SEA_LEVEL`, `_BEACH_LEVEL`,
  `_ROCK_LEVEL`), land is a 3 x 3 table by temperature band (cold, mild, hot, from `temperatureAtElevation`) and moisture
  band (dry, normal, wet), both cut at one third and two thirds: snow field, tundra, snow forest / steppe, meadow,
  forest / desert, savanna, jungle. Above the rock limit the tile is snow peak if its temperature band is cold, else
  mountain. `jungle` is a stand-in with the forest's color until jungle art exists; steppe and savanna are `dirt`.
  `Ground` (deep water, shallow water, sand, grass, dirt, rock, snow) is the type the autotile step will key on; forest
  and meadow only differ by decoration later. Measured on 1 440 000 tiles: the nine land biomes are 5.4 to 7.8 % each,
  deep and shallow water 12.5 and 11.4 %, beach 5.8 %, snow peak 11.6 %, mountain 3.4 %. Mountain tiles together are
  15 % of the world (above the rock limit 0.85); with the first limit 0.72 they were 31 % and mostly snow, the
  `InfinityWalker` mountain problem again.
- **`elevation/heightLevel.ts`** (new) — `heightLevelAt(x, y, elevation)`: level 0 is water (elevation at or below
  `ELEVATION_SEA_LEVEL`), land gets level 1..N from a *smoothed* elevation, i.e. the same seed with only
  `HEIGHT_LEVEL_OCTAVES` (2) octaves, redistributed like the full elevation and cut at `HEIGHT_LEVEL_THRESHOLDS`.
  Same seed means the smoothed field is the low-frequency part of the full one, so levels and ground stay
  correlated. `cliffTypeOf(level, neighbours)` gives the cliff piece of a land tile that has a *higher* neighbour (InfinityWalker's
  `getCliffType`: the piece lies on the lower tile; two orthogonal higher neighbours at a right angle make an inner
  corner, otherwise the first higher side makes an edge named by the side it goes down to, only a diagonal one makes an outer corner; null without a
  higher neighbour). Water is never a cliff, a shore is a ground transition. Neighbouring land levels differ by at most one step (checked on 1 000 000
  tiles with the thresholds 0.55 and 0.8; with all 4 octaves a few jumps of two appeared). Why smoothed and not a
  filter: a 5 x 5 majority filter on the levels was measured and made it worse (tiny interior plateaus 16 to 198 in
  600 x 600 tiles at the old terrain scale), because it breaks the narrow middle band into pieces. Both noises use
  `ELEVATION_BASE_FREQUENCY` (0.01, features of about 100 tiles; the reason is in `idea.md`, Paths and towns). Measured
  on one seed and one area of 1 000 000 tiles (about 10 x 10 base features, so read the numbers as an order of
  magnitude): water 24 % of the tiles, land split 36 / 28 / 36 % over levels 1 to 3, cliff edges (old four-side rule) on 6 % of the land
  tiles, 227 plateaus, 22 tiny ones (under 16 tiles) of which 3 inside the land and the rest at the shore, no level jump
  of two.
- **`elevation/color.ts`** (new) — the temporary flat-band look of the height levels (`shadeForHeightLevel`), which the
  cliff art replaces. The ground color comes from the biome.
- **`tileset/autotile.ts`** (new) — the RPG Maker XP / Pokemon Essentials autotile rules, copied from the Essentials
  v19.1 script `Data/Scripts/006_Map renderer/003_TileDrawingHelper.rb` (`Autotiles`, `NeighborsToTiles`,
  `tableNeighbors`) and compared with it by a script (48 quarter entries and 256 mask entries identical; the mask
  table yields 47 distinct indices, 0 to 46): `AUTOTILE_QUARTER_IDS[index]` gives the four quarters of a tile
  (1-based ids, 6 columns of 16 px on the 96 x 128 sheet; top left, top right, bottom left, bottom right),
  `autotileIndexFor(mask)` maps the 8-neighbour mask (N 1, NE 2, E 4, SE 8, S 16, SW 32, W 64, NW 128; a bit is set
  when the neighbour continues the ground) to the tile index. A diagonal that matters only when both adjacent edges
  are set is already folded into the table.
- **`tileset/ground.ts`** (new) — `Ground`: the ground a tile is drawn with, the seven `BiomeGround`s of the biome table
  plus the two `OverlayGround`s `road` and `bridge` (a road on water). `groundWithRoad(biomeGround, isRoad)` makes the
  final ground; `fallbackColorOf(ground, biome)` is the flat color for a clone without sheets (the biome's color, or the
  fixed color of road and bridge).
- **`tileset/groundRank.ts`** (new) — the fixed rank of the grounds, deep water 0, shallow water 1, sand 2, grass 3,
  dirt 4, rock 5, snow 6, road 7, bridge 8, and `continuesInto(ground, neighbour)`: a neighbour counts as set when its
  rank is the same or higher. A ground therefore draws its own rim against lower grounds and a lower ground shows plain
  fill next to a higher one, so there is never a rim on both sides; a road has a rim on every ground it crosses.
- **`tileset/groundSheets.ts`** (new) — the data table `SHEET_FILE_BY_GROUND` (ground → autotile file) and
  `drawGroundAutotile(ctx, ground, autotileIndex, x, y, size)`, which draws the four 16 px quarters of the tile from
  the ground's sheet (the two halves are `floor(size / 2)` and the rest, so an odd tile size leaves no gap) and returns
  false when there is no sheet, so the tile falls back to the biome's flat color. The sheets are the development-only
  Essentials autotiles in `dev-assets/autotiles/` (see Working here), found by `import.meta.glob`, so a clone without
  them still builds and runs with flat colors. Mapping: deepWater `Sea deep`, shallowWater `Sea without shore`, sand
  `Sand`, grass `Light grass`, dirt `Dirt`, rock `Gravel`, snow `White path`, road `Brick path`; the bridge has no sheet
  yet and is a flat brown tile. The Essentials rims are painted for grass
  as the base, so a transition against water or snow shows a grass-green rim; the replacement art is converted to the
  same layout. Animation follows Essentials (`002_CustomTilemap.rb`): the frame count of a sheet is its width divided by
  96, the frames lie side by side, and the frame is `floor(now / ANIMATED_AUTOTILE_FRAME_DURATION_MS) % frameCount`
  with 250 ms (`5 * 60 / 20` game frames at 60 per second), the same frame for every tile, so the water moves as one.
  `WorldRenderer` computes the frame from `nowMs` and hands it to `Tile.draw`; sheets that are 96 px wide have one
  frame and never change. With the local sheets both water sheets have 8 frames (a cycle of 2 s); measured on the
  canvas over 4.6 s: 8 distinct images, a change about every 250 ms, 76 % of the screen's pixels (the land) never
  change.
- **`tileset/cliffTiles.ts`** (new) — `drawCliff(ctx, cliffType, heightLevel, x, y, size)` draws one of the 12 cliff pieces
  (4 edges, 4 outer and 4 inner corners) from the stone sets of `InfinityWalker/img/tileset.png` (256 x 1 920 px, 32 px
  tiles, 8 per row), copied to `dev-assets/tilesets/infinitywalker.png` and found by `import.meta.glob`; without it the
  function returns false and the tile has no cliff. Each of the three stone sets is a 3 x 3 frame at columns 3 to 5 (rows
  8, 14, 20) plus the inner corners at columns 6 and 7; the set follows the level of the lower tile (1 brown, 2 grey,
  3 dark brown). The inner corners of the grey set lie mirrored in the sheet, which `tiles.js` of InfinityWalker already
  accounts for (`GREY_STONE_INNER_OFFSETS`). Pieces are drawn before the level shade. Earlier tried and dropped: pieces
  cut from the Essentials `Outside` rock kit, which did not fit together (no corners). Not done: stairs where a road
  crosses a cliff; a tile with higher neighbours on three sides or on two opposite sides takes the first matching edge.
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
- **`town/townShapes.ts`** (new) — the footprint shapes as chunk offsets inside the inner 3 x 3 chunks of a cell: `large`
  (3 x 3), the medium shapes `tall`, `wide` (2 x 3, 3 x 2), `L` and `T` (5 chunks, four rotations each), and the small
  2 x 2 at its four positions.
- **`town/townPlacement.ts`** (new) — `townOfCell(cx, cy)`: a pure function of the cell and the base ground, cached. A cell
  wants a town with probability `TOWN_CELL_PROBABILITY` (0.7); a hash picks the size class (`TOWN_LARGE_WEIGHT` 0.3,
  `TOWN_MEDIUM_WEIGHT` 0.4, the rest small); the shapes of the class are tried in a hash order, a shape is taken when at
  least `TOWN_MIN_LAND_SHARE` (97 %) of its sampled tiles (every `TOWN_SAMPLE_STRIDE_TILES`, 2, tile) are land of the base
  ground; if none fits, the next smaller class is tried, otherwise the cell keeps a plain waypoint. The plateau level is
  the most common land level of the base ground in the footprint, the node of the town is the centre of the chunk of the
  footprint nearest to its centroid (so it lies inside an L or T), and a hash makes `TOWN_DESIGNED_SHARE` (20 %) of the
  towns designed. Measured on 14 400 cells: towns in 41 % (large 542, medium 3 286, small 2 084), designed 20.4 %,
  plateau levels 1 / 2 / 3 in 799 / 1 336 / 3 777 towns (towns stand inland, where the land is high), 0.56 ms per cell.
- **`town/townTerrain.ts`** (new) — `townInfoAt(x, y)` (inside the footprint, or in the ring of `TOWN_RING_WIDTH_TILES` (8)
  around it, looked up in the tile's own cell only) and `levelWithTown(baseLevel, info)`: inside the level is the plateau
  level, in the ring a land level is limited to the plateau level minus one up to plus one, water stays water. `Chunk`
  uses it for the final level, and inside a footprint the ground is the meadow (`TOWN_BIOME`, water in the footprint
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
- **`world/Tile.ts`** — one grid cell, owns its own `draw()`. Holds an `elevation: number` (0-1, kept as its own
  value), a `heightLevel`, its `cliffType`, its `biome`, its final `ground` (the biome's ground, or road or bridge)
  and its `autotileIndex` (all set at construction), draws the ground (autotile, else the flat color of road or
  bridge, else the biome color), the cliff piece and the level
  shade — this is exactly the extension point
  `TileGridBase/CLAUDE.md` describes this file as, and mirrors how `ColorWar`'s `Tile.ts` draws from its own
  simulation color.
- **`world/Chunk.ts`** — `CHUNK_SIZE × CHUNK_SIZE` block of tiles, built eagerly on construction. Imports
  the noise channels directly (not constructor-injected) and evaluates elevation, height level, biome and road on a
  grid padded by one tile on every side, so the cliff pieces (which read the eight neighbours) and the autotile neighbour mask (computed from the final
  grounds, road and bridge included) of the border tiles come from the same pure functions of the coordinates, never
  from a neighbouring chunk (no seams). Noise-based generation is cheap
  enough that eager per-chunk generation should still be fine here (unlike WFC, which needed more careful
  chunk-boundary handling in `InfinityWalker`).
- **`render/WorldRenderer.ts`** — per-frame orchestrator: visible bounds → sync chunks → draw each tile.
  Unchanged from `TileGridBase`.
- **`we/propertyListener.ts`** / **`public/project.json`** — two WE properties so far, `slider_tilesize` and
  `slider_tickrate`. Edited by hand in both places, not derived from each other (see `docs/wallpaper-engine-integration.md`). Unchanged
  from `TileGridBase` — no noise-related WE property yet (e.g. a seed picker).

## Controls (dev/debug, unchanged from TileGridBase for now)

`w`/`a`/`s`/`d`/arrows pan (shift sprints), wheel/`q`/`e` zoom, `r` toggles debug HUD + chunk borders, mouse-drag/
touch pan, pinch zoom. **Keyboard only works while developing** — once applied as a real desktop wallpaper, only
mouse/touch and WE properties reach the page (confirmed via `TileGridBase`, see `docs/wallpaper-engine-integration.md`).

## Agent workflow (temporary, this project only)

While `WorldNoise` is implemented from the plan in `idea.md`, the agent may, without asking each time, run this loop per
feature: feature branch, commits, `npm run lint` / `build` / `format:check` before each commit, screenshot for visual steps,
push, PR, review by a read-only subagent (diff and goal, not conclusions), fix real findings, squash merge, next feature.
This overrides the root rule "never push unless asked" for `WorldNoise/` only; it applies to no other project. The agent stops
and asks when a step is impossible or a design decision is open, and never implements on guesses. The user ends this section
when the implementation phase is over; then it is deleted.

## Working here

Same scripts as `TileGridBase` (this project hasn't diverged yet):

- `npm install` — first-time setup (not carried over from the clone; `node_modules`/`dist` were excluded on
  purpose).
- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`.
- `npm run lint` / `npm run format` — ESLint / Prettier, same configs as `TileGridBase`.
- Development assets: copy `sea-deep`, `sea-without-shore`, `sand`, `light-grass`, `dirt`, `gravel`, `white-path` and
  `brick-path` (all `.png`; from the Essentials v19.1 `Graphics/Autotiles/`: `Sea deep`, `Sea without shore`, `Sand`,
  `Light grass`, `Dirt`, `Gravel`, `White path`, `Brick path`) into `WorldNoise/dev-assets/autotiles/`, and
  `InfinityWalker/img/tileset.png` as `WorldNoise/dev-assets/tilesets/infinitywalker.png`. The folder is git-ignored on purpose: these
  graphics come from Nintendo games and are not cleared for publishing, so they are replaced before any publish. A
  build made while the folder exists carries them in `dist/` (Vite inlines files under 4 KB into the JS bundle as data
  URIs, larger ones are copied), and `dist/` is what Wallpaper Engine loads: publish only a build made without the
  folder.
