# TileGridBase

**Status: base/template project (reset 2026-09-13).** Not itself a wallpaper — a reusable starting point for any
2D tile-grid idea in this repo. To start a new project, **clone this folder** rather than building the
camera/grid/input plumbing from scratch again. TypeScript + Vite (the first project in this repo with a build
step).

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`. Open TODOs/ideas live in `notes.md`, not here (this
file is architecture, not a backlog).

## What this is

A minimal camera + chunked 2D tile-grid shell and nothing else:

- A 2D tile grid rendered as an **even/odd checkerboard** — a placeholder standing in for whatever a cloned
  project actually wants to draw per tile.
- A **camera** with world position (in tiles, fractional) and zoom (`tileSize` in px).
- **WASD** (+ arrow keys) pans the camera across the world at a constant speed, independent of zoom.
- **Mouse wheel** zooms anchored to the cursor position (the world point under the cursor stays put); **q/e**
  zoom anchored to the viewport center (no cursor position to anchor to). Both change `tileSize` (clamped
  `MIN_TILE_SIZE`–`MAX_TILE_SIZE`) — tiles get visually bigger/smaller rather than more/fewer tiles loading.
- **Mouse drag / touch** (no keyboard needed): left-click drag or one-finger drag pans 1:1 with the
  cursor/finger; two-finger pinch zooms anchored to the midpoint between the two fingers.
- **Chunked streaming**: the grid is divided into fixed-size chunks (`CHUNK_SIZE`); chunks touching the camera's
  visible bounds are loaded on demand, and a chunk not seen for `CHUNK_UNLOAD_DELAY_MS` gets unloaded. See
  `world/World.ts`.
- **Debug mode** (`r` to toggle, off by default): shows the HUD (tile size, camera position, loaded chunk count)
  and draws each loaded chunk's border, so chunk load/unload behavior is visible instead of just inferred from
  the checkerboard.
- **One real Wallpaper Engine property** (`slider_tilesize`, see `public/project.json` +
  `src/we/propertyListener.ts`): a minimal, typed reference for how a clone wires up the rest of its own
  properties — not a complete WE integration (no in-wallpaper GUI overlay, no other properties).

No terrain generation, no game logic — those are exactly the things a project cloned from here adds on top.

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
- **`core/Camera.ts`** — world position + `tileSize` (zoom level). `pan()`, `setTileSize()`/`zoomBy()` (clamped,
  `zoomBy` is relative to `setTileSize`), `zoomAtScreenPoint()` (zooms while keeping the world point under a given
  screen coordinate fixed — the math both wheel-zoom and pinch-zoom share), `getVisibleTileBounds()` (which world
  tiles are on screen), `worldToScreen()` (floors to whole CSS px so pixel-art tiles don't get seams).
- **`core/input.ts`** — `InputState` tracks currently-held keys and exposes a normalized WASD/arrow-key move
  vector sampled once per frame (dt-scaled, so diagonal movement isn't faster); `attachZoomControls()` wires
  wheel to `Camera.zoomAtScreenPoint()` (cursor-anchored) and q/e to `Camera.zoomBy()` (center-anchored, no cursor
  to anchor to); `attachMouseDragControls()` and `attachTouchControls()` wire left-click-drag / one-finger-touch
  straight to `Camera.pan()`, and two-finger pinch to `Camera.zoomAtScreenPoint()` anchored at the finger
  midpoint (no per-frame sampling for any of these — they react to `mousemove`/`touchmove` directly, since a
  drag/pinch is already a delta between two events rather than a held state).
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
- **`we/propertyListener.ts`** — `attachWallpaperPropertyListener(camera)` sets `window.wallpaperPropertyListener`,
  reading `slider_tilesize` and calling `camera.setTileSize()`. Declares the `Window.wallpaperPropertyListener`
  type via `declare global` since it's a Wallpaper Engine runtime global, not a standard DOM API. Must be set
  synchronously at startup (Wallpaper Engine can call `applyUserProperties` immediately on load) — `App`'s
  constructor does this directly, not inside a promise/timeout.
- **`public/project.json`** — Wallpaper Engine manifest with exactly one real property, `slider_tilesize` (min/max
  matching `MIN_TILE_SIZE`/`MAX_TILE_SIZE`). **Not derived from `propertyListener.ts`** — add/change a property in
  one place and you must update the other by hand, same gotcha `WorldGenerator/CLAUDE.md` flags for `Main.js`.

## Controls (dev/debug, not final)

`w`/`a`/`s`/`d` or arrow keys to pan. Wheel (cursor-anchored) or `q`/`e` (center-anchored) to zoom. `r` toggles
debug mode (HUD + chunk borders). Left-click drag or one-finger drag to pan, two-finger pinch to zoom anchored at
the finger midpoint (mouse/touch work standalone, no keyboard required).

## Working here

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`, a self-contained static bundle (includes `public/`
  verbatim) — this is what eventually gets pointed at from the Wallpaper Engine editor, once a clone is ready to
  publish.
- `npm run lint` — ESLint (flat config, `eslint.config.js`), `@eslint/js` + `typescript-eslint` recommended rules.
- `npm run format` / `npm run format:check` — Prettier (`.prettierrc.json`).
