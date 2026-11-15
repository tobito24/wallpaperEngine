# ColorWar: idea

## Idea

A tile grid where every tile has a color and each color beats the next one in a cycle, like Rock-Paper-Scissors as a cellular
automaton. The player clicks tiles to seed colors and watches the colors fight for the whole screen.

## Not

- Not Conway's Game of Life, despite the original working name.
- No score, no goal, no game over: it is a wallpaper to look at and poke.
- No feature that needs the keyboard: only mouse/touch and Wallpaper Engine properties reach an applied wallpaper.

## Plan

- [x] Clone `TileGridBase`, tiles with a color and `none`
- [x] Cyclic dominance rule with a per-tick snapshot, tick rate as property
- [x] Click/tap advances a tile's color
- [x] Starting pattern presets (`empty`, `speckle`, `sectors`, `stripes`, `rings`)
- [x] 7-color rainbow version and the original 3-color version as two listings
- [x] Publish both listings

## Done when

Both listings are visible in the Workshop and the wallpaper runs smoothly as an applied desktop wallpaper. Reached; the project is
done for now and continues only with a new idea (more rules, other neighborhoods).

## Open questions

- Is a rule other than "any single neighbor beats me" (threshold or majority) worth a third listing, or a property?
