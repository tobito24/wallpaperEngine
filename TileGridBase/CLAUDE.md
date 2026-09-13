# TileGridBase

**Status: base/template project (reset 2026-09-13).** Not itself a wallpaper — a reusable starting point for any
2D tile-grid idea in this repo. To start a new project, **clone this folder** rather than building the
camera/grid/input plumbing from scratch again. TypeScript + Vite (the first project in this repo with a build
step).

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

## What this is

A minimal camera + 2D tile-grid shell and nothing else:

- A 2D tile grid rendered as an **even/odd checkerboard** — a placeholder standing in for whatever a cloned
  project actually wants to draw per tile.
- A **camera** with world position (in tiles, fractional) and zoom (`tileSize` in px).
- **WASD** (+ arrow keys) pans the camera across the world at a constant speed, independent of zoom.
- **Mouse wheel / q,e** zoom by changing `tileSize` (clamped `MIN_TILE_SIZE`–`MAX_TILE_SIZE`), i.e. tiles get
  visually bigger/smaller rather than more/fewer tiles being loaded.

No terrain generation, no game logic, no chunk streaming, no Wallpaper Engine wiring — those are exactly the
things a project cloned from here adds on top.

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

- **`config/constants.ts`** — `TILE_SIZE_DEFAULT`/`MIN_TILE_SIZE`/`MAX_TILE_SIZE` (zoom range), `ZOOM_STEP`,
  `PAN_SPEED` (world tiles/sec).
- **`core/Camera.ts`** — world position + `tileSize` (zoom level). `pan()`, `zoomBy()`, `getVisibleTileBounds()`
  (which world tiles are on screen), `worldToScreen()` (floors to whole CSS px so pixel-art tiles don't get seams).
- **`core/input.ts`** — `InputState` tracks currently-held keys and exposes a normalized WASD/arrow-key move
  vector sampled once per frame (dt-scaled, so diagonal movement isn't faster); `attachZoomControls()` wires
  wheel/q/e straight to `Camera.zoomBy()`.
- **`core/App.ts`** — owns the canvas, camera, input, and render loop (`requestAnimationFrame`, dt-clamped).
  Draws a tiny HUD (tile size, camera position) for dev feedback.
- **`render/WorldRenderer.ts`** — the checkerboard: for each visible world tile (from
  `Camera.getVisibleTileBounds`), fills a rect colored by `(tx + ty) % 2`. This is the file a clone replaces
  wholesale with its own per-tile rendering.
- **`public/project.json`** — minimal Wallpaper Engine manifest (no properties yet). Wallpaper Engine integration
  is left to whatever concrete project gets cloned from here.

## Controls (dev/debug, not final)

`w`/`a`/`s`/`d` or arrow keys to pan. Wheel or `q`/`e` to zoom.

## Working here

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`, a self-contained static bundle (includes `public/`
  verbatim) — this is what eventually gets pointed at from the Wallpaper Engine editor, once a clone is ready to
  publish.
- `npm run lint` — ESLint (flat config, `eslint.config.js`), `@eslint/js` + `typescript-eslint` recommended rules.
- `npm run format` / `npm run format:check` — Prettier (`.prettierrc.json`).
