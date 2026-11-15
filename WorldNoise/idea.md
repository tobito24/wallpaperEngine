# WorldNoise: idea

## Idea

An endless terrain wallpaper generated from noise instead of Wave Function Collapse: independent elevation, moisture and temperature
channels, a redistribution curve and a biome lookup table decide the ground of each tile. Paths connect towns across the world,
and a tileset with autotile rules makes the surface look hand-made, in the style of Minecraft or Terraria.

## Not

- No gameplay and no character; the camera pans and zooms over the world.
- No stored world: the world is a pure function of the seed and the coordinates.
- No WFC anywhere (terrain, paths, decoration, town interiors); that approach lives in `WorldGenerator` and `InfinityWalker`.
- No towns that span several cells, no terraforming for paths. Towns on a flat spot come first; a town cut into the mountains
  is a planned later stage that the design must not block (see Design).

## Design (decided, not built yet)

### Layers

Every tile is the result of the same ordered steps. Each step is a pure function of `(seed, x, y)` and may read the steps before
it, never the steps after it. A step can be switched off on its own for testing.

1. **Ground:** elevation, moisture and temperature noise, redistributed, looked up in the biome table. Result: ground type and
   height level (the continuous elevation stays available as its own value).
2. **Path:** is the tile on a road? Road on water becomes a bridge.
3. **Town:** is the tile inside a town footprint? Result: the tile of the town template stamped there.
4. **Decoration:** rule-based scatter (trees, rocks, flowers), never on water, path or town.
5. **Rendering:** which sprite fits the tile and its neighbours (autotiling).

A chunk never reads another chunk. Whenever a step needs a neighbour tile, it evaluates the layers for that coordinate. That is
why chunk borders never show seams.

### Paths and towns

Reason for the shape: an endless world has no global view, so every decision must be computable from a small neighbourhood.

- A global **cell grid** of whole chunks (start: 4 x 4 chunks, i.e. 64 x 64 tiles at `CHUNK_SIZE` 16). Each cell has one node whose
  position is jittered by `hash(seed, cx, cy)`.
- A node is either a **town candidate** or a plain **waypoint**.
- Each edge to a neighbour cell exists by `hash(edge id)`, so both cells agree without knowing each other.
- **Paths never end:** every node needs at least two edges. A node with fewer takes the edges with the lowest hash values, and an
  edge exists if either of its two nodes asks for it. The rule only needs the four edges of a node, so it is local. A global
  spanning tree like in Mystery Dungeon is not possible without a global view.
- The course of an edge is the line between its two nodes, bent by noise. A tile only asks "is a road near me?", so no state is
  stored and chunks need no coordination.
- On water a road becomes a **bridge**. Roads do not route around water (A* per edge is a possible later upgrade).
- **Towns** sit on land only. A candidate checks its footprint against the ground layer; if any tile is water, the node becomes a
  plain waypoint. The graph and the degree rule do not change.
- A town footprint is a set of whole chunks inside its own cell, picked from a small list of shapes (square, rectangle, L, maybe
  T), rotated by hash. The town never leaves its cell, so a chunk only asks its own cell. Roads end at a gate on the footprint.
- **Towns are hand-built templates**, stamped into the footprint (chosen and rotated by hash), not generated. The model is the
  classic Pokemon town: an even area with a loop of roads, buildings in the fields between, trees and cliffs as a frame, and
  gates where the roads leave. During development a real town (Marmoria City) is rebuilt as the first template; own towns
  replace it later. A template carries its footprint shape, its tiles and its gates. The template format is decided when the
  step is built.
- **Door left open: a town cut into the mountains** (like Marmoria City). The town may later override the height level inside its
  footprint (a flat plateau with a cliff ring and a ramp margin). To keep this possible, the footprint is decided from the
  *base* ground (before any override), and the final ground is the base ground changed by the town. A town does not read its own
  override, so no layer reads a later one.

### Height levels and cliffs

Discrete height levels belong to the Pokemon look, so they are part of the plan, not a later extra.

- The redistributed elevation is cut into a few land levels (start: 3) plus water. Cliff walls are drawn where two neighbouring
  tiles have different levels.
- Known risk, from `InfinityWalker` (`CLAUDE.md`: "very mountain-heavy landscapes, not visually pleasing"): cutting noise into
  levels gives speckle (tiny plateaus) and cliffs everywhere. Countermeasures to build and judge by eye: low frequency for the
  level noise, a minimum plateau size, and a cap on how often the level may change. This is the first thing to look at in the
  height step, before any cliff art.
- Neighbouring levels may differ by one step only; a larger jump is clamped by a rule.
- A cliff wall is a drawing rule of the render layer, using the cliff blocks of the sheet (brown walls and wooden stairs in
  column 1, snowy ones in 1.12 to 1.17). Its layout is still to be verified like the grounds.
- Roads cross a level change on stairs. In the first version a town footprint must lie on one level; the plateau override
  (see Paths and towns) comes later. Decoration is never placed on a wall.
- Biome and level stay independent: the level is only the shape, the biome table decides the ground (higher elevation still gives
  more rock and snow).

### Decoration

Rule-based, not WFC: density per biome, minimum distance through a jittered grid, no decoration on water, path or town. Reason: a
rule on `(seed, x, y)` is consistent across chunk borders without extra work, which WFC was not in `InfinityWalker`.

### Autotiling and tileset

- Tiles are 32 x 32 px, in the Pokemon pixel-art look.
- **Format: the RPG Maker XP / Pokemon Essentials autotile, not self-made.** Reason: it is the de-facto standard of the Pokemon
  fan-tileset scene, so ready-made grounds can be used without redrawing; a format of our own would turn every source into
  conversion work. A tile is composed from four 16 px quarters, one per corner, each picked from a small set by two edge
  neighbours and one diagonal neighbour. The result is the same 47 shapes as the 47-tile blob.
  Measured on the Essentials v19.1 autotiles (`Graphics/Autotiles/*.png`): one autotile is **96 x 128 px** (3 x 4 tiles of
  32 px, 6 x 8 quarters = 48 pieces). The renderer uses this layout and the well-known 48-entry XP index table.
  `Sea.png` is 768 x 128 px: eight frames of 96 x 128 side by side, i.e. **animated water** is part of the same standard.
  The Alienor Tileset v2 (`DesignCorner/dewbuse-*.png`, 896 x 2048 px) uses the same 48 quarters but a landscape layout of
  128 x 96 px per ground (8 x 6 quarters, shown as sample shapes). It is converted once by a small script into the XP layout
  instead of being supported as a second layout. Each Alienor ground comes twice: on a transparent background and on grass.
  The Essentials autotiles have their base color painted in (for example a pale green behind `Dirt.png`), so a transition is
  made for one base, as in the Alienor sheet.
  Fallback reference if a pre-rendered 47-tile sheet turns out to be needed: DragoniteSpam's `TutorialAutotiles`
  (`autotile_47_advanced`: 8 neighbours, weights NW 1, N 2, NE 4, W 8, E 16, SW 32, S 64, SE 128, a diagonal counts only if both
  adjacent edges are set, a 256-entry lookup table maps a mask to its tile).
- **Assets follow the format, the style follows the material.** Grounds, biomes, rank order, paths and towns are defined by this
  project, independent of any sheet; the renderer only knows "this ground uses this sheet in this format", and a missing ground
  falls back to a flat color. Recoloring and palette work on found assets is acceptable; changing the format is not.
- A neighbour counts as set if it has the same ground or a higher rank. Grounds have a fixed **rank order** (for example water <
  sand < grass < dirt < rock < snow). A ground draws itself over the lower grounds beside it, in rank order. The result per
  neighbourhood signature is cached.
- **Own art, later option:** where no ready autotile exists, one is composed from a seamless base texture plus an alpha mask set
  and written out in the same 96 x 128 layout. Each ground then has one fixed mask family, and families differ between grounds
  (soft and round for water, jagged for rock, fluffy for snow). A random variant within one ground is not planned: it would need
  masks that cut the tile borders at the same points.
- **Animated water:** a ground can have several frames (the Essentials way, frames side by side). The renderer picks the frame
  from the time, the same for all tiles, so the sea moves as one. The frame count and speed are constants.
- Until the art exists, the renderer draws flat colors with placeholder masks, so the pipeline can be tested without assets.

### Assets during development and at publish

- **Development:** the Pokemon graphics of the local Essentials v19.1 folder (autotiles and tilesets) may be used to build and
  look at the world quickly. The origin of its tilesets is not credited in its `Credits.txt` and the art comes from Nintendo games.
- **Publish:** before anything is published, every such asset is replaced by one with a clear license (for example the Alienor
  tileset with credit, or own art). The data table below makes that a swap of table rows, not a change of the engine.
- **Not in git:** the repo has a GitHub remote, so development-only assets stay out of it (a git-ignored asset folder inside
  `WorldNoise/`). Only assets cleared for publishing are committed. The Alienor sheet stays untracked until its terms are copied
  into `publishing.md`.

### First content and extensibility

Source: the inventory of `DesignCorner/dewbuse-*.png` (cells `column.row`, 128 x 96 px each, roughly verified).

- **Grounds, first guess of the rank order:** deep water (2.6), water (2.5), sand (2.0), grass (base), dirt (2.2), rock (2.7),
  snow (from 2.13). Because the rim is baked in, grass is the base and the others lie on it as overlays.
- **During development** the same grounds come from the Essentials autotiles (`Sand`, `Dirt`, `Light grass`, `Sea`, `Sea deep`,
  `Gravel`, `Brick path`, among others), which are already in the XP layout.
- **Roads:** cobblestone (0.8 to 0.10 on the sheet).
- **Cliffs:** brown walls with wooden stairs (column 1, 1.0 to 1.11), snowy ones (1.12 to 1.17).
- **Trees:** conifers (3.0 to 3.4), broadleaf (3.7 to 3.10), snowy conifers (3.14 to 3.16), birches (3.17, 3.18).
- **Towns:** houses, towers, roofs, fences, fields from columns 4 to 6.
- **Biomes this covers:** meadow and forest, tundra, ocean, beach, desert (sand without decoration), mountain (rock).
- **Missing for now:** desert decoration (no cacti, no palms), swamp, jungle, lava. Decoration for these is delivered later.
- **More assets must be addable later without touching the engine.** Grounds, trees, decoration and town parts are entries in a
  data table (name, sheet, cell, format), and a biome refers to entries by name. An entry without art falls back to a flat
  color. Adding a ground or a decoration is then a new sheet region and one table row.

## Plan

Each step is built and looked at before the next one starts. The plan is final before the first line of the steps below is written.

- [x] Clone `TileGridBase`, rename
- [x] Elevation noise as flat color bands (water, beach, land, hills, mountain)
- [ ] Redistribution curve on elevation, so there is less mid-value mush
- [ ] Height levels as flat bands, with the speckle countermeasures; judged by eye before any cliff art
- [ ] Moisture and temperature channels, each in its own folder like `elevation/`
- [ ] Biome lookup table with flat colors (7 to 10 biomes), borders judged by eye
- [x] Confirm the autotile layout of the Alienor sheet (quarter tiles, 128 x 96 px per ground)
- [x] Inventory of the grounds on the sheet, first grounds picked (see Design)
- [ ] Dev assets: git-ignored asset folder in `WorldNoise/`, a few Essentials autotiles copied in, data table of grounds
- [ ] Ground rank order and the XP autotile calculation (48-entry index table), first with placeholder pieces, then with the
      Essentials autotiles
- [ ] Animated water (frames side by side, one global frame index)
- [ ] Cliff walls where two levels meet, placeholder first, then the cliff blocks of the sheet
- [ ] Choose `CHUNK_SIZE` and cell size together so a cell is a whole number of chunks
- [ ] Path graph: cell nodes, edge hashes, degree rule, bent roads, bridges, stairs on level changes
- [ ] Town candidates, land and single-level check, footprint shapes, gates
- [ ] Town templates: format, stamping with rotation, Marmoria City rebuilt as the first (dev) template
- [ ] Town cut into the mountains: height override inside the footprint, cliff ring, ramp margin
- [ ] Rule-based decoration
- [ ] Alienor sheet converted to the XP layout by a script (license text into `publishing.md` first)
- [ ] Replace every development-only asset by a cleared one, and own town templates; check the repo contains no development assets
- [ ] Wallpaper Engine properties (at least the seed)
- [ ] Preview, `publishing.md` text, publish

## Done when

Panning over the world shows clearly different, believable biomes (desert, tundra, forest, ocean) with natural borders and
roads that always lead on and connect towns, and the seed can be changed from the Wallpaper Engine panel.

## Open questions

- **Art source and credits.** The user has no license for any artwork. The project is a non-commercial hobby project, and the
  artists are named in the Workshop description. Development may use the Essentials graphics; publishing may not (see Assets
  during development and at publish). `DesignCorner/tileset-biome.png` is already tracked in git; whether that is acceptable is
  to be decided by the user. `DesignCorner/tileset-biome.png` carries the note "Please give Credit to
  Kyle-Dove and Sagaxxy!"; whether that allows reuse in a published wallpaper is not clarified. The Alienor Tileset v2
  (`DesignCorner/dewbuse-*.png`, DeviantArt, by anarlaurendil) is said by the user to be free to use; its exact terms and the
  credit text wanted are still to be copied from the page into `publishing.md`. Other Pokemon-style fan tilesets may be used if
  their credit rules are followed.
- The tile size of `tileset-biome.png` is not measured. It may be 16 px and would then need scaling or redrawing to 32 px.
- The rank order of the grounds is a first guess and is fixed when the autotile calculation is built.
- Desert decoration, swamp, jungle and lava need assets that are not on the sheet yet.
- Number of height levels (3 is a first guess) and how strong the speckle countermeasures must be.
- Town layouts: the Pokewiki city list (https://www.pokewiki.de/St%C3%A4dteverzeichnis) is the inspiration, above all the old
  towns. Marmoria City is the first model; further models are not chosen yet. Open: the template format, and how the ramp margin
  of a mountain town keeps neighbouring levels within one step.
- Cell size (4 x 4 chunks is a first guess) and the list of town shapes.
- Which properties are worth exposing besides the seed (ocean share and noise zoom rebuild all chunks).
