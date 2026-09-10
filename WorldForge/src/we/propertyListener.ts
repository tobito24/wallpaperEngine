/**
 * Stub. Wallpaper Engine's native property panel (see public/project.json) isn't wired up yet —
 * this is intentionally inert in Phase 1 (world-generation quality first, see ../../CLAUDE.md).
 *
 * When it's time to wire it up: fill in project.json's "properties" object, then have
 * window.wallpaperPropertyListener.applyUserProperties(...) here call setters on generationConfig
 * (src/config/generationConfig.ts) and Camera, the same pattern WorldGenerator/js/Main.js uses.
 */
export function installWallpaperPropertyListener(): void {
  // no-op until Wallpaper Engine integration starts
}
