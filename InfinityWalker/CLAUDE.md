# InfinityWalker

**Status: paused.** A version is published on Steam, but local code was developed further afterward and is ahead of that published Workshop build. Development is on ice while a next-generation approach is tried in a separate, not-yet-started project — treat InfinityWalker as a finished iteration step (`WorldGenerator` → `InfinityWalker` → next project), not as something to actively continue unless told otherwise.

A sprite walks through an infinite, procedurally generated top-down world; the camera follows the character instead of the world being a static generated image (unlike `WorldGenerator`). ES modules throughout (`type="module"`), no build step.

Entry point: `infinitywalker.html` → `js/main.js`.

## Scope history

Originally conceived as an RPG-like game you could freely walk around in, but that went out of scope. The focus shifted to (and the project is now mainly valued for) **much faster world generation** than `WorldGenerator`'s classic WFC — the chunked, layered, time-budgeted approach here exists to solve that speed problem, not to support gameplay.

## Known design problem

Generation leans heavily on height levels (`config.js`: `HEIGHT_LEVELS`/`HEIGHT_NOISE_SCALE`/`HEIGHT_NOISE_OCTAVES`, `utility/getHeightLevel.js`), which tends to produce very mountain-heavy landscapes — considered not visually pleasing enough as-is. If resuming or referencing this approach, this is the main aesthetic issue to solve, not just a balancing tweak.

## Architecture

- **`config.js`** — all tunables in one place (tile size, chunk size, WFC accuracy/time budget, player speed/auto-move behavior, direction/layer/state enums). Read this first when changing behavior; almost nothing is a magic number elsewhere.
- **`main.js`** — render loop, camera (centers on the player, `Math.floor`'d for pixel-perfect alignment — see git history for why `Math.round` was replaced), resize handling, and raw keyboard/wheel input. No Wallpaper Engine `project.json`/`wallpaperPropertyListener` wiring yet — this project isn't exposed to Wallpaper Engine's native property panel yet.
- **`world.js` (`World`)** — holds loaded `Chunk`s in a `Map` keyed by `"cx,cy"`, lazily creating chunks (and their 4 neighbors) around the player. Processes at most one chunk at a time from a `chunkQueue`, spending up to `WFC_TIME_BUDGET_MS` per frame collapsing pieces (`processChunkQueue`) — this is what makes generation stream in without hitching.
- **`chunk.js` (`Chunk`)** — a `CHUNK_SIZE x CHUNK_SIZE` grid of `WorldPiece`s. Generation is **layered**, one full layer at a time per chunk: `BASE_GENERATING` → `OVERLAY_GENERATING` → `DECO_GENERATING` → `COLLAPSED`, tracked via `chunkState` and three candidate sets (`baseCandidates`/`overlayCandidates`/`decoCandidates`). `collapseRandomPiece()` always collapses the current layer's lowest-entropy piece next (classic WFC), moving pieces between candidate sets as their state advances.
- **`piece.js` (`WorldPiece`)** — one tile's worth of state across all 3 layers (`baseTile`/`overlayTile`/`decoTile`, each with its own possibility list and edge-compatibility bitmask). Height (`getHeightLevel`) and cliff detection (`getCliffType`, from `utility/getHeightLevel.js`) are computed once at construction from world coordinates (deterministic noise, not stored per-chunk), and force the overlay tile on cliff edges before WFC even runs.
- **`tiles.js`** — tile/rule data for all 3 layers (`baseTiles`, `overlayTiles`, `decoTiles`), edge compatibility as `BigInt` bitmasks (`edgeMasks`) rather than the string-edge comparison `WorldGenerator` uses — faster compatibility checks, but a different mental model if you're used to `WorldGenerator/js/Tiles.js`.
- **`player.js` (`Player`)** — position + auto-wander (randomly drifts its direction vector, see `PLAYER_AUTO_DIRECTION_CHANGE_INTERVAL`/`PLAYER_MAX_DIRECTION_CHANGE_ANGLE`) or WASD/arrow-key manual control; `worldX`/`worldY` (rounded) is what the world/camera actually track.

## Controls (current, keyboard-only)

`WASD`/arrows move, `space` toggles auto-move, `+`/`-` (or `c`/`x`, `1`/`2`) change speed, `q`/`e` or mouse wheel change tile size (zoom), `r` (on keyup) toggles debug overlay (`IS_DEBUG_MODE` — shows error/collapsed-state markers on tiles).

## Known gaps / in-progress

- `js/notes.txt` is the authoritative TODO list for this project — check it before starting work here. It currently lists: re-implementing all tiles, general balancing, zoom-adjusts-tile-size polish, and biome-subset WFC performance work.
- The notes describe a **prefab-stamping system** (for placing large multi-tile decorations deterministically via a world-coordinate seed) as a designed feature, and a commit (`dbc73d1`) once added it — but there is currently no `prefab`/`stamp` code in `js/`. If picking this up, check `git log` around that commit rather than assuming it's still present; it looks like it was removed or never finished during the later refactors.
- No Wallpaper Engine property panel integration yet (see `main.js` note above) — needed before this can ship like `WorldGenerator` did.
