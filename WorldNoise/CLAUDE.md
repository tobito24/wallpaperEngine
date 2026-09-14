# WorldNoise

**Status: just cloned from `TileGridBase` (2026-09-14), no project-specific code yet.** Next in the lineage after
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

None of this exists yet — right now this project is byte-for-byte `TileGridBase` with only the name changed
(`package.json`, `public/project.json`'s `title`). Everything in the Architecture section below currently
describes inherited `TileGridBase` code, not anything WorldNoise-specific.

## Architecture (inherited from TileGridBase, not yet modified)

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

- **`config/constants.ts`** — tile size range/zoom, pan speed, chunk size/unload delay, tick interval range.
- **`core/Camera.ts`** — world position + zoom (`tileSize`), pan/zoom (cursor- and center-anchored),
  world↔screen conversion.
- **`core/input.ts`** — WASD/arrow-key pan (dev-only, see Controls below), wheel/q-e zoom, mouse-drag/touch pan,
  pinch zoom.
- **`core/App.ts`** — owns canvas, camera, input, debug state, `World`, `Ticker`, render loop.
- **`core/Ticker.ts`** — fixed-rate tick independent of per-frame `dt`, live-adjustable via `slider_tickrate`.
  `App.update()` currently just increments a debug-only counter — this is where WorldNoise's actual per-tick
  logic (if any is needed beyond one-time generation) would plug in.
- **`world/Tile.ts`** — one grid cell, owns its own `draw()`. **This is the file that becomes real terrain**:
  right now it's just the even/odd checkerboard computed from `worldX`/`worldY`.
- **`world/Chunk.ts`** — `CHUNK_SIZE × CHUNK_SIZE` block of tiles, built eagerly on construction. Noise-based
  generation is cheap enough that eager per-chunk generation should still be fine here (unlike WFC, which needed
  more careful chunk-boundary handling in `InfinityWalker`).
- **`world/World.ts`** — loaded chunks in a `Map`, load/unload driven by camera visibility + `CHUNK_UNLOAD_DELAY_MS`.
- **`render/WorldRenderer.ts`** — per-frame orchestrator: visible bounds → sync chunks → draw each tile.
- **`we/propertyListener.ts`** / **`public/project.json`** — two WE properties so far, `slider_tilesize` and
  `slider_tickrate`. Edited by hand in both places, not derived from each other (see root `CLAUDE.md`).

Full inherited-behavior detail (controls, WE keyboard-input caveat, build commands) is in
`TileGridBase/CLAUDE.md` — not re-documented here since nothing has diverged yet. Once WorldNoise code starts
actually differing from the base, describe the divergence here instead of duplicating the parts that didn't
change.

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
