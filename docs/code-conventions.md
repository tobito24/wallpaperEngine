# Code conventions

- **Comments:** avoid them. First ask whether a better name says it. A genuinely needed comment is minimal (a unit like `ms`). The
  older no-build projects contain many comments; they are removed when the code around them is touched, not in a sweep.
- **Language:** code, identifiers, commits and docs are English. `notes.md` is the user's scratch space and may stay German; do not
  translate it.
- **Formatting:** 2 spaces, Prettier and ESLint as configured in each Vite project. ESM everywhere.
- **TypeScript projects:** strict mode; no `any` to silence a type, fix the type.
- **Constants:** tunables live in one place (`config/constants.ts` or `config.js`), not as magic numbers. A value that mirrors a
  `project.json` range says so in its name or its doc, and both change together
  ([wallpaper-engine-integration.md](wallpaper-engine-integration.md)).
- **Fork structure (Vite projects):** fork-specific logic lives in its own top-level folder under `src/` (`simulation/`, `elevation/`),
  separate from the inherited `core/`, `world/`, `render/`, `we/`. The inherited files only get small additive changes, so a fork
  stays close to its base.
- **Owns its appearance:** a tile draws itself (`Tile.draw()`); callers never read tile fields to decide how to render it.
- **Determinism:** generation is a pure function of seed and world coordinates, never `Math.random()`, so a world looks the same after
  a reload and nothing needs to be stored.
- **Assets:** tile art lives in each project's `img/`; Photoshop sources live in `DesignCorner/`.
- **Changing existing code:** change the definition and every caller in the same change; no adapter, optional parameter or fallback
  to keep an old shape alive.
