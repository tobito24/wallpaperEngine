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
- **`tileset/ground.ts`** (new) — `Ground`: the ground a tile is drawn with, the 14 `BiomeId`s (every biome is its own ground)
  plus the two `OverlayGround`s `road` and `bridge` (a road on water). `groundWithRoad(biomeId, isRoad)` makes the final ground;
  `fallbackColorOf(ground)` is the flat color for a ground without a sheet.
- **`tileset/groundRank.ts`** (new) — the fixed rank of the grounds, a higher rank draws its rim over a lower one. The rule: wetter
  and warmer covers (2 x moisture band + temperature band, the warmer wins a tie), water below everything, mountain and snow peak
  above all land: deep water 0, shallow water 1, beach 2, snow field 3, steppe 4, tundra 5, desert 6, meadow 7, snow forest 8,
  savanna 9, forest 10, jungle 11, mountain 12, snow peak 13, road 14, bridge 15. `continuesInto(ground, neighbour)`: a
  neighbour counts as set when its rank is the same or higher, so a ground draws its own rim against lower grounds and a lower
  ground shows plain fill next to a higher one, never a rim on both sides; a road has a rim on every ground it crosses.
  `underlayGround(ground, firstEdge, secondEdge, diagonal)` gives the ground below the rim of a quarter: the higher of the lower
  edge neighbours, and only when no edge neighbour is lower the diagonal one (an inner corner), else none; so a coast keeps the
  water below it even if a higher ground touches the corner.
- **`tileset/groundSheets.ts`** (new) — the data table `SHEET_FILE_BY_GROUND` (ground → file in `assets/autotiles/`, own art:
  beach `sand`, meadow `grass`, steppe `grass-light-wild`, mountain `gravel`, road `brick-path`, the others by their kebab-case name) and
  `drawGroundAutotile(ctx, ground, autotileIndex, frame, x, y, size)`, which draws the four 16 px quarters of the tile from the
  ground's sheet (the two halves are `floor(size / 2)` and the rest, so an odd tile size leaves no gap) and returns false when
  there is no sheet, so the tile falls back to the flat color. `drawGroundUnderlay` draws, per quarter, the plain fill of the
  lower ground below the rim first (the sheets have transparent rims, see below). The sheets are found by `import.meta.glob`,
  so a clone without them still builds and runs with flat colors. Animation follows Essentials (`002_CustomTilemap.rb`): the
  frame count of a sheet is its width divided by 96, the frames lie side by side, and the frame is
  `floor(now / ANIMATED_AUTOTILE_FRAME_DURATION_MS) % frameCount` with 250 ms, the same frame for every tile, so the water moves as
  one. `WorldRenderer` computes the frame from `nowMs` and hands it to `Tile.draw`; sheets that are 96 px wide have one frame and
  never change (all current sheets). The sheets are generated from 32 x 32 px textures with the tool below and decorated by hand;
  the textures for water, snow, tundra, snow forest, jungle and forest are recolored stand-ins until they are painted.
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
  - **Corners:** outer and inner radius. Limits keep every corner, wave and ring effect inside its 16 px quarter, because
    anything that reaches the next quarter would break the equal quarters: wave height at most the inset and 16 - inset; room =
    16 - inset - wave height (the smallest of the four sides counts); band width, dither and edge shade width at most the room;
    outer radius at most the room minus the widest of band, dither and shade; inner radius at most inset - wave height. The page
    shows the used values and the maxima. Checked with 1 500 random option sets: the equal quarters were identical in all of them.
  - **Fill:** `full texture` or `rim band only` (band width 1 to 16 px, limited by the room; the inside stays transparent,
    the base for a cliff or foam overlay). The band width is the same on all sides.
  - **Edge look:** dither 0 to 2 px (checkerboard rings that fade the edge without semi-transparent pixels) and an edge shade
    (width 0 to 3 px, brighter or darker by a percentage; off by default).
  - **Texture shift:** x and y, shifts the texture under the shape.
  "Download sheet" saves the PNG (several frames side by side, the animation frame is picked as in the game, 250 ms, and can be
  previewed), "Download guide" a red/green guide layer matching the first frame; the sheet is then decorated in Photoshop. The page
  also loads a finished PNG from a relative path inside `WorldNoise/` in the form of "Copy Relative Path"
  (`WorldNoise\assets\autotiles\sand.png`; own sheets live in `assets/autotiles/`) and reloads it when the file changes. It shows the sheet with the
  32 px tile grid, a test shape assembled with the real `autotile.ts` tables and all 47 tiles, on a checkerboard or ground-colored
  background. The rules are in `DesignCorner/autotile-template/README.md`.
- **`tileset/cliffTiles.ts`** (new) — `drawCliff(ctx, cliffType, heightLevel, x, y, size)` draws one of the 12 cliff pieces
  (4 edges, 4 outer and 4 inner corners) of the 16-pattern, one 32 px tile each, from `assets/cliff-assets/cliff-0.png` to
  `cliff-2.png` (160 x 96 px: a 3 x 3 frame of a plateau with the rim and the wall inside it, plus the four inner corners at columns
  3 and 4 of rows 0 and 1), found by `import.meta.glob`; without a sheet the function returns false and the tile has no cliff. The
  set follows the level of the higher tile: level 2 uses `cliff-0`, level 3 `cliff-1`, level 4 `cliff-2` (four land levels). The piece lies on the
  higher tile, so the lower neighbour shows through its transparent corners: `tileset/cliffUnderlay.ts` (`lowerNeighbourGround`)
  gives per quarter the ground of the lower neighbour (a lower vertical edge neighbour first, then a horizontal one, then the
  diagonal one), and `Tile.draw` draws these quarters (`cliffUnderlays`) after the ground and before the piece. Pieces are drawn
  before the level shade. Earlier tried and dropped: pieces cut from the Essentials `Outside` rock kit (no corners) and the stone
  sets of `InfinityWalker/img/tileset.png` (pieces on the lower tile). Measured on 1 024 x 1 024 tiles with four levels: 93 150 cliff
  tiles, all 12 types used, 1 with lower neighbours on opposite sides, none on three sides, 14 with two lower diagonals and no lower
  edge (they show one inner corner). The inner ring: `drawCliffTop(ctx, heightLevel, autotileIndex, x, y, size)`
  draws the top texture as an autotile (`cliff-autotile-0.png` to `-2.png`, 96 x 128 px, the same set rule as the pieces) over the
  own ground of the tile, so the transparent rim shows the biome ground and the inner edge of the band is irregular.
  `elevation/cliffLayout.ts` (`layoutCliffs(levels, size)`) decides: an inner ring tile is a tile of level 2 or higher without a
  piece of its own that has a piece of its own level among its eight neighbours; its autotile index comes from the usual
  eight-neighbour mask where a neighbour counts as set when it is a piece or an inner ring tile of the same level. So a cliff is
  two tiles wide, the piece and the ring; a plateau of four tiles has no biome ground left inside. A ring tile never has a lower
  neighbour, so there is never water below its rim (measured on 1 024 x 1 024 tiles: 0 ring tiles next to water). `Chunk`
  computes the levels on a block with a margin of 9 (the reach of 3 of the layout, 2 of the level cleanup and 4 of the water
  limit), a chunk gets exactly what the whole map would get (0 differing pieces and ring indices), 1.1 ms per chunk. Stairs: at a road crossing
  of the north/south kind (the road travels along y, see [roads.md](roads.md)) the three road tiles on the higher side next to
  the boundary carry a `StairsTile` (`road/crossingStairs.ts`: which edge piece they lie on, which of the 3 columns). `Tile.draw`
  lays `drawStairs` (`tileset/stairsSheet.ts`) over the cliff piece: `assets/cliff-assets/stairs.png`, 32 px tiles, row 4 for a
  south edge piece (the road climbs northwards) and row 5 for a north edge piece, columns 0 to 2; one sheet for every cliff set, a missing
  sheet draws nothing. Measured on 72 north/south crossings of 1 024 x 1 024 tiles: all 216 stair tiles lie on a piece of the matching
  edge and on a road tile. East/west crossings (the road travels along x): the 2 x 4 tiles of the bulge (columns boundary - 1 and boundary, rows
  lane - 1 to lane + 2) carry a `StairsTile` of the kind `eastWest` with its column and row in the stairs; the sheet columns 0 and 1 are used
  when the upper level lies west (the cliff on the right of the stairs), columns 2 and 3 when it lies east, rows 0 to 3. The stairs are drawn
  over any tile of the bulge that has a cliff sheet, also the two without a piece (the inner ring is below, the overlay is opaque there).
  Not done: a road on a ring or on a piece tile outside a crossing is covered by it.
