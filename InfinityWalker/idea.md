# InfinityWalker: idea

## Idea

A character walks through an infinite, procedurally generated top-down world while the camera follows it. The point is much faster
generation than `WorldGenerator`: chunked, layered WFC with a time budget per frame.

## Not

- Not an RPG or a game you play; that scope was dropped.
- Not keyboard-driven in practice: the player auto-wanders by default because keys do not reach an applied wallpaper.

## Plan

- [x] Chunked world with lazily created chunks
- [x] Layered WFC (base, overlay, deco) with a time budget
- [x] Walking player with auto-wander
- [x] Publish a first version
- [ ] Solve the mountain-heavy landscapes from the height levels
- [ ] Wallpaper Engine property panel (`project.json` and listener are missing)
- [ ] Re-implement all tiles

## Done when

Paused. Resuming needs the aesthetic problem solved first; the noise approach is being tried in `WorldNoise` instead.

## Open questions

- Is the prefab stamping system (once in commit `dbc73d1`, now gone) worth restoring if the project resumes?
