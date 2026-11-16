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
- **`autotile-preview.html`** + **`src/tools/`** (`autotilePreview.ts` the page, `autotileControls.ts` the controls,
  `autotileGenerator.ts` the generator; new, dev tool, not part of the build output) — make and check a self-made autotile:
  `npm run dev`, open `/autotile-preview.html`. One or more 32 x 32 px textures (file input or dropped on the page; several
  textures become the frames of the sheet, sorted by file name) are turned into a base sheet of 96 x 128 px per frame: the texture in
  the ground quarters, transparent outside, no border color (the texture just stops). Every option keeps the quarters equal that
  must be equal (checked for all styles and options: 14 = 16, 15 = 17 and the other sides, the plain ground quarters), because all
  edge profiles repeat every 32 px at most. Options:
  - **Edge:** `curve` (round corners), `edge` (cut corners), `wavy` (sine, triangle, square or scallop, height 0 to 4 px, length 16
    or 32 px) and `rough` (random bumps from a seed, roughness 0 to 4 px).
  - **Inset:** 0 to 16 px from the tile border, one value for all sides (default 8) and an optional value per side (a bigger inset
    makes the shape smaller and shows more of the ground below).
  - **Corners:** outer and inner radius. Limits keep every corner and wave inside its 16 px quarter: outer radius at most
    16 - inset - wave height, inner radius at most inset - wave height (the smallest of the four sides counts), wave height at most
    the inset and 16 - inset. The page shows the used values.
  - **Fill:** `full texture` or `rim band only` (band width 1 to 16 px, limited like the outer radius; the inside stays transparent,
    the base for a cliff or foam overlay). The band width is the same on all sides.
  - **Edge look:** dither 0 to 2 px (checkerboard rings that fade the edge without semi-transparent pixels) and an edge shade
    (width 0 to 3 px, brighter or darker by a percentage; off by default).
  - **Texture shift:** x and y, shifts the texture under the shape.
  "Download sheet" saves the PNG (several frames side by side, the animation frame is picked as in the game, 250 ms, and can be
  previewed), "Download guide" a red/green guide layer matching the first frame; the sheet is then decorated in Photoshop. The page
  also loads a finished PNG from a relative path inside `WorldNoise/` in the form of "Copy Relative Path"
  (`WorldNoise\autotiles\sand.png`; own art lives in `autotiles/`) and reloads it when the file changes. It shows the sheet with the
  32 px tile grid, a test shape assembled with the real `autotile.ts` tables and all 47 tiles, on a checkerboard or ground-colored
  background. The rules are in `DesignCorner/autotile-template/README.md`.
- **`tileset/cliffTiles.ts`** (new) — `drawCliff(ctx, cliffType, heightLevel, x, y, size)` draws one of the 12 cliff pieces
  (4 edges, 4 outer and 4 inner corners) from the stone sets of `InfinityWalker/img/tileset.png` (256 x 1 920 px, 32 px
  tiles, 8 per row), copied to `dev-assets/tilesets/infinitywalker.png` and found by `import.meta.glob`; without it the
  function returns false and the tile has no cliff. Each of the three stone sets is a 3 x 3 frame at columns 3 to 5 (rows
  8, 14, 20) plus the inner corners at columns 6 and 7; the set follows the level of the lower tile (1 brown, 2 grey,
  3 dark brown). The inner corners of the grey set lie mirrored in the sheet, which `tiles.js` of InfinityWalker already
  accounts for (`GREY_STONE_INNER_OFFSETS`). Pieces are drawn before the level shade. Earlier tried and dropped: pieces
  cut from the Essentials `Outside` rock kit, which did not fit together (no corners). Not done: stairs where a road
  crosses a cliff; a tile with higher neighbours on three sides or on two opposite sides takes the first matching edge.
