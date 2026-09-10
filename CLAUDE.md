# wallpaperEngine

Development repo for animated wallpapers published to **Wallpaper Engine (Steam)**. Most wallpapers here are self-contained, zero-build "web" wallpapers (plain HTML/CSS/JS, Canvas 2D) — `WorldForge` is the exception: TypeScript + Vite with a real build step (see its own `CLAUDE.md`).

## Layout

| Folder | Status | What it is |
|---|---|---|
| `WorldGenerator/` | Done, foundational | The original, complete project — procedural pixel-art landscape using Wave Function Collapse (WFC). Everything else started from here. See its own `CLAUDE.md`. Its Wallpaper Engine integration patterns are the oldest in the repo — question whether they're still the right approach before copying them into new work. |
| `InfinityWalker/` | Published, now paused | Iteration on `WorldGenerator`: an infinite scrolling world with a walking character, chunk-based layered WFC. A version of it is live on Steam, but local code was developed further after that publish and is currently ahead of the published Workshop version. Development is paused in favor of `WorldForge`. See its own `CLAUDE.md`. |
| `WorldForge/` | Active — Phase 1 | The current iteration: same chunked/zoomable presentation as InfinityWalker, but TypeScript + Vite and noise+biome terrain generation (Minecraft/Terraria-style) instead of WFC, aimed at eventually adding rivers/lakes and villages/structures. Not yet wired up to Wallpaper Engine (generation quality first). See its own `CLAUDE.md`. |
| `FirstTestStuff/` | Legacy / scratch | Early canvas experiments, not part of any shipped or active wallpaper. Ignore unless explicitly asked to revive it. |
| `DesignCorner/` | Assets | Photoshop (`.psd`) source projects, mainly used to rework/redesign the tilesets whose exports land in each wallpaper's `img/` folder. Binary, not code. |

Each wallpaper folder is meant to stand alone — there is no shared code between them (some duplication of concepts like WFC entropy collapse is intentional, not a refactor target, since InfinityWalker is a from-scratch redesign).

The lineage so far: `WorldGenerator` (done) → `InfinityWalker` (paused) → `WorldForge` (active). When planning new terrain-generation work, assume it belongs in `WorldForge` unless said otherwise.

## Wallpaper Engine integration

A wallpaper folder that's meant to be loaded by Wallpaper Engine needs:

- **`project.json`** — Wallpaper Engine's manifest. Declares `title`, entry `file` (the HTML file), and the **User Properties** panel Wallpaper Engine renders natively (checkboxes/sliders/combos/colors) with their `type`, `order`, `min`/`max`, and default `value`.
- A **`window.wallpaperPropertyListener.applyUserProperties(properties)`** hook in the JS, wired up in the main script. Wallpaper Engine calls this when the user changes a property in its native panel; the keys match the `project.json` property keys exactly (e.g. `slider_squaresize`, `combo_offset_x`). See `WorldGenerator/js/Main.js` for the full pattern.
- An optional in-wallpaper GUI (buttons/sliders drawn as HTML overlay) mirroring the same settings, for when the wallpaper is viewed outside Wallpaper Engine (e.g. directly in a browser) — `WorldGenerator` has this, `InfinityWalker` currently does not (keyboard-only controls, not yet wired to `project.json`/property listener since it's pre-release).

## Dev workflow

- No build step for `WorldGenerator`/`InfinityWalker`/`FirstTestStuff` — open the wallpaper's `.html` file directly in a browser (or serve the folder with any static server) to iterate. `WorldForge` is the exception: `npm run dev` for iteration, `npm run build` produces the `dist/` folder that actually gets published.
- **Publishing**: manual, via the Wallpaper Engine desktop editor — add the folder (or, for `WorldForge`, its `dist/` output) as a "Web" wallpaper project, verify the property panel against `project.json`, then publish to the Steam Workshop from inside the editor. There is no CLI/automated publish step in this repo.
- `preview.jpg`/`preview.gif` referenced by `project.json` (`"preview": "preview.jpg"`) is the Workshop thumbnail — regenerate it after visually significant changes if you're about to publish.

## Conventions

- Tile/pixel art assets live under each project's `img/`; PSD sources live in `DesignCorner/`.
- German is used freely in code comments, `notes.txt` TODO files, and commit context — don't translate it away.
- Each project keeps its own running TODO/notes file (`notes.txt`) instead of GitHub issues — check it before starting work in that folder.
