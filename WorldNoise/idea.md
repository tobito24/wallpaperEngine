# WorldNoise: idea

## Idea

An endless terrain wallpaper generated from noise instead of Wave Function Collapse: independent elevation, moisture and temperature
channels, a redistribution curve and a biome lookup table decide what each tile looks like, in the style of Minecraft or Terraria.

## Not

- No gameplay and no character; the camera pans and zooms over the world.
- No stored world: the world is a pure function of the seed and the coordinates.
- No WFC; that approach lives in `WorldGenerator` and `InfinityWalker`.

## Plan

- [x] Clone `TileGridBase`, rename
- [x] Elevation noise as flat color bands (water, beach, land, hills, mountain)
- [ ] Moisture and temperature channels
- [ ] Redistribution curve on elevation, so there is less mid-value mush
- [ ] Biome lookup table: elevation x moisture x temperature gives a biome, a biome gives the tile look
- [ ] Wallpaper Engine properties (at least the seed)
- [ ] Preview, `publishing.md` text, publish

## Done when

Panning over the world shows clearly different, believable biomes (desert, tundra, forest, ocean) with natural borders, and the
seed can be changed from the Wallpaper Engine panel.

## Open questions

- Flat colors or tileset art for the biomes? The `DesignCorner/tileset-biome.png` may be the start of the art.
- Which properties are worth exposing besides the seed?
