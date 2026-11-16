# Project lifecycle

The repo is a collection of visual ideas. Each project follows exactly one idea, and a project starts with a plan.

## One idea per project

A project has one idea that can be said in two or three sentences. If the work grows a second idea, that is a new project (for a
tile-grid idea: a new clone of `TileGridBase`), not a bigger old one. Reason: the projects stand alone and are finished or paused
independently; a project with two ideas can be neither.

## `idea.md`: the plan before the code

Every project has an `idea.md`, written with the user before the first line of code and kept short:

- **Idea:** the one idea in two or three sentences.
- **Not:** what the project deliberately is not, so scope creep has something to be measured against.
- **Plan:** the steps, in the order they are built, each small enough to be seen working.
- **Done when:** what the user must see for the project to count as done (for now).
- **Open questions:** what is undecided. Settle them with the user instead of guessing.

The plan is revisited when the idea changes, not when a step is finished. `notes.md` is the running log (what was done when,
loose ideas); `idea.md` is the intent. A step that is done is ticked in `idea.md`.

## Status

One of **active**, **paused**, **done**, **done for now**, **legacy** or **assets** (a folder without code), optionally with
**published** and a role (`base/template`, `foundational`). The status is stated in the project's `CLAUDE.md`, in the table of the
root `CLAUDE.md` and in `README.md`; all change together.

## Starting a project

Run `/new-project`. For a tile-grid idea it clones `TileGridBase` (without `node_modules` and `dist`), renames the package and
`project.json`, creates `idea.md`, `notes.md` and `publishing.md`, and adds the project to the root table, to `README.md` and to the fork list of
`TileGridBase/CLAUDE.md`. The plan in `idea.md` is worked out with the user before anything else.

A base like `TileGridBase` is developed only for what every clone needs; idea-specific code goes into the clone.

## Documentation of a project

- `CLAUDE.md` of a project holds its architecture and decisions, not a backlog and not what the base already documents (link to
  `TileGridBase/CLAUDE.md` instead of repeating it).
  When it outgrows one topic it is split into `<project>/docs/<topic>.md` and the `CLAUDE.md` becomes a lookup table of
  task and doc, like the root `CLAUDE.md` (`WorldNoise/` is the example).
- A rule that applies to every project lives in the root `docs/`, not in a project file.
