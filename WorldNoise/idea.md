# WorldNoise: idea

## Idea

An endless terrain wallpaper generated from noise instead of Wave Function Collapse: independent elevation, moisture and temperature
channels, a redistribution curve and a biome lookup table decide the ground of each tile. Paths connect towns across the world,
and a tileset with autotile rules makes the surface look hand-made, in the style of Minecraft or Terraria.

## Not

- No gameplay and no character; the camera pans and zooms over the world.
- No stored world: the world is a pure function of the seed and the coordinates.
- No WFC anywhere (terrain, paths, decoration, generated town layouts); that approach lives in `WorldGenerator` and
  `InfinityWalker`. Generated towns are laid out by rules (see Design).
- No towns that span several cells, no terraforming for paths. A town flattens its own footprint into a plateau and shapes a ring
  of terrain around it (see Design).

## Design (decided, not built yet)

### Layers

Every tile is the result of the same ordered steps. Each step is a pure function of `(seed, x, y)` and may read the steps before
it, never the steps after it. A step can be switched off on its own for testing.

1. **Ground:** elevation, moisture and temperature noise, redistributed, looked up in the biome table. Result: base ground type
   and height level (the continuous elevation stays available as its own value).
2. **Skeleton:** the cell grid and which neighbouring cells are linked (see Paths and towns): topology only, a pure function of
   the seed, it reads no tile. The position of a town node and its gates come from the town layer; the path layer takes them
   from there.
3. **Town:** is the tile inside a town footprint? Result: the tile of the town template stamped there, and the plateau: the
   town overrides ground and height level inside its footprint (and the terrace ring around it).
4. **Path:** is the tile on a road? Roads end at the gates of the towns and read the final level, so stairs appear where it
   changes. Road on water becomes a bridge.
5. **Decoration:** rule-based scatter (trees, rocks, flowers), never on water, path or town.
6. **Rendering:** which sprite fits the tile and its neighbours (autotiling).

A chunk never reads another chunk. Whenever a step needs a neighbour tile, it evaluates the layers for that coordinate. That is
why chunk borders never show seams.

### Paths and towns

Reason for the shape: an endless world has no global view, so every decision must be computable from a small neighbourhood.

- A global **cell grid** of whole chunks, as the room grid of Mystery Dungeon: **5 x 5 chunks per cell** (80 tiles; a chunk is
  16 tiles). Reason: a 3 x 3 chunk town in a 5 x 5 chunk cell always leaves a buffer of one chunk (16 tiles) on every side, so
  two towns of neighbouring cells are at least 32 tiles apart (more if they are smaller or sit off centre), the 8 tile terrace
  ring around a town stays inside its cell, and no two plateaus can touch. Longer roads between towns are wanted. Each cell
  has one node.
- A node is either a **town candidate** or a plain **waypoint**. The position of a waypoint is jittered by
  `hash(seed, cx, cy)`; the node of a town is the centre of the footprint chunk nearest to the centroid of the footprint
  (for an L or T this lies inside the town; for an even sized shape it is 8 tiles off the exact centre), and the roads of the
  neighbours run to that node.
- Each edge to a neighbour cell exists by `hash(edge id)`, so both cells agree without knowing each other.
- **Paths never end:** every node needs at least two edges. A node with fewer takes the edges with the lowest hash values, and an
  edge exists if either of its two nodes asks for it. The rule only needs the four edges of a node, so it is local. A global
  spanning tree like in Mystery Dungeon is not possible without a global view.
- The course of an edge is the line between its two nodes, bent by noise. A tile only asks "is a road near me?", so no state is
  stored and chunks need no coordination.
- On water a road becomes a **bridge**. Roads do not route around water (A* per edge is a possible later upgrade).
- **Towns** sit on land. A candidate checks its footprint against the base ground (before any town override); if too much of it
  is water, the node becomes a plain waypoint (first rule: at least 97 % land; at the terrain scale of 0.01 that holds for 33 %
  of the 2 x 2 chunk positions and 18 % of the 3 x 3 chunk positions, a candidate can try more than one position in its cell).
  The graph and the degree rule do not change. Water inside an accepted footprint (at most 3 %) becomes land: the town
  covers small ponds. The percentages count positions of the footprint, not towns, and come from one seed and one area of
  4800 x 4800 tiles; the number of towns per area is measured when the town step is built. The decision per cell is cached:
  it needs the base ground over a footprint of up to 48 x 48 tiles for every position that is tried.
- **Town sizes** follow the Pokemon cities the user picked, one of our tiles being one tile of the original maps: a small town
  is 2 x 2 chunks (32 x 32 tiles, like Lavender Town of HGSS with about 28 x 32), a large city up to 3 x 3 chunks (48 x 48, like
  Jubilife City of Platinum with about 50 x 38). Houses are 4 tiles wide (small) or 8 (large). A footprint is a set of whole
  chunks inside the inner 3 x 3 chunks of its own cell (one chunk of buffer on every side), picked from a small list of shapes
  (2 x 2, 3 x 3, rectangle, L, T), rotated by hash. A chunk only asks its own cell. Roads end at a gate on the footprint.
  An **O town** is a layout of the 3 x 3 footprint, not a footprint of its own: the town lies in a ring around a free centre
  chunk, and the template puts something into the centre (a pond, a park, a rock). Measured: as a footprint with the centre
  left to the terrain an O would fit 16 % of the cells, but only 0.1 % of the cells where the full 3 x 3 does not, because
  the terrain hardly ever has a lake of that size in the middle of a landmass; so as a template it adds variety and costs no
  extra fit.
  Measured (97 % land rule, 3600 cells, one seed): the large 3 x 3 chunk town at the centre fits 18 % of the cells, an L or T
  shape of 5 chunks (any rotation) inside the 3 x 3 centre block 51 %, and some town (large, L or T, or a 2 x 2 chunk town at
  one of its 4 positions) 61 %. A cell whose candidates all fail keeps a plain waypoint.
- **Two kinds of towns: generated and designed.** The model of both is the classic Pokemon town: an even area with a loop of
  roads, buildings in the fields between, trees and cliffs as a frame, and gates where the roads leave. Which kind a town is
  follows from a hash of its cell; 20 % of the towns are designed (decided by the user, a constant).
  - **Generated towns** get their layout from rules, not from WFC, and as a pure function of the cell hash and the footprint.
    There are several layout algorithms and a hash picks one per town, so towns differ. The first one is the user's idea:
    straight roads run from the gates through the town, where they cross lies a road loop with a fountain in the middle,
    a few side paths branch off, and houses (4 and 8 tiles wide) stand along the roads and around, one Pokemon Center and one
    Mart per town (a small town may have only the Center), trees and fences in what is left. Later layouts, for example a
    main street with houses on both sides, a ring road around a park or pond (the O town) or a grid, are added the same way.
    The rules are refined when the step is built.
  - The roads of a town are the roads of the graph: the edges to the neighbouring nodes run through the town to its node,
    kept straight as far as the farthest corner of the footprint from the node (the straight radius of the town, then a fade
    of `TOWN_STRAIGHT_ROAD_FADE_TILES`) and bent only outside. Where they enter the footprint are the gates, where they meet
    is the crossing. They enter at the angle of the neighbouring node, not along the axes, and in an L or T a road can cross
    a notch and leave and enter the footprint again; the layout step decides whether to straighten or reroute them.
  - **Designed towns** are hand-built templates, stamped into the footprint (chosen and rotated by hash). During development
    a real town (Marmoria City) is rebuilt as the first template; the public version gets own designs instead. A template
    carries its footprint shape, its tiles and its gates. The template format is decided when the step is built.
  Both kinds fill the same footprint shapes and gates, so the plateau, the ring and the roads treat them alike.
- **A town sits on a plateau** (like Jubilife City or Marmoria City). It overrides the height level inside its footprint with one
  flat level, the most common land level of the base ground there, and shapes the terrain around it (see the rule below).
  Reason, measured: at
  the old terrain scale a footprint of town size almost never lies on one level (0.1 % of the positions for 28 x 32, 0 % for
  50 x 38), and at the enlarged scale it is still rare (at least 90 % of the tiles on one land level at 2.8 % of the 2 x 2
  chunk positions and 0.4 % of the 3 x 3 chunk positions), so a town that waits for a flat spot would hardly ever appear. The
  footprint is decided from the *base* ground (before any override), and the final ground is the base ground changed by the
  town. The town reads only layers before it (base ground and skeleton); the path layer reads the town, never the other way
  round. Later, a mountain can stand next to a town so that it lies in a valley.
- **The terrace ring** keeps every cliff one step high where the plateau meets terrain that is two levels away (with three
  levels, plateau 3 next to terrain 1, or the other way round). Around the footprint lies a ring of about 8 tiles (width
  judged by eye). Inside the footprint the level is the plateau level P. Inside the ring the level of a land tile is the base
  terrain level t limited to P - 1 .. P + 1; water tiles stay water (the ring rule is for land only, so a shore stays a shore
  and the limit never turns water into land next to a high land tile). Then the plateau and the ring differ by at most one
  step, and the ring and the terrain behind it differ by at most one step, because the limit moves a land level by at most
  one step and no land level lies beyond it (with more than three land levels this must be looked at again). So the "one step
  only" rule of the height levels holds around a town, and where the terrain is close to P the ring is the terrain itself,
  so it only shows as a terrace where it is needed.
- **Open and fenced edges:** on the town side a wall stands only where the plateau and the ring differ. Natural cliffs of the
  terrain continue inside the ring, and the limit can make one at the outer edge of the ring where the terrain is two levels
  from P (plateau 3 next to terrain 1: ring level 2 next to terrain 1). Where the terrain behind the town is on the plateau
  level there is no wall, the town is open there. A wanted barrier there is a fence (or trees), placed by the town template or
  a decoration rule; a gap in the barrier is allowed and gives variety. Roads leave through gates, on stairs where a cliff is
  in the way.

### Height levels and cliffs

Discrete height levels belong to the Pokemon look, so they are part of the plan, not a later extra.

- The redistributed elevation is cut into a few land levels (start: 3) plus water. Cliff walls are drawn where two neighbouring
  tiles have different levels.
- Known risk, from `InfinityWalker` (`CLAUDE.md`: "very mountain-heavy landscapes, not visually pleasing"): cutting noise into
  levels gives speckle (tiny plateaus) and cliffs everywhere. Countermeasures to build and judge by eye: low frequency for the
  level noise, a minimum plateau size, and a cap on how often the level may change. This is the first thing to look at in the
  height step, before any cliff art.
- Neighbouring land levels differ by one step at most: measured on the terrain (see `CLAUDE.md`), not enforced; around a town
  the terrace ring enforces it.
- A cliff wall is a drawing rule of the render layer, using the cliff blocks of the sheet (brown walls and wooden stairs in
  column 1, snowy ones in 1.12 to 1.17). Its layout is still to be verified like the grounds.
- Roads cross a level change on stairs. A town footprint is flattened by the plateau override (see Paths and towns).
  Decoration is never placed on a wall.
- **Terrain scale:** the elevation and the level field use base frequency 0.01, features of about 100 tiles, so that a
  town of 2 x 2 to 3 x 3 chunks fits inside a landmass (at 0.02 hardly any footprint is mostly land). The measured values
  are in `CLAUDE.md`.
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
  The Alienor Tileset v2 (`DesignCorner/private/dewbuse-*.png`, 896 x 2048 px) uses the same 48 quarters but a landscape layout of
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

Source: the inventory of `DesignCorner/private/dewbuse-*.png` (cells `column.row`, 128 x 96 px each, roughly verified).

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
- [x] Redistribution curve on elevation, so there is less mid-value mush
- [x] Height levels as flat bands, with the speckle countermeasures; judged by eye before any cliff art
- [x] Moisture and temperature channels, each in its own folder like `elevation/`
- [x] Biome lookup table with flat colors (3 x 3 land biomes plus water, beach, mountain and snow peak), borders judged by eye
- [x] Confirm the autotile layout of the Alienor sheet (quarter tiles, 128 x 96 px per ground)
- [x] Inventory of the grounds on the sheet, first grounds picked (see Design)
- [x] Dev assets: git-ignored asset folder in `WorldNoise/`, a few Essentials autotiles copied in, data table of grounds
- [x] Ground rank order and the XP autotile calculation (48-entry index table), first with placeholder pieces, then with the
      Essentials autotiles (the placeholder stage was skipped: the Essentials autotiles were at hand and the table was
      checked against their source)
- [x] Animated water (frames side by side, one global frame index)
- [x] Cliff walls where two levels meet, placeholder first: south wall from the dark rock face of the private `Outside` tileset, the other sides dark lines (the real cliff art, with corners and stairs, comes with the art of the public version)
- [x] Choose `CHUNK_SIZE` and cell size together so a cell is a whole number of chunks (16 tiles per chunk, 5 x 5 chunks per cell)
- [x] Path graph: cell nodes, edge hashes, degree rule, bent roads, bridges (waypoint nodes only, the bridge is a flat color)
- [ ] Stairs where a road crosses a level change
- [x] Larger terrain features (base frequency 0.01) so that towns of 2 x 2 to 3 x 3 chunks fit into landmasses
- [x] Town candidates, land check, footprint shapes, gates (the gates are where the straight roads enter the footprint)
- [ ] Generated towns: rule-based layout in the footprint (road loop, lots, houses, Center and Mart, trees and fences)
- [ ] Designed towns: template format, stamping with rotation, Marmoria City rebuilt as the first (dev) template
- [x] Town plateau: height override inside the footprint, terrace ring (level limited to P - 1 .. P + 1)
- [ ] Fences or trees where the edge of a town is open (no cliff wall)
- [ ] Town outline: wavy and stepped instead of the straight chunk rectangle (the edge of the footprint moves by a noise offset of at most `TOWN_OUTLINE_WOBBLE_TILES`, with steps, so the plateau edge is no straight line; the wobble plus the ring of 8 tiles must fit into the buffer of 16 tiles; the layout, the gates and the roads must follow the outline)
- [ ] Cliff pieces for the east, west and north side and for the corners (today only the south side has a wall texture, the other sides are dark lines), and stairs where a road crosses a cliff
- [ ] Rule-based decoration
- [ ] Alienor sheet converted to the XP layout by a script (license text into `publishing.md` first)
- [ ] Replace every development-only asset by a cleared one, and own town templates; check the repo contains no development assets and that `dist/` was built without `dev-assets/` (it embeds them otherwise)
- [ ] Wallpaper Engine properties (at least the seed)
- [ ] Preview, `publishing.md` text, publish

## Done when

Panning over the world shows clearly different, believable biomes (desert, tundra, forest, ocean) with natural borders and
roads that always lead on and connect towns, and the seed can be changed from the Wallpaper Engine panel.

## Open questions

- **Art source and credits.** The user has no license for any artwork. The project is a non-commercial hobby project, and the
  artists are named in the Workshop description. Development may use the Essentials graphics; publishing may not (see Assets
  during development and at publish). Third-party material that is not cleared for publishing (the Alienor sheet, the biome
  tileset with the note "Please give Credit to Kyle-Dove and Sagaxxy!", the example town maps from the Pokemon games) lives in
  `DesignCorner/private/`, which is git-ignored. `tileset-biome.png` had been committed earlier: it is no longer in the
  repo, but it is still in two older commits of the public repository; removing it from the history needs a history rewrite
  and a force push, which has not been done. The Alienor Tileset v2 (`DesignCorner/private/dewbuse-*.png`, DeviantArt, by
  anarlaurendil) is said by the user to be free to use, but its exact terms were never copied from the page.
- The tile size of `tileset-biome.png` is not measured. It may be 16 px and would then need scaling or redrawing to 32 px.
- Desert decoration, swamp, jungle and lava need assets that are not on the sheet yet.
- Number of height levels (3 is a first guess) and how strong the speckle countermeasures must be.
- Town layouts: the Pokewiki city list (https://www.pokewiki.de/St%C3%A4dteverzeichnis) is the inspiration, above all the old
  towns. Marmoria City is the first model; further models are not chosen yet. Open: the template format, the share of
  designed towns, and the rules of the generated layout (first proposal in Design).
- The list of town shapes beyond 2 x 2, 3 x 3, L and T.
- Which properties are worth exposing besides the seed (ocean share and noise zoom rebuild all chunks). A water animation
  speed property needs its own animation clock; scaling `nowMs` would make the frame jump whenever the value changes.
