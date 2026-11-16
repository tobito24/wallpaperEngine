# Tileset: autotiles, grounds, cliffs

Part of [WorldNoise](../CLAUDE.md). Source folder: `src/tileset/`. Constants: `CLIFF_SHEET_TILE_SIZE_PX` in
`config/constants.ts`. The art is development-only (see "Working here" in [CLAUDE.md](../CLAUDE.md) and
[idea.md](../idea.md), Assets during development and at publish).

- **`tileset/autotile.ts`** (new) — the RPG Maker XP / Pokemon Essentials autotile rules, copied from the Essentials
  v19.1 script `Data/Scripts/006_Map renderer/003_TileDrawingHelper.rb` (`Autotiles`, `NeighborsToTiles`,
  `tableNeighbors`) and compared with it by a script (48 quarter entries and 256 mask entries identical; the mask
  table yields 47 distinct indices, 0 to 46): `AUTOTILE_QUARTER_IDS[index]` gives the four quarters of a tile
  (1-based ids, 6 columns of 16 px on the 96 x 128 sheet; top left, top right, bottom left, bottom right),
  `autotileIndexFor(mask)` maps the 8-neighbour mask (N 1, NE 2, E 4, SE 8, S 16, SW 32, W 64, NW 128; a bit is set
  when the neighbour continues the ground) to the tile index. A diagonal that matters only when both adjacent edges
  are set is already folded into the table.
- **`tileset/ground.ts`** (new) — `Ground`: the ground a tile is drawn with, the seven `BiomeGround`s of the biome table
  plus the two `OverlayGround`s `road` and `bridge` (a road on water). `groundWithRoad(biomeGround, isRoad)` makes the
  final ground; `fallbackColorOf(ground, biome)` is the flat color for a clone without sheets (the biome's color, or the
  fixed color of road and bridge).
- **`tileset/groundRank.ts`** (new) — the fixed rank of the grounds, deep water 0, shallow water 1, sand 2, grass 3,
  dirt 4, rock 5, snow 6, road 7, bridge 8, and `continuesInto(ground, neighbour)`: a neighbour counts as set when its
  rank is the same or higher. A ground therefore draws its own rim against lower grounds and a lower ground shows plain
  fill next to a higher one, so there is never a rim on both sides; a road has a rim on every ground it crosses.
- **`tileset/groundSheets.ts`** (new) — the data table `SHEET_FILE_BY_GROUND` (ground → autotile file) and
  `drawGroundAutotile(ctx, ground, autotileIndex, x, y, size)`, which draws the four 16 px quarters of the tile from
  the ground's sheet (the two halves are `floor(size / 2)` and the rest, so an odd tile size leaves no gap) and returns
  false when there is no sheet, so the tile falls back to the biome's flat color. The sheets are the development-only
  Essentials autotiles in `dev-assets/autotiles/` (see "Working here" in [CLAUDE.md](../CLAUDE.md)), found by `import.meta.glob`, so a clone without
  them still builds and runs with flat colors. Mapping: deepWater `Sea deep`, shallowWater `Sea without shore`, sand
  `Sand`, grass `Light grass`, dirt `Dirt`, rock `Gravel`, snow `White path`, road `Brick path`; the bridge has no sheet
  yet and is a flat brown tile. The Essentials rims are painted for grass
  as the base, so a transition against water or snow shows a grass-green rim; the replacement art is converted to the
  same layout. Animation follows Essentials (`002_CustomTilemap.rb`): the frame count of a sheet is its width divided by
  96, the frames lie side by side, and the frame is `floor(now / ANIMATED_AUTOTILE_FRAME_DURATION_MS) % frameCount`
  with 250 ms (`5 * 60 / 20` game frames at 60 per second), the same frame for every tile, so the water moves as one.
  `WorldRenderer` computes the frame from `nowMs` and hands it to `Tile.draw`; sheets that are 96 px wide have one
  frame and never change. With the local sheets both water sheets have 8 frames (a cycle of 2 s); measured on the
  canvas over 4.6 s: 8 distinct images, a change about every 250 ms, 76 % of the screen's pixels (the land) never
  change.
- **`autotile-preview.html`** + **`src/tools/autotilePreview.ts`**, **`autotileGenerator.ts`** (new, dev tool, not part of the build
  output) — make and check a self-made autotile: `npm run dev`, open `/autotile-preview.html`. A 32 x 32 px texture (file input or
  dropped on the page) is turned into a base sheet of 96 x 128 px: the texture in all ground quarters, an edge 8 px inside the
  border, transparent outside and no border color (the texture just stops). Options: edge style (`curve` round corners, `edge` cut
  corners, `wavy` a sine along the edge), inset 0 to 16 px (distance of the edge from the tile border, default 8: a bigger inset makes the shape smaller and shows more of the
  ground below), corner radius, wave height and wave length 16 or 32 px (the waves repeat every 32 px at most, so the edge quarters that
  must be equal are equal). The radius and the wave height are limited so a corner or wave stays inside its 16 px quarter (outer radius
  16 - inset - wave height, inner radius inset - wave height, wave height at most the inset and 16 - inset); the page shows the used values.
  "Download guide" saves a red/green guide layer matching the generated sheet. Inner corners are notches with the same radius. "Download sheet" saves the PNG, which is then
  decorated in Photoshop. The page also loads a finished PNG from a relative path inside `WorldNoise/` in the form of "Copy Relative Path" (`WorldNoise\autotiles\sand.png`; own art lives in `autotiles/`) and reloads it
  when the file changes. It shows the sheet with the 32 px tile grid, a test shape assembled with the real `autotile.ts` tables and
  all 47 tiles, on a checkerboard or ground-colored background. The rules are in `DesignCorner/autotile-template/README.md`.
- **`tileset/cliffTiles.ts`** (new) — `drawCliff(ctx, cliffType, heightLevel, x, y, size)` draws one of the 12 cliff pieces
  (4 edges, 4 outer and 4 inner corners) from the stone sets of `InfinityWalker/img/tileset.png` (256 x 1 920 px, 32 px
  tiles, 8 per row), copied to `dev-assets/tilesets/infinitywalker.png` and found by `import.meta.glob`; without it the
  function returns false and the tile has no cliff. Each of the three stone sets is a 3 x 3 frame at columns 3 to 5 (rows
  8, 14, 20) plus the inner corners at columns 6 and 7; the set follows the level of the lower tile (1 brown, 2 grey,
  3 dark brown). The inner corners of the grey set lie mirrored in the sheet, which `tiles.js` of InfinityWalker already
  accounts for (`GREY_STONE_INNER_OFFSETS`). Pieces are drawn before the level shade. Earlier tried and dropped: pieces
  cut from the Essentials `Outside` rock kit, which did not fit together (no corners). Not done: stairs where a road
  crosses a cliff; a tile with higher neighbours on three sides or on two opposite sides takes the first matching edge.
