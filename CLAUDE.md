# wallpaperEngine

Development repo for animated wallpapers published to **Wallpaper Engine (Steam)**. Most wallpapers here are self-contained, zero-build "web" wallpapers (plain HTML/CSS/JS, Canvas 2D) — `TileGridBase` (and anything cloned from it) is the exception: TypeScript + Vite with a real build step (see its own `CLAUDE.md`).

## Layout

| Folder | Status | What it is |
|---|---|---|
| `WorldGenerator/` | Done, foundational | The original, complete project — procedural pixel-art landscape using Wave Function Collapse (WFC). Everything else started from here. See its own `CLAUDE.md`. Its Wallpaper Engine integration patterns are the oldest in the repo — question whether they're still the right approach before copying them into new work. |
| `InfinityWalker/` | Published, now paused | Iteration on `WorldGenerator`: an infinite scrolling world with a walking character, chunk-based layered WFC. A version of it is live on Steam, but local code was developed further after that publish and is currently ahead of the published Workshop version. Development is paused. See its own `CLAUDE.md`. |
| `TileGridBase/` | Active — base/template, not a wallpaper itself | A reusable base for any 2D tile-grid project: camera (pan + zoom, tile size in px) over a tile grid, TypeScript + Vite. Meant to be **cloned** as the starting point for new projects rather than developed into a wallpaper directly. Current work: refining the camera controls. Planned clones: a noise/biome terrain-generation wallpaper (successor to `InfinityWalker`, this project's original scope under the name `WorldForge` before its 2026-09-13 reset to a generic base) and a Game-of-Life-style wallpaper. See its own `CLAUDE.md`. |
| `FirstTestStuff/` | Legacy / scratch | Early canvas experiments, not part of any shipped or active wallpaper. Ignore unless explicitly asked to revive it. |
| `DesignCorner/` | Assets | Photoshop (`.psd`) source projects, mainly used to rework/redesign the tilesets whose exports land in each wallpaper's `img/` folder. Binary, not code. |

Each wallpaper folder is meant to stand alone — there is no shared code between them (some duplication of concepts like WFC entropy collapse is intentional, not a refactor target, since InfinityWalker is a from-scratch redesign). `TileGridBase` is the one exception to "stand alone": it's explicitly meant to be duplicated, so its camera/grid/input code is expected to show up again, cloned, in whatever gets built from it.

The lineage so far: `WorldGenerator` (done) → `InfinityWalker` (paused) → `TileGridBase` (active, base/template). When planning new terrain-generation work, that most likely means cloning `TileGridBase` into a new project, not building directly inside `TileGridBase` itself — see its `CLAUDE.md` for the planned forks.

## Wallpaper Engine integration

A wallpaper folder that's meant to be loaded by Wallpaper Engine needs:

- **`project.json`** — Wallpaper Engine's manifest. Declares `title`, entry `file` (the HTML file), and the **User Properties** panel Wallpaper Engine renders natively (checkboxes/sliders/combos/colors) with their `type`, `order`, `min`/`max`, and default `value`.
- A **`window.wallpaperPropertyListener.applyUserProperties(properties)`** hook in the JS, wired up in the main script. Wallpaper Engine calls this when the user changes a property in its native panel; the keys match the `project.json` property keys exactly (e.g. `slider_squaresize`, `combo_offset_x`). See `WorldGenerator/js/Main.js` for the original pattern, or `TileGridBase/src/we/propertyListener.ts` for a smaller, typed, single-property example.
- An optional in-wallpaper GUI (buttons/sliders drawn as HTML overlay) mirroring the same settings, for when the wallpaper is viewed outside Wallpaper Engine (e.g. directly in a browser) — `WorldGenerator` has this, `InfinityWalker` and `TileGridBase` currently don't (keyboard/mouse/touch controls only, not mirrored as an on-screen GUI).
- `project.json` and the property-listener code are **not derived from each other** — adding/changing a property means editing both by hand, they'll silently drift otherwise (see `WorldGenerator/CLAUDE.md`'s "Working here" for how that bit them before).
- Official docs: <https://docs.wallpaperengine.io/en/web/overview.html>, specifically the [User Properties page](https://docs.wallpaperengine.io/en/web/customization/properties.html) for the full property-type reference (slider/combo/checkbox/color/text fields, display conditions, localization).
- **Keyboard input does not reach an applied desktop wallpaper — only mouse input does** (confirmed 2026-09-13 by manually applying `TileGridBase/dist` as a real wallpaper, not just previewing it in the WE editor; the `slider_tilesize` WE property worked perfectly in that same test). Keyboard-driven controls only work while developing (a plain browser, or the WE editor's own preview) — design real interactivity around mouse/touch input and/or `project.json` properties, not hotkeys. This is almost certainly why `InfinityWalker`'s `Player` auto-wanders by default (`PLAYER_START_AUTO_MOVE`) — its WASD-only control scheme wouldn't do anything once actually applied as a wallpaper.

## Dev workflow

- No build step for `WorldGenerator`/`InfinityWalker`/`FirstTestStuff` — open the wallpaper's `.html` file directly in a browser (or serve the folder with any static server) to iterate. `TileGridBase` (and its clones) is the exception: `npm run dev` for iteration, `npm run build` produces the `dist/` folder that actually gets published.
- **Publishing**: manual, via the Wallpaper Engine desktop editor — add a wallpaper by pointing the editor at its `index.html` directly (for `TileGridBase`-derived projects, that's `dist/index.html`, not the folder), verify the property panel against `project.json`, then publish to the Steam Workshop from inside the editor. There is no CLI/automated publish step in this repo.
- The editor's **"Publish to Workshop" dialog** asks for Workshop-listing metadata that lives nowhere in the repo (not `project.json`, which only covers the property panel + app-level title): Title, Genre (dropdown, e.g. Pixel art/Retro/Landscape/Fantasy/...), Description, Age rating, Visibility (Public/Friends/Private), and a required Preview image (either "Capture preview" — a live screenshot taken on the spot — or "Import file", so a hand-authored `preview.jpg` isn't actually required beforehand). **Title and Description are what an end user sees in the Workshop listing** — write real, considered copy here before publishing, not a placeholder; this is separate from and in addition to getting `project.json` right. Every project keeps this metadata pre-drafted in its own **`publishing.md`** (see Conventions below) so filling the dialog in isn't done from scratch each time.
- `preview.jpg`/`preview.gif` referenced by `project.json` (`"preview": "preview.jpg"`) is the Workshop thumbnail — regenerate it after visually significant changes if you're about to publish.

## Conventions

- Tile/pixel art assets live under each project's `img/`; PSD sources live in `DesignCorner/`.
- German is used freely in code comments, notes files, and commit context — don't translate it away.
- Each project keeps its own running TODO/notes file instead of GitHub issues — check it before starting work in that folder. Older projects (`WorldGenerator`, `InfinityWalker`) use `notes.txt`; `notes.md` is the standard for newer ones (`TileGridBase` on).
- Each project also keeps its own **`publishing.md`** — the "Publish to Workshop" dialog's fields (Title, Genre, Description, Age rating, Visibility, Preview image notes), pre-drafted so publishing is copy-paste, not a from-scratch decision every time. Two fields are near-universal defaults across this repo's wallpapers unless a project has a specific reason to deviate: **Age rating "G - All Ages"** and **Visibility "Public"**. Title/Description/Genre are always project-specific — keep Description especially short, it won't get read otherwise.
