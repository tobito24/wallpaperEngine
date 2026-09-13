# TileGridBase

**Status: base/template project (reset 2026-09-13).** Not itself a wallpaper — a reusable starting point for any
2D tile-grid idea in this repo. To start a new project, **clone this folder** rather than building the
camera/grid/input plumbing from scratch again. TypeScript + Vite (the first project in this repo with a build
step).

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

## What this is

A minimal camera + chunked 2D tile-grid shell and nothing else:

- A 2D tile grid rendered as an **even/odd checkerboard** — a placeholder standing in for whatever a cloned
  project actually wants to draw per tile.
- A **camera** with world position (in tiles, fractional) and zoom (`tileSize` in px).
- **WASD** (+ arrow keys) pans the camera across the world at a constant speed, independent of zoom.
- **Mouse wheel / q,e** zoom by changing `tileSize` (clamped `MIN_TILE_SIZE`–`MAX_TILE_SIZE`), i.e. tiles get
  visually bigger/smaller rather than more/fewer tiles being loaded.
- **Chunked streaming**: the grid is divided into fixed-size chunks (`CHUNK_SIZE`); chunks touching the camera's
  visible bounds are loaded on demand, and a chunk not seen for `CHUNK_UNLOAD_DELAY_MS` gets unloaded. See
  `world/World.ts`.
- **Debug mode** (`r` to toggle, off by default): shows the HUD (tile size, camera position, loaded chunk count)
  and draws each loaded chunk's border, so chunk load/unload behavior is visible instead of just inferred from
  the checkerboard.

No terrain generation, no game logic, no Wallpaper Engine wiring — those are exactly the things a project cloned
from here adds on top.

## Next step (this project)

Camera controls need refining before this is solid enough to clone from confidently — exact scope TBD (candidates:
zoom-to-cursor instead of zoom-to-center, pan speed/acceleration feel, smoothing). Do this here, in
`TileGridBase`, before it gets cloned into concrete projects, so improvements land once instead of being
back-ported into every clone.

## Planned forks (separate future projects, not phases of this one)

- **Noise-based world generation** — successor to `InfinityWalker`'s WFC approach, this time with independent
  elevation/moisture/temperature noise channels + a redistribution curve + a biome lookup table
  (Minecraft/Terraria-style), replacing `WorldRenderer`'s checkerboard with real generated terrain. This is what
  this project was originally scoped as (under the name `WorldForge`) before the 2026-09-13 reset pulled it back
  to a generic base — see git history before that date for the torn-out implementation if it's useful as a
  reference.
- **A Game-of-Life-style project** — a cellular automaton over the same tile grid + camera, replacing the
  checkerboard with live/dead cell rendering and a simulation step.

Both clone this folder as their starting point; neither is implemented here.

## Architecture

- **`config/constants.ts`** — `TILE_SIZE_DEFAULT`/`MIN_TILE_SIZE`/`MAX_TILE_SIZE` (zoom range), `ZOOM_STEP_PX`,
  `PAN_SPEED_TILES_PER_SEC`, `CHUNK_SIZE` (tiles per chunk edge), `CHUNK_UNLOAD_DELAY_MS`.
- **`core/Camera.ts`** — world position + `tileSize` (zoom level). `pan()`, `zoomBy()`, `getVisibleTileBounds()`
  (which world tiles are on screen), `worldToScreen()` (floors to whole CSS px so pixel-art tiles don't get seams).
- **`core/input.ts`** — `InputState` tracks currently-held keys and exposes a normalized WASD/arrow-key move
  vector sampled once per frame (dt-scaled, so diagonal movement isn't faster); `attachZoomControls()` wires
  wheel/q/e straight to `Camera.zoomBy()`.
- **`core/App.ts`** — owns the canvas, camera, input, `DebugState`, `World`, and render loop
  (`requestAnimationFrame`, dt-clamped). The HUD only renders while `DebugState.enabled` is true.
- **`world/Tile.ts`** — one grid cell. Owns its own appearance (`draw(ctx, screenX, screenY, size)`) — currently
  just the even/odd checkerboard color, computed from its own `worldX`/`worldY`. This is the file a clone
  replaces with real per-tile content; nothing else needs to change to support that; callers only ever call
  `draw()`, they never read a tile's fields to decide how to render it themselves.
- **`world/Chunk.ts`** — a `CHUNK_SIZE x CHUNK_SIZE` block of `Tile`s at a fixed chunk coordinate, built eagerly on
  construction (cheap for placeholder content — a project with real generation can make this lazier without
  touching `World`'s load/unload logic). Tracks `lastSeenAtMs`, the clock `World` uses to decide when to unload
  it. `drawBorder()` draws its debug-mode outline, same "owns its own appearance" pattern as `Tile.draw()`.
- **`world/World.ts`** — owns all loaded chunks in a `Map` keyed `"cx,cy"`. `syncVisibleChunks(bounds, nowMs)` is
  called once per frame: loads any chunk touching `bounds` (or refreshes its `lastSeenAtMs` if already loaded),
  unloads any chunk not seen for `CHUNK_UNLOAD_DELAY_MS`, and returns the chunks currently touching `bounds`. Same
  `"cx,cy"`-keyed `Map` convention as `InfinityWalker/js/world.js`'s `World`, but this one actually unloads —
  InfinityWalker kept every chunk forever once created.
- **`render/WorldRenderer.ts`** — the frame orchestrator: gets the camera's visible bounds, calls
  `World.syncVisibleChunks()`, then for each returned chunk's tiles (clipped to `bounds`) computes the screen
  position via `Camera.worldToScreen()` and calls `tile.draw()`. Doesn't know or care how a tile renders itself.
  When `debugEnabled`, also calls each visible chunk's `drawBorder()` after all tiles are drawn.
- **`public/project.json`** — minimal Wallpaper Engine manifest (no properties yet). Wallpaper Engine integration
  is left to whatever concrete project gets cloned from here.

## Controls (dev/debug, not final)

`w`/`a`/`s`/`d` or arrow keys to pan. Wheel or `q`/`e` to zoom. `r` toggles debug mode (HUD + chunk borders).

## Working here

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`, a self-contained static bundle (includes `public/`
  verbatim) — this is what eventually gets pointed at from the Wallpaper Engine editor, once a clone is ready to
  publish.
- `npm run lint` — ESLint (flat config, `eslint.config.js`), `@eslint/js` + `typescript-eslint` recommended rules.
- `npm run format` / `npm run format:check` — Prettier (`.prettierrc.json`).
