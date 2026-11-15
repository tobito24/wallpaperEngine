# Wallpaper Engine integration

How a web wallpaper is wired to Wallpaper Engine (WE), and the traps found so far. Official docs:
<https://docs.wallpaperengine.io/en/web/overview.html>, the property reference is the
[User Properties page](https://docs.wallpaperengine.io/en/web/customization/properties.html).

## What a wallpaper folder needs

- **`project.json`**: WE's manifest. It declares `title`, the entry `file` (the HTML file) and the **User Properties** panel that WE
  renders natively (checkbox, slider, combo, color, text), each with `type`, `order`, `min`/`max` and default `value`. In the Vite
  projects it lives in `public/` and ends up in `dist/` verbatim.
- **`window.wallpaperPropertyListener.applyUserProperties(properties)`** in the JS. WE calls it when the user changes a property;
  the keys match the `project.json` keys exactly (`slider_tilesize`, `combo_preset`). References: `TileGridBase/src/we/propertyListener.ts`
  (small, typed) and `WorldGenerator/js/Main.js` (the oldest pattern, question it before copying).
- An optional in-wallpaper GUI that mirrors the settings, for viewing outside WE. Only `WorldGenerator` has one.

## Rules and their reasons

- **`project.json` and the listener are not derived from each other.** Adding or changing a property means editing both by hand, plus
  the constants the range mirrors (`config/constants.ts`). They drift silently otherwise; this bit `WorldGenerator` before.
- **Set the listener synchronously at startup.** WE can call `applyUserProperties` immediately on load; a listener set inside a
  promise or timeout misses that first call.
- **Keyboard input does not reach an applied wallpaper, only mouse input does.** Confirmed 2026-09-13 by applying `TileGridBase/dist`
  as a real desktop wallpaper (not just the editor preview); `slider_tilesize` worked live in the same test. So WASD, `q`/`e` and
  `r` only work while developing; real interactivity must be mouse/touch or a property. This is why `InfinityWalker`'s player
  auto-wanders by default.
- **A slider has no curve.** WE sliders are linear. For a value that needs finer control at one end (tile size), expose a 0-100
  position and map it to a log scale in code (`tileSizeFromSliderPosition()`). The slider domain lives in the listener, not in
  `config/constants.ts`: it describes the WE control, not a rendering value.
- **Pointing the editor at the wallpaper:** for the Vite projects the entry is `dist/index.html`, not the folder. Run `npm run build`
  first and verify the property panel against `project.json`.
- **Typing the global:** `window.wallpaperPropertyListener` is a WE runtime global; declare it with `declare global` in the TS
  projects.
