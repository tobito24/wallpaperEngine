# Publishing

Publishing is manual and done by the user: add the wallpaper in the Wallpaper Engine editor (Vite projects: point it at
`dist/index.html`), check the property panel against `project.json`, then publish to the Steam Workshop from inside the editor.
There is no CLI step in this repo, and agents never publish.

## The Workshop dialog

The "Publish to Workshop" dialog asks for metadata that lives nowhere else in the repo: Title, Genre (dropdown), Description, Age
rating, Visibility, and a required Preview image ("Capture preview" takes a live screenshot, "Import file" takes a file, so a
`preview.jpg` is not required beforehand). Title and Description are what players see, so they are written with care, never as a
placeholder.

Every project keeps these fields pre-drafted in its own `publishing.md`, so filling the dialog is copy-paste.

## Rules for `publishing.md`

- **English only**, unlike the user's notes: it is what a player reads. This is deliberate.
- **Age rating** "G - All Ages" and **Visibility** "Public" are the defaults unless a project has a reason to deviate.
- **Title, Genre and Description** are always project-specific. Titles may riff on pop-culture film or game titles.
- **Description:** short (it will not be read otherwise), no dashes (`-` or `–`) as punctuation, a mix of marketing pitch and factual
  product description, neither pure ad copy nor a dry feature list.
- **Preview:** `preview.jpg`/`preview.gif` referenced by `project.json` is the Workshop thumbnail; regenerate it after visually
  significant changes when a publish is coming.
- A project that is only a base (like `TileGridBase`) is not a real release; a clone replaces its `publishing.md`.

## Before the user publishes

The `/publish-prep` skill runs the checks: build, `project.json` against the property listener, `publishing.md` against these rules,
the preview. It stops there; the publish itself stays with the user.
