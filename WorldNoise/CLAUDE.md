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
  `HEIGHT_LEVEL_THRESHOLDS`, `CLIFF_EDGE_SIZE_DIVISOR`** and the seven noise constants of the elevation channel again
  for each of `MOISTURE_*` and `TEMPERATURE_*` (octaves, base frequency, persistence, lacunarity, raw range low/high,
  contrast), plus `TEMPERATURE_REFERENCE_ELEVATION`, `TEMPERATURE_DROP_PER_ELEVATION` and the band thresholds
  `MOISTURE_BAND_THRESHOLDS` / `TEMPERATURE_BAND_THRESHOLDS` (new — tuning constants live here, same as `ColorWar`'s
  `PRESET_*` constants, even though the code that consumes them lives in a feature folder).
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
  redistribution), one folder per channel. Base frequency is 0.005, a quarter of the elevation's 0.02, so a biome patch
  is about 80 to 100 tiles wide and larger than hills and lakes. Contrast is 0.2, which makes each channel close to
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
  correlated. `cliffEdgesOf(...)` marks the sides of a land tile whose neighbour is a lower *land* level; water is never
  a cliff, a shore is a ground transition. Neighbouring land levels differ by at most one step (checked on 1 000 000
  tiles with the thresholds 0.55 and 0.8; with all 4 octaves a few jumps of two appeared). Why smoothed and not a
  filter: a 5 x 5 majority filter on the levels was measured and made it worse (tiny interior plateaus 16 to 198 in
  600 x 600 tiles), because it breaks the narrow middle band into pieces. With 2 octaves there is about one tiny
  plateau (under 16 tiles) inside the land per 22 000 tiles; the other tiny ones (62 per 360 000 tiles) sit on shores.
  Land is about 76 % of the tiles, split 38 / 28 / 34 % over levels 1 to 3, and about 12 % of the land tiles carry a
  cliff edge.
- **`elevation/color.ts`** (new) — the temporary flat-band look of the height levels (`shadeForHeightLevel`, the cliff
  edge color), which the cliff art replaces. The ground color comes from the biome.
- **`tileset/autotile.ts`** (new) — the RPG Maker XP / Pokemon Essentials autotile rules, copied from the Essentials
  v19.1 script `Data/Scripts/006_Map renderer/003_TileDrawingHelper.rb` (`Autotiles`, `NeighborsToTiles`,
  `tableNeighbors`) and compared with it by a script (48 quarter entries and 256 mask entries identical; the mask
  table yields 47 distinct indices, 0 to 46): `AUTOTILE_QUARTER_IDS[index]` gives the four quarters of a tile
  (1-based ids, 6 columns of 16 px on the 96 x 128 sheet; top left, top right, bottom left, bottom right),
  `autotileIndexFor(mask)` maps the 8-neighbour mask (N 1, NE 2, E 4, SE 8, S 16, SW 32, W 64, NW 128; a bit is set
  when the neighbour continues the ground) to the tile index. A diagonal that matters only when both adjacent edges
  are set is already folded into the table.
- **`tileset/groundRank.ts`** (new) — the fixed rank of the grounds, deep water 0, shallow water 1, sand 2, grass 3,
  dirt 4, rock 5, snow 6, and `continuesInto(ground, neighbour)`: a neighbour counts as set when its rank is the same
  or higher. A ground therefore draws its own rim against lower grounds and a lower ground shows plain fill next to a
  higher one, so there is never a rim on both sides.
- **`tileset/groundSheets.ts`** (new) — the data table `SHEET_FILE_BY_GROUND` (ground → autotile file) and
  `drawGroundAutotile(ctx, ground, autotileIndex, x, y, size)`, which draws the four 16 px quarters of the tile from
  the ground's sheet (the two halves are `floor(size / 2)` and the rest, so an odd tile size leaves no gap) and returns
  false when there is no sheet, so the tile falls back to the biome's flat color. The sheets are the development-only
  Essentials autotiles in `dev-assets/autotiles/` (see Working here), found by `import.meta.glob`, so a clone without
  them still builds and runs with flat colors. Mapping: deepWater `Sea deep`, shallowWater `Sea without shore`, sand
  `Sand`, grass `Light grass`, dirt `Dirt`, rock `Gravel`, snow `White path`. The Essentials rims are painted for grass
  as the base, so a transition against water or snow shows a grass-green rim; the replacement art is converted to the
  same layout. Only frame 0 of a sheet is used; animated water is its own step.
- **`world/Tile.ts`** — one grid cell, owns its own `draw()`. Holds an `elevation: number` (0-1, kept as its own
  value), a `heightLevel`, its `cliffEdges`, its `biome` and its `autotileIndex` (all set at construction), draws the
  ground (autotile, else the biome color), the level shade and the cliff edges — this is exactly the extension point
  `TileGridBase/CLAUDE.md` describes this file as, and mirrors how `ColorWar`'s `Tile.ts` draws from its own
  simulation color.
- **`world/Chunk.ts`** — `CHUNK_SIZE × CHUNK_SIZE` block of tiles, built eagerly on construction. Imports
  the noise channels directly (not constructor-injected) and evaluates elevation, height level and biome on a grid
  padded by one tile on every side, so the cliff edges and the autotile neighbour mask of the border tiles come from the
  same pure functions of the coordinates, never from a neighbouring chunk (no seams). Noise-based generation is cheap
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
- Development assets: copy `sea-deep`, `sea-without-shore`, `sand`, `light-grass`, `dirt`, `gravel` and `white-path`
  (all `.png`; from the Essentials v19.1 `Graphics/Autotiles/`: `Sea deep`, `Sea without shore`, `Sand`, `Light grass`,
  `Dirt`, `Gravel`, `White path`) into `WorldNoise/dev-assets/autotiles/`. The folder is git-ignored on purpose: these
  graphics come from Nintendo games and are not cleared for publishing, so they are replaced before any publish. A
  build made while the folder exists carries them in `dist/` (Vite inlines files under 4 KB into the JS bundle as data
  URIs, larger ones are copied), and `dist/` is what Wallpaper Engine loads: publish only a build made without the
  folder.
