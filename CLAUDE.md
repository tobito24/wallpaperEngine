# wallpaperEngine – Agent Guide

A collection of animated wallpapers for **Wallpaper Engine (Steam)**, each one a visually worked-out idea. Most are
self-contained, zero-build web wallpapers (HTML/CSS/JS, Canvas 2D); `TileGridBase` and its forks are TypeScript + Vite.
This file is loaded in every session: the rules that always apply, the project overview and the map to `docs/`.

## Which docs to read

The docs hold what the code does not show: rules, decisions and their reasons. Read by task and only what the task needs.
A task that is not listed needs no doc. **A typo or a purely technical fix needs none.**

| Task | Always | If |
|---|---|---|
| Start a new project or idea | [project-lifecycle](docs/project-lifecycle.md), [wallpaper-engine-integration](docs/wallpaper-engine-integration.md) | [TileGridBase/CLAUDE.md](TileGridBase/CLAUDE.md) when it is a tile-grid idea |
| Work inside an existing project | that project's `idea.md`, `CLAUDE.md` and `notes.md` | [code-conventions](docs/code-conventions.md) |
| Add or change a Wallpaper Engine property, `project.json`, the property listener, controls | [wallpaper-engine-integration](docs/wallpaper-engine-integration.md) | |
| Prepare a publish, write Workshop texts | [publishing](docs/publishing.md) | [wallpaper-engine-integration](docs/wallpaper-engine-integration.md) |
| Commit, branch, open a PR, build, test or look at a wallpaper | [development-workflow](docs/development-workflow.md) | [code-conventions](docs/code-conventions.md) |
| Change the docs, the skills or this file | [project-lifecycle](docs/project-lifecycle.md) | |

Keep the docs up to date in the same change that makes them outdated. A doc states a rule and its reason, not what the code
shows. A rule lives in one doc, the others link to it. New topics get their own file and a place in the table above. The
skills (`/new-project`, `/publish-prep`, `/docs-maintenance`) describe themselves in their `SKILL.md`.
[README.md](README.md) is the entry for the maintainer.

## Projects

Each folder is one idea and stands alone; there is no shared code between them (duplicated concepts are intentional).
`TileGridBase` is the exception: it is meant to be cloned.

| Folder | Status | What it is |
|---|---|---|
| `WorldGenerator/` | Done, published, foundational | Procedural pixel-art landscape with Wave Function Collapse (WFC). Its Wallpaper Engine patterns are the oldest in the repo: question them before copying. |
| `InfinityWalker/` | Published, paused | Infinite scrolling world with a walking character, chunk-based layered WFC. Local code is ahead of the Workshop version. |
| `TileGridBase/` | Active, base/template | Camera (pan + zoom) over a chunked tile grid, TypeScript + Vite. Cloned as the start of every tile-grid idea. |
| `ColorWar/` | Done for now, published | Fork of `TileGridBase`: a 7-color cyclic-dominance tile automaton. Two Workshop listings, "ColorWar" and "ColorWar: Rainbow". |
| `WorldNoise/` | Active | Fork of `TileGridBase`: noise/biome terrain generation (elevation, moisture, temperature, biome table). |
| `FirstTestStuff/` | Legacy | Early canvas experiments. Ignore unless asked. |
| `DesignCorner/` | Assets | Photoshop sources for the tilesets. Binary, not code. `DesignCorner/private/` is git-ignored: third-party art and game maps that must not be published stay there. |

Lineage: `WorldGenerator` → `InfinityWalker` → `TileGridBase` → `ColorWar`, `WorldNoise`.

Every project folder holds `idea.md` (the one idea and its plan), `CLAUDE.md` (architecture), `notes.md` (running log; the older
projects use `notes.txt`) and `publishing.md` (Workshop texts) as far as it applies.

## Rules that always apply

- **One idea per project.** A project follows one idea. A project starts with a plan in its `idea.md`, before the first code
  ([project-lifecycle.md](docs/project-lifecycle.md)). An idea that outgrows its scope becomes a new project.
- **Branches.** `main` is the only long-lived branch. Small changes may go straight to `main`; a bigger feature (new mechanic, larger
  rework, new fork, a change to the docs or skills) gets a feature branch and a PR so it can be reviewed ([development-workflow.md](docs/development-workflow.md)).
- **Never push to GitHub** unless the user explicitly asks for it in the current task. Commit locally, then tell the user which
  branch is ready.
- **Agents never publish.** Publishing to the Workshop is done by the user in the Wallpaper Engine editor.
- **Never commit what the user has not finished.** Uncommitted changes in the working tree belong to the user; stage only the files
  of your own task, by path.
- **Keyboard input does not reach an applied wallpaper, only mouse input and properties do.** Design interactivity around
  mouse/touch and `project.json` properties; keyboard is a development convenience only
  ([wallpaper-engine-integration.md](docs/wallpaper-engine-integration.md)).
- **`project.json` and the property listener are not derived from each other.** Change both by hand in the same change.
- **Code style:** no comments where better naming works, 2-space indentation, ESM, TypeScript strict in the Vite projects
  ([code-conventions.md](docs/code-conventions.md)).
- **Language:** answer the user in German; code, commits, docs, `idea.md` and `publishing.md` are written in English. `notes.md`
  is the user's scratch space and may stay German.
- Run `npm run lint`, `npm run build` (includes `tsc`) and `npm run format:check` before every commit of a Vite project.

## Commands

The Vite projects (`TileGridBase`, `ColorWar`, `WorldNoise` and every new fork) share the same scripts, run inside the project
folder:

```bash
npm install            # first time only, node_modules is not cloned
npm run dev            # Vite dev server with hot reload
npm run build          # tsc, then dist/ (what the Wallpaper Engine editor points at: dist/index.html)
npm run lint           # eslint
npm run format:check   # prettier
```

The no-build projects (`WorldGenerator`, `InfinityWalker`, `FirstTestStuff`) open their `.html` file in a browser or through any
static server. Looking at a result as an agent: [development-workflow.md](docs/development-workflow.md#looking-at-a-wallpaper).
