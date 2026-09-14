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

Moisture/temperature, the redistribution curve, and the biome lookup table don't exist yet — only the elevation
channel is in so far, rendered as flat color bands (no biome logic, just "is this elevation value water/beach/
land/hills/mountain").

## Inherited from `TileGridBase` (unchanged)

Camera (pan/zoom, cursor/pinch-anchored zoom), chunked tile streaming, debug mode (`r`, HUD + chunk borders),
mouse-drag/touch pan and pinch-zoom, and the confirmed finding that **keyboard input doesn't reach an applied
desktop wallpaper — only mouse/touch and WE properties do**. `world/World.ts` in particular is currently
byte-identical to `TileGridBase`'s. See `TileGridBase/CLAUDE.md` for the full writeup — not re-documented here.

## Architecture (additions on top of TileGridBase)

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

Following the same split `ColorWar` uses: new, fork-specific logic lives in its own top-level folder (here
`src/elevation/`, one folder per noise channel expected as moisture/temperature get added) rather than growing
the inherited `core`/`world` classes — those only get small additive changes (a new field, an extra import),
nothing restructured.

- **`config/constants.ts`** — tile size range/zoom, pan speed, chunk size/unload delay, tick interval range
  (inherited from `TileGridBase`), plus **`SEED`** (new — the one shared root seed for every pseudo-random/noise
  channel in the project, not just elevation; each channel salts it with its own name, e.g. `` `${SEED}:elevation` ``
  in `elevation/elevationNoise.ts`, so channels don't end up as identical noise fields) and
  **`ELEVATION_OCTAVES`, `ELEVATION_BASE_FREQUENCY`, `ELEVATION_PERSISTENCE`, `ELEVATION_LACUNARITY`** (new —
  tuning constants for the elevation channel live here, same as `ColorWar`'s `PRESET_*` constants, even though the
  code that consumes them lives in a feature folder).
- **`core/noise.ts`** (new, generic infra alongside `core/Ticker.ts`) — `createFractalNoise2D(seed, octaves,
  baseFrequency, persistence, lacunarity)`: wraps `simplex-noise`'s `createNoise2D`, seeded via `alea(seed)` (so
  the same seed always regenerates the same world — no world state needs to be stored/persisted). Layers
  `octaves` calls of simplex noise at doubling frequency (`lacunarity`) and halving amplitude (`persistence`) —
  classic fractal Brownian motion — and normalizes the weighted sum from simplex's native ~[-1, 1] range to
  [0, 1]. Knows nothing about elevation/tiles/biomes — purely a noise-field primitive, meant to be reused as-is
  for moisture/temperature once those channels get their own `elevation`-style folder.
- **`elevation/elevationNoise.ts`** (new) — `export const elevationNoise: Noise2D`, a single module-level
  instance built from `createFractalNoise2D` + the `ELEVATION_*` constants above. A ready-to-call function, not a
  class to instantiate — there's currently no live-mutable elevation state (no WE property changes the seed), so
  unlike `ColorWar`'s `WorldPreset` this doesn't need to be owned/passed around by `World`; `Chunk` just imports
  it directly.
- **`elevation/color.ts`** (new) — `colorForElevation(elevation)`, mapping a 0-1 elevation value to a color via a
  small hardcoded stop table (`ELEVATION_COLOR_STOPS`) — deep water / shallow water / beach / lowland / hills /
  mountain. **This is a placeholder for the eventual biome lookup**, not the real biome system — no
  moisture/temperature input yet, so e.g. there's no way to distinguish desert from tundra at the same elevation.
  Same role `simulation/Color.ts`'s `colorHex()` plays in `ColorWar`.
- **`world/Tile.ts`** — one grid cell, owns its own `draw()`. Now holds an `elevation: number` (0-1, set at
  construction) and calls `colorForElevation()` from `elevation/color.ts` to draw — this is exactly the extension
  point `TileGridBase/CLAUDE.md` describes this file as, and mirrors how `ColorWar`'s `Tile.ts` calls `colorHex()`
  from `simulation/Color.ts`.
- **`world/Chunk.ts`** — `CHUNK_SIZE × CHUNK_SIZE` block of tiles, built eagerly on construction. Imports
  `elevationNoise` directly (not constructor-injected) and calls it once per tile with that tile's world
  coordinates to get its elevation. Noise-based generation is cheap enough that eager per-chunk generation should
  still be fine here (unlike WFC, which needed more careful chunk-boundary handling in `InfinityWalker`).
- **`render/WorldRenderer.ts`** — per-frame orchestrator: visible bounds → sync chunks → draw each tile.
  Unchanged from `TileGridBase`.
- **`we/propertyListener.ts`** / **`public/project.json`** — two WE properties so far, `slider_tilesize` and
  `slider_tickrate`. Edited by hand in both places, not derived from each other (see root `CLAUDE.md`). Unchanged
  from `TileGridBase` — no noise-related WE property yet (e.g. a seed picker).

## Controls (dev/debug, unchanged from TileGridBase for now)

`w`/`a`/`s`/`d`/arrows pan (shift sprints), wheel/`q`/`e` zoom, `r` toggles debug HUD + chunk borders, mouse-drag/
touch pan, pinch zoom. **Keyboard only works while developing** — once applied as a real desktop wallpaper, only
mouse/touch and WE properties reach the page (confirmed via `TileGridBase`, see root `CLAUDE.md`).

## Working here

Same scripts as `TileGridBase` (this project hasn't diverged yet):

- `npm install` — first-time setup (not carried over from the clone; `node_modules`/`dist` were excluded on
  purpose).
- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`.
- `npm run lint` / `npm run format` — ESLint / Prettier, same configs as `TileGridBase`.
