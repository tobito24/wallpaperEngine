# ColorWar

**Status: Published to the Steam Workshop as two separate listings, "ColorWar" (original 3-color version) and
"ColorWar: Rainbow" (7-color version) — both currently pending Wallpaper Engine's automatic anti-spam check**,
which hides newly-uploaded web wallpapers until it clears (usually within a few hours, see
<https://help.wallpaperengine.io/en/interface/exclude.html>; no action needed, just wait). Done for now barring a
new idea for it. Working title, may change. Unlike `TileGridBase`, this one is meant to become an actual
wallpaper, not a base for further clones.

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`. Open TODOs/ideas live in `notes.md`, not here.

## Concept

A tile grid where each tile is one of **three colors (red/green/blue) or `none`**, cyclically dominant — red beats
green, green beats blue, blue beats red — closer to a Rock-Paper-Scissors cellular automaton than to Conway's Game
of Life, despite the original working name for this fork.

- **Update rule**, once per tick: for every tile with a color (not `none`), if any of its 4 orthogonal neighbors
  (N/E/S/W, no diagonals) has the one color that beats it, the tile becomes that color. All tiles are checked
  against a snapshot of the _previous_ tick's colors and only updated afterward — a change never affects another
  tile's check within the same tick, so there's no cascading/recursion.
- **`none` is inert** — never beaten, so it never spreads or gets overwritten by the automaton. Beyond the chosen
  starting pattern (see below), colors only otherwise change from the player clicking/tapping a tile.
- **Click/tap a tile** to advance it one step in the same cycle: `none → red → green → blue → red → ...`.
- **Tick rate** defaults to 1000ms, live-adjustable via the `slider_tickrate` Wallpaper Engine property.
- **Starting pattern presets** (added 2026-09-14) — `combo_preset` (`empty`/`speckle`/`sectors`/`stripes`/`rings`)
  picks a deterministic function of world tile coordinates that seeds a tile's initial color, instead of every
  tile always starting `none`. `empty` (the default) is the original click-to-draw blank canvas.
- **Chunk unload/reload regenerates a chunk from the current preset** (updated 2026-09-14, was "resets to `none`"
  before presets existed) — a chunk's simulated progress is lost once it scrolls out of view long enough to
  unload, same tradeoff as before, but it now reappears as the preset's pattern rather than always blank. Because
  `presetColorAt()` is a pure function of `(worldX, worldY)`, this is also what makes a preset look identical
  across reloads instead of reshuffling.
- **Changing the preset live regenerates every currently loaded chunk immediately** (`World.setPreset()`), not
  just chunks scrolled into view afterward — matches how `slider_tilesize`/`slider_tickrate` already apply
  instantly. **Also recenters the camera to world position `(0, 0)`** (`Camera.resetPosition()`, added
  2026-09-14) — a preset is defined relative to world-origin coordinates (see `presetColorAt()`), so panning away
  first would make the new pattern look off-center or cut off. Both places that call `world.setPreset()` (the WE
  `combo_preset` property in `we/propertyListener.ts` and the dev-only number-key shortcut in
  `tileClickControls.ts`) call `camera.resetPosition()` right after — there's no single shared call site for
  "change preset" to hook this into instead.
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

- **`simulation/Color.ts`** — `TileColor` (`'none' | 'red' | 'green' | 'blue'`), the exported `CYCLE` array the
  whole dominance/click-advance relationship (and the presets below) is derived from, `nextInCycle()`
  (click-advance), `beatingColor()` (what overwrites a given color, or `null` for `none`), and `colorHex()` for
  drawing. The one file to touch to add colors or rebalance the cycle.
- **`simulation/presets.ts`** — `WorldPreset` (`'empty' | 'speckle' | 'sectors' | 'stripes' | 'rings'`) and
  `presetColorAt(preset, worldX, worldY)`, a pure function deriving a tile's starting color from its coordinates
  and `CYCLE` (never hardcodes a color name, same rule as the rest of the simulation code). `speckle` uses a
  hashed-coordinate pseudo-random (not `Math.random()`) specifically so it's reproducible across reloads.
  `isWorldPreset()` guards the untyped string coming from the WE combo property.
- **`simulation/ColorSimulation.ts`** — owns `tickIntervalMs` (public, like `Camera.tileSize`; set it directly or
  clamped via `setTickIntervalMs()`) and an accumulator; `update(dtMs, world)` is called every frame from
  `App.update()` and only actually steps the simulation once `dtMs` has accumulated past `tickIntervalMs`. `step()`
  is the synchronous update pass described above.
- **`simulation/tileClickControls.ts`** — `attachTileClickControls(camera, target, world)`. Fully independent of
  `core/input.ts`'s `attachMouseDragControls`/`attachTouchControls` (both still own pan/pinch untouched) — this
  adds its own `mousedown`/`mouseup`/`touchstart`/`touchend` listeners on the same canvas and distinguishes a
  click/tap from a drag purely by how far the pointer moved between down and up (`CLICK_MOVE_TOLERANCE_PX`).
- **`world/Tile.ts`** — now holds a mutable `color: TileColor`, constructor-settable (default `'none'`), and
  `draw()` fills flat with `colorHex(this.color)` instead of the inherited checkerboard. This is exactly the
  extension point `TileGridBase/CLAUDE.md` describes this file as.
- **`world/Chunk.ts`** — added `getLocalTile(localX, localY)` (flat-array index helper) so `World` can do
  neighbor lookups without `Chunk` needing to know about the simulation at all. Constructor now also takes a
  `WorldPreset` and seeds each `Tile`'s color from `presetColorAt()`; `applyPreset(preset)` re-seeds every tile
  in-place (used when the preset changes live, see `World.setPreset()`).
- **`world/World.ts`** — added `getLoadedTile(worldX, worldY)` (chunk-math + `getLocalTile`, returns `null` past
  the loaded region — never creates a chunk) and `getLoadedChunks()` (iterator over everything currently loaded,
  for `ColorSimulation` to iterate every tick). Now also owns the current `WorldPreset` (default `'empty'`),
  passed to every new `Chunk`; `setPreset()` updates it and calls `chunk.applyPreset()` on everything already
  loaded.
- **`core/Camera.ts`** — added `screenToWorld()`, the exact inverse of `worldToScreen()`, so a click's screen
  coordinate can be mapped back to a world tile.
- **`we/propertyListener.ts`** — now also takes a `ColorSimulation` and a `World`, reading `slider_tickrate`
  (→ `setTickIntervalMs()`) and `combo_preset` (→ `world.setPreset()`, guarded by `isWorldPreset()`). Same "not
  derived from `project.json`, keep both in sync by hand" caveat as `slider_tilesize` (see `TileGridBase/CLAUDE.md`).
- **`public/project.json`** — added `slider_tickrate` (100–5000ms, default 1000) and `combo_preset` (5 options,
  default `empty`) alongside the inherited `slider_tilesize`.

## Controls

Same as `TileGridBase` (WASD/q,e/`r` dev-only; mouse-drag/wheel, touch, and WE properties work live) **plus**:
left-click or single-finger tap on a tile advances its color (`none → red → green → blue → red → ...`). A
drag/pinch beyond `CLICK_MOVE_TOLERANCE_PX` doesn't count as a click.

Also dev-only (same reason as WASD/q,e/`r` — doesn't reach an applied wallpaper): number keys **1–5** jump straight
to a preset (`attachTileClickControls`'s `onKeyDown`, indexing `WORLD_PRESETS` from `simulation/presets.ts`) —
1=empty, 2=speckle, 3=sectors, 4=stripes, 5=rings. A quick way to flip through presets without opening the WE
editor's property panel; `combo_preset` is still the only way that reaches a published wallpaper.

## Working here

Same as `TileGridBase`: `npm run dev`, `npm run build` (→ `dist/`, point the WE editor at `dist/index.html`
directly), `npm run lint`, `npm run format`.
