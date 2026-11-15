---
name: docs-maintenance
description: Audit and tidy the wallpaperEngine documentation (CLAUDE.md files, README.md, docs/, idea.md, notes). Verifies the docs against the code, fixes broken links, duplicates and stale status, and keeps the project table current. Run it manually after a bigger feature and before a publish.
---

# Docs maintenance

## Boundaries

- Work on a branch, never push or open a PR unless asked; stage only your own files by path.
- Docs in English; `notes.md` / `notes.txt` are the user's scratch space: do not rewrite or translate them, only point out what is
  clearly done.

## Procedure

1. **Project table.** The table in the root `CLAUDE.md`, the list in `README.md` and each project's status line in its `CLAUDE.md` agree
   on every project and its status ([project-lifecycle.md](../../../docs/project-lifecycle.md#status)).
2. **Every project** has an `idea.md` with the five parts, an up-to-date `CLAUDE.md`, and a `publishing.md` that follows
   [publishing.md](../../../docs/publishing.md). Ticked steps in `idea.md` match what the code does.
3. **Against the code.** File names, constants, property keys and scripts named in a doc exist. Check `project.json` keys against the
   property listener while there.
4. **Duplicates.** A rule lives in one doc. Replace copies with a link; a project `CLAUDE.md` links to `TileGridBase/CLAUDE.md`
   instead of repeating the base.
5. **Links.** Every relative link and every entry of the task table in the root `CLAUDE.md` resolves; a new doc has a row.
6. **Size.** A doc that grows past one topic is split, and the table gets the new row.
7. Commit as `docs:` and report in German what changed and what is left for the user.
