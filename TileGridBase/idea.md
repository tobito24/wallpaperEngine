# TileGridBase: idea

## Idea

A reusable base for any 2D tile-grid wallpaper: a camera with pan and zoom over a chunked, endless tile grid, with the Wallpaper
Engine property wiring already in place. Every new tile-grid idea starts as a clone of it.

## Not

- Not a wallpaper itself and not meant to be published (see `publishing.md`).
- No generation and no game logic; those are what a clone adds.
- No idea-specific code, ever: it would travel into every future clone.

## Plan

- [x] Camera with pan and zoom, anchored at the cursor and at the pinch midpoint
- [x] Chunked streaming with load and unload
- [x] Debug mode with HUD and chunk borders
- [x] Typed Wallpaper Engine property listener with `slider_tilesize` and `slider_tickrate`
- [x] Generic `Ticker` for a fixed tick rate
- [ ] Camera speed as a property (see `notes.md`)

## Done when

Never fully: it grows only by what two or more forks need. A change that only one fork needs belongs in that fork.

## Open questions

- Should the base get an in-wallpaper GUI that mirrors the properties, for viewing outside Wallpaper Engine?
