---
name: publish-prep
description: Check a wallpaper project before the user publishes it from the Wallpaper Engine editor. Builds it, compares project.json with the property listener and constants, checks publishing.md against the rules, looks at the result and reports what is left for the user. Never publishes. Run it before every Workshop publish or update.
---

# Publish prep

The checks before a publish. The publish itself is the user's, in the Wallpaper Engine editor; this skill never publishes, pushes or
opens a PR on its own.

## Procedure

1. **Project.** Name the project and read its `idea.md`, `CLAUDE.md`, `publishing.md` and `project.json`.
2. **Build.** Vite project: `npm run lint`, `npm run build`, `npm run format:check` inside the folder; all must pass. No-build
   project: open the page and check the browser console.
3. **Properties.** Compare every property of `project.json` (key, type, `min`/`max`, default) with the property listener and the
   constants it mirrors. Report every mismatch and fix it in both places
   ([wallpaper-engine-integration.md](../../../docs/wallpaper-engine-integration.md)).
4. **No keyboard dependency.** Everything a player needs must work with mouse/touch or a property; flag any feature that only a key
   reaches.
5. **Look at it.** `npm run dev` (or a static server), Playwright screenshot at a desktop size, console without errors, each property
   applied once through `window.wallpaperPropertyListener.applyUserProperties`
   ([development-workflow.md](../../../docs/development-workflow.md#looking-at-a-wallpaper)).
6. **Texts.** `publishing.md` against [publishing.md](../../../docs/publishing.md): English, short description without dashes, defaults
   for age rating and visibility, genre set, title not a placeholder.
7. **Report in German:** what passed, what was fixed, and the steps only the user can do: point the editor at `dist/index.html`
   (Vite) or the HTML file, check the native property panel, capture the preview, publish. Say plainly what could not be verified
   without the real Wallpaper Engine.
