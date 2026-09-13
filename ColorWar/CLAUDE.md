# ColorWar

**Status: Phase 1 implemented (2026-09-13), cloned from `TileGridBase`.** Working title, may change. Unlike
`TileGridBase`, this one is meant to become an actual wallpaper, not a base for further clones.

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`. Open TODOs/ideas live in `notes.md`, not here.

## Concept

A tile grid where each tile is one of **three colors (red/green/blue) or `none`**, cyclically dominant — red beats
green, green beats blue, blue beats red — closer to a Rock-Paper-Scissors cellular automaton than to Conway's Game
of Life, despite the original working name for this fork.

- **Update rule**, once per tick: for every tile with a color (not `none`), if any of its 4 orthogonal neighbors
  (N/E/S/W, no diagonals) has the one color that beats it, the tile becomes that color. All tiles are checked
  against a snapshot of the _previous_ tick's colors and only updated afterward — a change never affects another
  tile's check within the same tick, so there's no cascading/recursion.
- **`none` is inert** — never beaten, so it never spreads or gets overwritten by the automaton. The grid starts
  entirely `none` and only gets colors from the player clicking/tapping a tile.
- **Click/tap a tile** to advance it one step in the same cycle: `none → red → green → blue → red → ...`.
- **Tick rate** defaults to 1000ms, live-adjustable via the `slider_tickrate` Wallpaper Engine property.
- **Chunk unload/reload resets a chunk's colors to `none`** (decided 2026-09-13) — colors do not persist once a
  chunk scrolls out of view long enough to unload. Simpler than a persistent color store; accepted tradeoff.
- **Unloaded neighbors count as `none`/inert** for the update rule — a tile at the edge of the currently-loaded
  region can't be beaten by a color sitting in a not-yet-loaded neighboring chunk. This is a deliberate
  simplification (not asked about explicitly), not perfectly "infinite-grid correct" at chunk edges.

Extending to more colors later is meant to be a one-line change (`CYCLE` in `simulation/Color.ts`) — nothing else
references specific colors by name. A more complex update rule (e.g. threshold/majority-based instead of
any-single-neighbor) only requires rewriting `ColorSimulation.step()`, not touching `Color.ts`, `Tile.ts`, or the
click handler.

## Inherited from `TileGridBase` (unchanged)

Camera (pan/zoom, cursor/pinch-anchored zoom), chunked tile streaming, debug mode (`r`, HUD + chunk borders),
mouse-drag/touch pan and pinch-zoom, and the confirmed finding that **keyboard input doesn't reach an applied
desktop wallpaper — only mouse/touch and WE properties do** (tested on `TileGridBase`, applies here unchanged).
See `TileGridBase/CLAUDE.md` for the full writeup — not re-documented here; check there first if this file feels
thin on a topic.

## Architecture (additions on top of `TileGridBase`)

All new simulation logic lives under `src/simulation/`, kept separate from the inherited camera/chunk/input code
so the base stays close to `TileGridBase`'s own version — only `world/Tile.ts`, `world/Chunk.ts`, `world/World.ts`,
`core/Camera.ts`, `core/App.ts`, and `we/propertyListener.ts` got small additive changes (new fields/methods),
nothing restructured.

- **`simulation/Color.ts`** — `TileColor` (`'none' | 'red' | 'green' | 'blue'`), the `CYCLE` array the whole
  dominance/click-advance relationship is derived from, `nextInCycle()` (click-advance), `beatingColor()` (what
  overwrites a given color, or `null` for `none`), and `colorHex()` for drawing. The one file to touch to add
  colors or rebalance the cycle.
- **`simulation/ColorSimulation.ts`** — owns `tickIntervalMs` (public, like `Camera.tileSize`; set it directly or
  clamped via `setTickIntervalMs()`) and an accumulator; `update(dtMs, world)` is called every frame from
  `App.update()` and only actually steps the simulation once `dtMs` has accumulated past `tickIntervalMs`. `step()`
  is the synchronous update pass described above.
- **`simulation/tileClickControls.ts`** — `attachTileClickControls(camera, target, world)`. Fully independent of
  `core/input.ts`'s `attachMouseDragControls`/`attachTouchControls` (both still own pan/pinch untouched) — this
  adds its own `mousedown`/`mouseup`/`touchstart`/`touchend` listeners on the same canvas and distinguishes a
  click/tap from a drag purely by how far the pointer moved between down and up (`CLICK_MOVE_TOLERANCE_PX`).
- **`world/Tile.ts`** — now holds a mutable `color: TileColor` (default `'none'`) and `draw()` fills flat with
  `colorHex(this.color)` instead of the inherited checkerboard. This is exactly the extension point
  `TileGridBase/CLAUDE.md` describes this file as.
- **`world/Chunk.ts`** — added `getLocalTile(localX, localY)` (flat-array index helper) so `World` can do
  neighbor lookups without `Chunk` needing to know about the simulation at all.
- **`world/World.ts`** — added `getLoadedTile(worldX, worldY)` (chunk-math + `getLocalTile`, returns `null` past
  the loaded region — never creates a chunk) and `getLoadedChunks()` (iterator over everything currently loaded,
  for `ColorSimulation` to iterate every tick).
- **`core/Camera.ts`** — added `screenToWorld()`, the exact inverse of `worldToScreen()`, so a click's screen
  coordinate can be mapped back to a world tile.
- **`we/propertyListener.ts`** — now also takes a `ColorSimulation` and reads `slider_tickrate`, calling
  `setTickIntervalMs()`. Same "not derived from `project.json`, keep both in sync by hand" caveat as
  `slider_tilesize` (see `TileGridBase/CLAUDE.md`).
- **`public/project.json`** — added `slider_tickrate` (100–5000ms, default 1000) alongside the inherited
  `slider_tilesize`.

## Controls

Same as `TileGridBase` (WASD/q,e/`r` dev-only; mouse-drag/wheel, touch, and WE properties work live) **plus**:
left-click or single-finger tap on a tile advances its color (`none → red → green → blue → red → ...`). A
drag/pinch beyond `CLICK_MOVE_TOLERANCE_PX` doesn't count as a click.

## Working here

Same as `TileGridBase`: `npm run dev`, `npm run build` (→ `dist/`, point the WE editor at `dist/index.html`
directly), `npm run lint`, `npm run format`.
