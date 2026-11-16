# WorldNoise

**Status: active (cloned from `TileGridBase` 2026-09-14).** Elevation, moisture and temperature noise, biome table, autotiled
ground, cliffs, roads and the first towns exist; the plan and what is still open are in `idea.md`. Next in the lineage after
`WorldGenerator` (done, WFC) → `InfinityWalker` (paused, chunked WFC) → `TileGridBase` (active base) →
**`WorldNoise`**. This is the noise-based world-generation fork `TileGridBase/CLAUDE.md` lists (originally scoped under the working name `WorldForge` before the 2026-09-13 reset that turned
`TileGridBase` into a generic, reusable base — see that project's `CLAUDE.md` and git history before the reset
for the torn-out reference implementation).

Being built step by step in small increments rather than all at once — the ticked steps of `idea.md` show the current state
(`notes.md` is the user's older log and lags behind).

## Goal

Replace `TileGridBase`'s placeholder even/odd checkerboard with real procedurally generated terrain, using
**noise instead of Wave Function Collapse** (the approach `WorldGenerator`/`InfinityWalker` used):

- Independent **elevation / moisture / temperature** noise channels (likely layered/fractal noise per channel).
- A **redistribution curve** applied to raw noise so elevation isn't flat-distributed (more lowland/highland,
  less mid-value mush).
- A **biome lookup table** (Minecraft/Terraria-style) mapping `(elevation, moisture, temperature)` → biome →
  tile appearance.

All three channels (elevation with its redistribution curve and height levels, moisture, temperature) and the biome
lookup table exist, and tiles are drawn with autotiled grounds, cliffs, roads and the first town buildings. Stairs, the town
road layout, decoration, own art and the Wallpaper Engine properties are still to come (`idea.md`).

## Inherited from `TileGridBase` (unchanged)

Camera (pan/zoom, cursor/pinch-anchored zoom), chunked tile streaming, debug mode (`r`, HUD + chunk borders),
mouse-drag/touch pan and pinch-zoom, and the confirmed finding that **keyboard input doesn't reach an applied
desktop wallpaper — only mouse/touch and WE properties do**. `world/World.ts` in particular is currently
byte-identical to `TileGridBase`'s. See `TileGridBase/CLAUDE.md` for the full writeup — not re-documented here.

## Architecture (additions on top of TileGridBase)

Idea and plan: `idea.md`. Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

Following the same split `ColorWar` uses: new, fork-specific logic lives in its own top-level folder (`src/elevation/`, `src/moisture/`, `src/temperature/`,
`src/biome/`, `src/tileset/`, `src/skeleton/`, `src/road/`, `src/town/`) rather than growing
the inherited `core`/`world` classes — those only get small additive changes (a new field, an extra import),
nothing restructured.

## Where to read

Fork-specific code lives in `src/<topic>/` folders; the docs follow the same split. Read only the doc the task touches.
New topic: new file in `docs/` and a row here.

| Task | Doc |
|---|---|
| Noise channels, redistribution, biome table, height levels, cliff type rule | [docs/terrain.md](docs/terrain.md) |
| Autotile rules, grounds and their rank, sheets, animated water, cliff art | [docs/tileset.md](docs/tileset.md) |
| Cell grid, graph of nodes and edges, road curve, road mask | [docs/roads.md](docs/roads.md) |
| Town shapes, placement, plateau and outline, buildings and layout, town nodes | [docs/towns.md](docs/towns.md) |
| `Tile`, `Chunk`, `WorldRenderer`, Wallpaper Engine properties | [docs/world-and-render.md](docs/world-and-render.md) |
| Plan, design reasons, open questions | [idea.md](idea.md) |

## Controls (dev/debug, unchanged from TileGridBase for now)

`w`/`a`/`s`/`d`/arrows pan (shift sprints), wheel/`q`/`e` zoom, `r` toggles debug HUD + chunk borders, mouse-drag/
touch pan, pinch zoom. **Keyboard only works while developing** — once applied as a real desktop wallpaper, only
mouse/touch and WE properties reach the page (confirmed via `TileGridBase`, see [wallpaper-engine-integration](../docs/wallpaper-engine-integration.md)).

## Agent workflow (temporary, this project only)

While `WorldNoise` is implemented from the plan in `idea.md`, the agent may, without asking each time, run this loop per
feature: feature branch, commits, `npm run lint` / `build` / `format:check` before each commit, screenshot for visual steps,
push, PR, review by a read-only subagent (diff and goal, not conclusions), fix real findings, squash merge, next feature.
This overrides the root rule "never push unless asked" for `WorldNoise/` only; it applies to no other project. The agent stops
and asks when a step is impossible or a design decision is open, and never implements on guesses. The user ends this section
when the implementation phase is over; then it is deleted.

## Working here

Same scripts as `TileGridBase`:

- `npm install` — first-time setup (not carried over from the clone; `node_modules`/`dist` were excluded on
  purpose).
- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`.
- `npm run lint` / `npm run format` — ESLint / Prettier, same configs as `TileGridBase`.
- Development assets: copy `sea-deep`, `sea-without-shore`, `sand`, `light-grass`, `dirt`, `gravel`, `white-path` and
  `brick-path` (all `.png`; from the Essentials v19.1 `Graphics/Autotiles/`: `Sea deep`, `Sea without shore`, `Sand`,
  `Light grass`, `Dirt`, `Gravel`, `White path`, `Brick path`) into `WorldNoise/dev-assets/autotiles/`, and
  `InfinityWalker/img/tileset.png` as `WorldNoise/dev-assets/tilesets/infinitywalker.png`. The folder is git-ignored on purpose: these
  graphics come from Nintendo games and are not cleared for publishing, so they are replaced before any publish. A
  build made while the folder exists carries them in `dist/` (Vite inlines files under 4 KB into the JS bundle as data
  URIs, larger ones are copied), and `dist/` is what Wallpaper Engine loads: publish only a build made without the
  folder.
