---
name: new-project
description: Start a new wallpaper project in the wallpaperEngine repo. Works out the plan with the user first (idea.md), then clones TileGridBase for a tile-grid idea (or creates a plain web folder), renames it and adds the standard files and the entries in the docs. Run it whenever a new idea starts.
---

# New project

A project follows one idea and starts with a plan ([project-lifecycle.md](../../../docs/project-lifecycle.md)).

## Boundaries

- Work on a branch `feat/<project-name>` and open no PR unless the user asks ([development-workflow.md](../../../docs/development-workflow.md)).
- Stage only your own files by path; the user's uncommitted changes stay untouched.
- Answer the user in German; files in English (`notes.md` may be German).

## Procedure

1. **Plan first.** Talk the idea through with the user until `idea.md` can be written: the idea in two or three sentences, what it is
   not, the plan in small visible steps, done-when, open questions. If the idea has two ideas in it, say so and split. Do not write
   code before the user agrees with the plan.
2. **Name.** A short PascalCase folder name, like the existing ones. Confirm it.
3. **Create the folder.**
   - Tile-grid idea: copy `TileGridBase/` without `node_modules` and `dist`, then rename in `package.json` (`name`) and
     `public/project.json` (`title`) and the page `<title>` in `index.html`. `npm install`, `npm run build` and `npm run lint` must pass
     before anything else is changed.
   - Anything else: a plain folder with an HTML entry, `project.json` and `js/`; read
     [wallpaper-engine-integration.md](../../../docs/wallpaper-engine-integration.md) first.
4. **Standard files.** `idea.md` (from step 1), `notes.md` (empty log with the first step), `publishing.md` (draft per
   [publishing.md](../../../docs/publishing.md); title and description can stay "TBD" until there is something to show), and a
   `CLAUDE.md` that holds only what differs from the base and links to `TileGridBase/CLAUDE.md` for the rest.
5. **Register it.** Add the project to the table in the root `CLAUDE.md` and `README.md`, and for a fork to the fork list of
   `TileGridBase/CLAUDE.md`. Status is `active`.
6. **Commit** on the branch with a conventional message and report the branch to the user.
