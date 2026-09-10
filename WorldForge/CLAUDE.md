# WorldForge

**Status: Phase 1 in progress.** Next iteration after `InfinityWalker` — same chunked/zoomable presentation, but terrain generation replaces Wave Function Collapse with a Minecraft/Terraria-style noise+biome pipeline. TypeScript + Vite (the first project in this repo with a build step and runtime npm dependencies). See the full architecture rationale and open items in `.claude/plans` from the planning session, or just read the code below — it's small enough to be the source of truth now.

Entry point: `index.html` → `src/main.ts` → `src/core/App.ts`.

## Why this exists / what changed vs. InfinityWalker

`InfinityWalker`'s single height-noise-drives-everything approach produced overly mountain-heavy landscapes (no redistribution curve, no separate biome axis). This project fixes that with independent elevation/moisture/temperature noise channels + a tunable redistribution curve + a biome lookup table — see `src/world/climate/` and `src/world/biome/`.

**Key structural simplification**: because a tile's content depends only on its own world coordinates (pure noise functions), chunk generation needs none of InfinityWalker's WFC machinery — no neighbor-aware entropy propagation, no incremental per-frame collapse, no candidate sets. `Chunk` generates its full `CHUNK_SIZE x CHUNK_SIZE` grid in one direct pass (`src/world/generate/generateChunk.ts`).

## Architecture

- **`config/generationConfig.ts`** — the single tuning surface: seed, per-channel noise params (scale/octaves/persistence/lacunarity), and `elevationRedistributionExponent`. Mutable at runtime (DebugOverlay/future WE-property wiring mutate it directly); `ClimateSampler` reads it fresh on every sample except the noise permutation tables themselves, which only rebuild if `seed` changes.
- **`world/noise/`** — `simplexChannel.ts` wraps `simplex-noise` seeded via `alea`; `fbm.ts` layers octaves generically over any channel.
- **`world/climate/ClimateSampler.ts`** — samples 3 decorrelated channels (elevation/moisture/temperature) per world coordinate, applies `redistribution.ts`'s exponent curve to elevation before anything downstream sees it.
- **`world/biome/BiomeTable.ts`** — (elevation × moisture) → `BiomeId`. Temperature is sampled and stored per-tile but not yet in the lookup — a 3-axis table later is a change to this file only.
- **`world/biome/BiomeLayerTiles.ts`** — `BiomeId` → base tile + weighted deco candidates. This table is the actual "fewer tiles needed" mechanism the WFC tile catalogues used to require.
- **`world/tile/TileRegistry.ts`** — sprite coordinates reused from `InfinityWalker/img/tileset.png` (see that file's comment for provenance). `snowPeak`'s base tile is a placeholder (no snow art exists yet).
- **`world/tile/TransitionCatalog.ts` + `world/tile/autotile.ts`** — base-layer edge/corner tiles between biomes, **not** WFC: since a tile's material is already fully determined by noise (nothing to search for), this is the much simpler "autotiling" pattern (Wang tiles / blob tilesets) — a deterministic, non-backtracking lookup from a tile's 8 neighbor materials to a sprite. `TransitionCatalog.ts` is pure data, the 9 authored 14-slot transition sets ported verbatim from `InfinityWalker/js/tiles.js`'s `addTransitionRules` catalogue (only one side of each pair — the "featured" material — gets edge sprites; the other stays flat). `autotile.ts`'s `classifySlot`/`pickAutotileSprite` do the actual 8-neighbor-bitmask classification. Currently covers `grassland↔dryGrassland`, `grassland↔forest`, `beach↔grassland`, `badlands↔forest`, `mountainRock↔snowPeak` (plus `beach↔ocean`, unused until Phase 2); other biome-adjacency pairs (e.g. `beach↔forest`) have no authored art yet and fall back to dithering — see `WorldRenderer.resolveBaseSprite`. `BiomeLayerTiles.ts`'s base-material choices for `dryGrassland` (`grassLight`, not `grassDry`) and `snowPeak` (`stoneMid`, not `stoneDark`) were picked specifically to land on authored pairs — revisit if new art changes what's available.
- **`world/generate/borderBlend.ts`** — the one hashing primitive everything else builds on: `hashToUnitFloat(x, y, salt)` (same shape as InfinityWalker's `hash2D`) drives sprite-variant selection and deco density rolls — deterministic per-tile, so nothing flickers on re-render. Biome/material resolution itself (`generateChunk.ts`) is intentionally *not* jittered — `WorldRenderer` reads neighboring tiles' `base` directly for autotiling, which needs clean, unjittered values to classify correctly.
- **`world/chunk/{Chunk,WorldStreamer}.ts`** — `WorldStreamer` lazily creates/holds chunks keyed by `"cx,cy"` and unloads ones outside the camera's visible bounds. `reset()` drops everything (used after live-tuning `generationConfig`).
- **`world/grid/WorldTile.ts`** — the per-tile data contract. Has reserved-but-unset fields (`isWater`, `flowAccumulation`, `poiId`) so Phase 2 (rivers/lakes) and Phase 3 (villages/structures) are additive, not breaking, changes.
- **`world/poi/POIRegistry.ts`** — empty Phase 3 stub.
- **`core/Camera.ts`** — world position + `tileSize` (zoom level); `core/input.ts` wires wheel/`q`/`e` to it, same convention InfinityWalker used.
- **`render/`** — `TilesetImage` (sheet loader), `WorldRenderer` (draws visible tiles' base/overlay/deco), `DebugOverlay` (elevation/moisture heatmap + HUD, see Controls).
- **`we/propertyListener.ts`** — inert stub. `public/project.json` is a minimal manifest (no properties yet). Wallpaper Engine integration is explicitly deferred past Phase 1.

## Controls (dev/debug only, not final)

Wheel or `q`/`e` zoom (changes `Camera.tileSize`). `h` cycles the render mode: normal tiles → elevation heatmap → moisture heatmap → back. `[`/`]` live-adjust `elevationRedistributionExponent` (forces a chunk-cache reset) — this is the knob for "too many mountains."

## Roadmap (not yet implemented, see the planning session for detail)

- **Phase 2 — rivers/lakes**: must be chunk-safe (no whole-map flood-fill/steepest-descent walk, since the world is infinite/chunked) — most likely another deterministic per-coordinate function, or small-halo local sampling past chunk borders.
- **Phase 3 — villages/structures**: per-chunk/region POI scattering (Minecraft-style), reviving the footprint/tile-matrix/anchor-seed prefab design from `InfinityWalker/notes.txt` (that code no longer exists, only the design).
- **Wallpaper Engine integration**: fill in `public/project.json`'s `properties` + implement `we/propertyListener.ts`, following `WorldGenerator/js/Main.js`'s pattern (critically reviewed, per the root `CLAUDE.md`, since it may be dated).

## Working here

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc`) then produces `dist/`, a self-contained static bundle (includes `public/` verbatim) — this is what eventually gets pointed at from the Wallpaper Engine editor.
- `npm run lint` — ESLint (flat config, `eslint.config.js`), `@eslint/js` + `typescript-eslint` recommended rules.
- `npm run format` / `npm run format:check` — Prettier (`.prettierrc.json`).
