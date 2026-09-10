# WorldGenerator

**Status: done.** This is the original, complete project — where everything in this repo started (`WorldGenerator` → `InfinityWalker` → next project). It's not under active development, but its patterns (WFC, Wallpaper Engine property wiring, GUI) are what later projects were built from or against — when reusing something from here, check it's still the intended approach rather than copying it as gospel; some of it (especially the Wallpaper Engine integration below) may be outdated compared to how newer wallpapers are expected to work.

Published Wallpaper Engine wallpaper. Generates a random Pokémon-style pixel-art landscape using classic **Wave Function Collapse (WFC)** over a flat 2D grid, then idles until the user reloads or "Autostart" kicks in.

Entry point: `worldGenerator.html` → `js/Main.js`.

## Architecture

- **`Main.js`** — everything glue-related: creates/positions the in-wallpaper HTML GUI (buttons, sliders, radios) by hand (absolute-positioned, scaled by `GUI_SIZE`), owns the `requestAnimationFrame` loop, and implements `window.wallpaperPropertyListener.applyUserProperties` to map Wallpaper Engine's native property panel (see `../project.json`) onto the same internal state as the in-wallpaper GUI. Treat this file as the reference implementation for how a `project.json` property key maps to in-wallpaper behavior.
- **`World.js`** — owns a `width x height` grid of `WorldPiece`s. `nextWorldPiece()` is the WFC step: finds the piece(s) with lowest entropy (fewest remaining possible tiles) and collapses one per call, driven externally by `Main.js`'s tick loop (rate-limited by the `Tickrate` slider). `Accuracy` controls how far a piece propagates entropy updates to neighbors (`WorldPiece.accuracy`, see `callNeighbors`) — lower accuracy = faster but more visible generation artifacts (marked red as `isErrorState` when a piece runs out of valid tiles).
- **`WorldPiece.js`** — one grid cell. Holds `possibleTiles` (candidates), collapses to a single `tile` + `rule` (a `Rule` picks which of a tile's 4 edges must match which neighbor). `isErrorState` pieces (contradictions) are drawn with a red outline instead of crashing.
- **`Tiles.js`** — the tile/rule registry: `Tile` (image coordinates in `img/tileset.png`, `weight`, `rules`), `Rule` (the 4 edge-compatibility values + optional base-layer stack for transparent overlay tiles), and the actual tile set data + `tileTypes` array WFC picks from. This is the file to edit to add new tiles (see "Neue Tiles" in `js/notes.txt`) — most of its size is data, not logic.

## Highlight modes (Wallpaper Engine feature)

Users can drag-select a rectangle on the wallpaper:
- **FREEZE_MODE** — the selected area is kept as-is when the world regenerates/reloads; everything else regenerates.
- **WRITE_MODE** — the selected area is forced to a single (random) tile type, and its immediate neighborhood is constrained to exclude that tile, before the rest of the world generates around it.

Both are implemented in `World.createWorld(withClear)` in `World.js`.

## Working here

- No build step — edit and reload `worldGenerator.html` in a browser, or in Wallpaper Engine's editor for property-panel testing.
- If you change a slider/checkbox/combo, or its `min`/`max`/default, update **both** `project.json` and the corresponding `case` in `Main.js`'s `applyUserProperties`/`sliderHandler` — they're not derived from each other.
- Known open items are tracked in `js/notes.txt` (currently: general balancing, a clock-mode idea, a "Treppe" (stairs) tile).
