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
   the seed, it reads no tile. The position of a town node and its gates come from the town layer, the position of a waypoint node
   from the node choice of the road planning (it reads the base level); the path layer takes them from there.
3. **Town:** is the tile inside a town footprint? Result: the tile of the town template stamped there, and the plateau: the
   town overrides ground and height level inside its footprint (and the terrace ring around it).
4. **Path:** is the tile on a road? Roads end at the gates of the towns and read the final level (stairs may lie on the ring and the plateau edge of a town, see roads.md; with the road planning the road starts at the gate), so stairs appear where it
   changes. Road on water becomes a bridge.
5. **Decoration:** rule-based scatter (trees, rocks, flowers), never on water, path or town.
6. **Rendering:** which sprite fits the tile and its neighbours (autotiling).

A chunk never reads another chunk. Whenever a step needs a neighbour tile, it evaluates the layers for that coordinate. That is
why chunk borders never show seams.

### Paths and towns

Reason for the shape: an endless world has no global view, so every decision must be computable from a small neighbourhood.

- A global **cell grid** of whole chunks, as the room grid of Mystery Dungeon (**now 7 x 7 chunks (done); the margin around the town is still to come, see "Town margin and the 7 x 7 cell"; the text below describes the 5 x 5 state**): **5 x 5 chunks per cell** (80 tiles; a chunk is
  16 tiles). Reason: a 3 x 3 chunk town in a 5 x 5 chunk cell always leaves a buffer of one chunk (16 tiles) on every side, so
  two towns of neighbouring cells are at least 32 tiles apart (more if they are smaller or sit off centre), the 8 tile terrace
  ring around a town stays inside its cell, and no two plateaus can touch. Longer roads between towns are wanted. Each cell
  has one node.
- A node is either a **town candidate** or a plain **waypoint**. The position of a waypoint is the best land of 48 hashed
  candidates in its cell (road planning 1); the node of a town is the centre of the footprint chunk nearest to the centroid of the footprint
  (for an L or T this lies inside the town; for an even sized shape it is 8 tiles off the exact centre), and the roads of the
  neighbours run to that node.
- Each edge to a neighbour cell exists by `hash(edge id)`, so both cells agree without knowing each other.
- **Paths never end:** every node needs at least two edges. A node with fewer takes the edges with the lowest hash values, and an
  edge exists if either of its two nodes asks for it. The rule only needs the four edges of a node, so it is local. A global
  spanning tree like in Mystery Dungeon is not possible without a global view.
- The course of an edge was the line between its two nodes, bent by noise; it is replaced by the **road planning** below (a path
  planned on the height levels). A tile only asks "is a road near me?", so no state is stored and chunks need no coordination.
- On water a road becomes a **bridge**. A water tile costs more than a land tile in the planning below, so a road goes around
  water where a detour is cheaper.
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
  (2 x 2, 3 x 3, rectangle, L, T), rotated by hash. A chunk only asks its own cell. Roads end at a gate on the footprint (see the town gates in the road planning below).
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
    There are several layout algorithms and a hash picks one per town, so towns differ. The first one is the user's idea,
    modelled on Jubilife City (`DesignCorner/private/pokeCitysExample/793px-Jubelstadt_Pt.png`): there is no town centre that
    all gates must reach; the gates are joined by the street rules in "Town streets" below, a few side paths branch off, and
    houses (4 and 8 tiles wide) stand along the streets, one Pokemon Center and one Mart per town (a small town may have only
    the Center), fountains, lamps, trees and fences in what is left. Later layouts, for example a main street with houses on
    both sides, a ring road around a park or pond (the O town) or a grid, are added the same way.
    The rules are refined when the step is built.
  - The roads of a town are the roads of the graph: the edges to the neighbouring nodes end at the town gates and run straight
    from there through the town to its node (road planning 2; before it the straight radius of the town kept the bent road
    straight through the footprint). Where they meet is the crossing. In an L or T a road can cross a notch and leave and
    enter the footprint again; the town streets replace these straight roads.
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
  terrain level t limited to P - d .. P + d, d = 1 + floor(distance / 4) widening from the footprint outwards (it was 2 tiles per step until the stairs of the road planning needed cliffs 4 tiles apart) (with three levels a fixed
  d = 1 was enough; with four a fixed one left jumps of two at the outer edge of the ring); water tiles stay water (the ring rule is for land only, so a shore stays a shore
  and the limit never turns water into land next to a high land tile). Then the plateau and the ring differ by at most one
  step, and the ring and the terrain behind it differ by at most one step, because the widening limit is one step Lipschitz and beyond the ring
  no land level is changed any more. So the "one step
  only" rule of the height levels holds around a town, and where the terrain is close to P the ring is the terrain itself,
  so it only shows as a terrace where it is needed.
- **Open and fenced edges:** on the town side a wall stands only where the plateau and the ring differ. Natural cliffs of the
  terrain continue inside the ring, and the limit can make one at the outer edge of the ring where the terrain is two levels
  from P (plateau 3 next to terrain 1: ring level 2 next to terrain 1). Where the terrain behind the town is on the plateau
  level there is no wall, the town is open there. A wanted barrier there is a fence (or trees), placed by the town template or
  a decoration rule; a gap in the barrier is allowed and gives variety. Roads leave through gates, on stairs where a cliff is
  in the way.

### Road planning (decided 2026-11-17, not built yet)

The goal: no blocked roads, every road is clean, and where it meets a cliff it meets it at a right angle on stairs. The stairs
(crossings, flat footprints, straightening) are built, but they sit on roads that know nothing about the height levels. Measured
on 232 road edges of 1 024 x 1 024 tiles (the numbers of the old state are in `docs/roads.md`):

- Of 974 places where a road changes its level only 429 got stairs; the failures are mostly roads that meet a cliff at a slant
  (80 % of "too much to flatten" and "no straight edge" are at 40 degrees or more).
- The bent line between two nodes cannot be improved by chance: the best of 32 random bends per edge leaves 174 of 232 edges with
  a failure; larger bends make it worse.
- 21 % of the 169 cell nodes lie in water and 28 % within 3 tiles of a cliff edge, because the node of a waypoint is a random point.
- A road planned on the level field (prototype, grid A* with the stairs rules as costs) reaches 231 of 232 edges without a failed
  crossing, with 631 crossings (before: 974 places) and a road 21 to 24 % longer than the bent line. The straightening of
  today cannot use such a road (347 of 473 crossings failed at the straightening), so it goes away.

Decisions:

1. **Waypoint nodes sit on the best land.** The node of a waypoint cell is the best of 48 candidate tiles drawn uniformly from the
   node area of the cell by hash: the one with the largest clearance, the Chebyshev distance to the nearest tile of another
   base level or to water, searched up to 8 tiles (a tile in water has clearance 0, ties go to the lower candidate index).
   It reads the base level only (`heightLevelAt`, never the crossings, which come after the roads), like the town candidates
   read the base ground. The node area lies 16 tiles inside the cell and the radius is 8, so the choice never leaves its own
   cell. Town nodes stay the centre of the town. It lives in a module of its own (the cell grid stays pure topology), cached per cell. Measured: 16 candidates left 14 of 93 waypoint
   nodes within 3 tiles of a level change, 48 leave 3. A node lies in water only when the whole node area is sea.
2. **Town gates.** An edge runs between neighbouring cells, so a town has at most four gates, one per side that has an edge, and
   only for edges that exist; a town does not need all four. The side of a gate is a side of the bounding box of the footprint;
   the gate is a plateau tile that has no plateau tile next to it in that direction, taken from the middle third of that side
   by hash (for L, T and O shapes only tiles of the outline that really face that way count). The gate points along the side's
   axis. The planner starts at the gate and meets the terrace ring first: ring cliffs get stairs by the normal crossing rule, as
   today. Inside the plateau the town streets (see "Town streets") join the gates; until that exists the road
   runs straight from the gate to the town node, as it does today, also where that line crosses a notch of an L or T shape. The
   planner never plans inside a plateau. The straight road radius and its fade are gone with step 2 (the bent
   line now ends at the gate), the bend (`roadCurve.ts`, `ROAD_BEND_*`) goes away in step 3; the 97 % land rule is not touched, the gates follow its outline.
3. **A path finder per edge replaces the bent line, the walk for crossings and the straightening.** Grid A* between the two ends
   (nodes or gates) in a box around them; state is tile, direction, run and lock. Rules, each with its reason:
   - a land step costs 1, a turn a little more, a water tile several times a land tile (a bridge is a last resort);
   - the road is 3 tiles wide: a tile whose side tiles lie on another level costs extra, so the road does not run along a cliff;
   - a level change is allowed only where `placeCrossing` accepts the stairs on exactly the lane of the road (at most 8 tiles to
     flatten, no water near, `CROSSING_MAX_FLATTENED_TILES`), its cost is small plus half a tile per flattened tile, so the
     terrain gives in a little (a limit of 16 instead of 8 shortened the roads by only 3 %, measured), and the road crosses
     straight (5 tiles straight before and after the crossing, at least 4 tiles between two turns);
   - a level change where no stairs are accepted is not forbidden but very expensive, so a path always exists inside the box
     (the prototype found one for all 232 edges); such a crossing is a failure that the debug overlay shows;
   - the result is the list of crossings (the gates of the road) plus the path; the crossing list is no longer found by walking
     the road. The planner reads the level field without crossings; crossings of different edges that meet near a node or a gate
     are not coordinated (sorted by id, the later one flattens last).
4. **Smooth curves, no return to a raw road.** The corners of the path are rounded (radius 2, the straights at a crossing stay
   exact), and on a straight of 24 tiles or more outside towns the road gets a gentle wave (amplitude at most 2 tiles, about 32
   tiles long, zero near its ends and near every crossing) wherever the wave stays on one level. The result stays a polyline, so
   the road mask, the stairs and the overlay do not change.
5. **Stairs may be closer.** A footprint is 6 tiles long (3 each side of the boundary) and stays so, but two footprints of one
   road may overlap when their levels agree: the boundaries need to be 3 tiles apart (north/south) or 4 (east/west, because
   of the bulge, built with 4 for both), the band between has one level. Built: the planner keeps 4 tiles
   between two crossings. Before the planner two crossings of one edge needed their centres 23 apart or, chained into a run, their
   boundaries 6 plus twice the lane difference apart; in the prototype paths 142 of 428 pairs of consecutive crossings were fewer
   than 6 tiles of path apart.
6. **Chunk locality.** A planned edge is cached like an edge today. The box of the search lies inside the two cells of the edge,
   and `roadEdgesIn` looks one cell further (2 cells around the rectangle instead of 1), because a footprint can reach out of
   the two cells. Costs are integers (scaled by 10) so the result does not depend on rounding. Measured prototype: about 26 ms
   per edge once, 6 s for the 232 edges.

Built in this order, each step measured and looked at before the next: (1) nodes, (2) town gates (interim straight inside),
(3) the path finder with crossings (the old walk and straightening are deleted), (4) curves and waves, (5) closer stairs.
Measured on the same 232 edges and seed, a step is good when: at least 95 % of the edges have no failed crossing, at most 1 % of
the crossings are failures, no waypoint node lies in water and 90 % have a clearance of 4 or more, the roads are at most 30 %
longer than the bent line, a chunk takes at most 3 ms (about 1.9 ms today, measured on 4096 chunks), a chunk equals the whole map (levels, stairs, road
mask), and no building stands on a stair.

### Town streets (decided 2026-11-17, not built yet)

Model: Jubilife City. The roads of the graph end at the gates (road planning 2); inside the plateau the streets join the gates
with each other. The town node is no longer a target: no road has to reach the middle, and a town with two gates is just a street.

Rules, by number of gates (a gate exists only on a side with a graph edge, so 1 to 4):

- **Four gates:** the two opposite pairs are joined, north to south and west to east, each as straight as possible. The two
  streets cross where they meet (a crossing, or a plaza the layout may put there).
- **Three gates:** the one opposite pair is joined straight. The third gate takes the shortest way to that street: a straight
  street at a right angle to it, ending in a T junction.
- **Two gates:** if they are opposite, they are joined straight. If they are on neighbouring sides, one street with a single
  single right-angled corner joins them.
- **One gate:** a dead-end street from the gate a few tiles into the plateau, ending in a small plaza (a fountain, a bench).
  The graph degree rule normally gives a town at least one edge.
- **As straight as possible:** two opposite gates share one lane (a column for north/south, a row for west/east) when both
  sides of the footprint have a tile on it, so the street is a single straight line. Today each gate picks its lane alone by
  hash; the shared lane comes from the same hash, so a town's gates stay a pure function of the town. Where the lanes cannot
  be equal (L or T shape, a notch in between, water near one gate), the street has one jog of the offset in the middle, like the
  north-south street of Jubilife, and all turns are right angles (town streets have sharp corners; the autotile draws the corner piece).
- **Inside the footprint only.** A street never leaves the plateau; at a notch of an L or T it follows the footprint. The planner
  of the roads still never plans inside a plateau: the layout step owns everything between two gates.
- **Streets and side paths.** The through streets are 3 tiles wide like the roads outside. Short side paths (1 to 2 tiles) branch
  off a street at right angles and end at a house door or a small plaza; they are the "fields between roads" of the model.
  Houses, Center, Mart and the lamp and tree rules read the street mask, so nothing stands on a street.
- **Continuous with the outside:** a gate stays where the road of the graph arrives (same lane, same width), so no change of
  the road planner is needed except that its edge ends at the gate and the straight stretch to the node goes away.

Ground. The plateau gets its own grounds instead of the biome ground. Decided with the user (2026-11-17): streets and side
paths use **one** autotile (`city-street.png`), so a side path is just a narrower street (1 to 2 tiles); the paving of the
plateau is `city.png`; the plaza fields are `city-grass.png`. The three sheets are made (96 x 128 px, the format of the other
grounds in `assets/autotiles/`, git-ignored). The edge of the plateau stays a cliff or a hedge/fence line; where a town ground meets the
biome ground (open edge) an autotile rim blends them like any other ground pair. Still to supply later, for the layout rules:
a plaza fountain, lamps, hedge/fence pieces (single tiles or pieces on the `Outside` sheet). Development art may come from
`DesignCorner/private/`, the public version gets own art ("Two asset versions").

Rounded ends, not rounded corners (clarified by the user 2026-11-17). The corners of the town streets are **not** rounded as a
curve: a street turns at a right angle and the autotile draws the corner piece. "Rounded" means that a road **ends** and gets its
rounded cap from the autotile rim, as in the sketch of the user: the road on the upper level stops in front of the top of the
stairs (and in front of a gate or the end of a dead-end street) and its last tile is an end piece, not a straight piece running
on under the stairs. The user wants the road not to run under the stairs at all, so that more end caps show in front of the stairs. So the road mask must treat the stairs footprint (and the tiles beyond the end of a street) as not road for
the autotile neighbour check of the road ground, while the stairs overlay is drawn on top. This applies to both ends of a
crossing (the road above and the road below), to the roads outside and to the streets inside. It needs no change of the path
or of the corner smoothing outside (radius 3 stays as built); it is a change of the ground layer, looked at in step (3).

Built in this order, each step looked at before the next: (1) the gate lanes: opposite gates share a lane (built), (2) the street
planner as a pure function of the town and its gates (a list of straight segments inside the footprint), built (the road mask paints the streets, so no extra overlay is needed),
(3) street mask and town ground/road in the ground layer (built: paving `city` and `cityStreet` inside the plateau, roads end in front of stairs; `cityGrass` waits for the plaza fields of step 5), (4) buildings with a path to a street (built together with the side paths: a building needs a street 2 tiles wide along its whole south edge and a connection to the street, drawn as `cityStreet`; not every town has a Center or Mart),
(5) plazas, fountains, lamps, trees and fences. Good when: every gate of every town is joined to the others as the rules
say, no street leaves the footprint or touches a cliff, a chunk takes at most the 3 ms budget of the road planning, and a chunk
equals the whole map.

### Gate pads, landings and the house path network (decided 2026-11-17, built; the pad was removed again on 2026-11-18, see docs/towns.md: the margin takes its place and the landing starts behind the gate)

Why: 17 of 239 gates (measured on 97 towns) still have a road crossing a cliff without stairs close to the gate. A gate often
lies right behind a cliff, so the road planner has to find a place for stairs in an uncontrolled spot and sometimes bends
strangely towards the cliff edge. The fix is to give the planner a controlled spot.

- **Gate pad.** Every gate that has a road gets a **pad**: a rectangle 4 deep and 8 wide (built; the same for all four sides, it covers the 7 to 8 lanes of a stairs footprint and 3 tiles of its length) outside the plateau edge, centred on the gate
  lane, at the plateau level P. Its ground is town paving (`city`). Water inside a pad becomes land (like the stairs do); the gate lane cost
  (water, level variation) stays as it is, so a pad is rarely on water. The plateau edge at the gate then has no cliff, the pad
  edge is straight, and the cliff (if any) lies at the outer edge of the pad, where the stairs go. Stairs are only tried there first
  ("let us try it like this").
- **Landing behind the pad (built, 2026-11-17).** Behind the pad lies a landing, 8 wide and 6 deep, flat at one level L chosen from the terrain it covers and the terrain behind it (votes, water votes for P-1), so the stairs sit where two flat areas meet. The ring becomes a band per element (plateau, pad, landing) and is cut at the cell buffer of 16 tiles. Measured: level changes without stairs 71 -> 12 on 779 edges, none at a gate.
- **Order of the town platform** (each step reads only the earlier ones; a step is one function of the town):
  1. footprint and plateau level (as today);
  2. gate lanes (as today: shared lane per opposite pair, cost from water and level variation, reading the base ground only);
  3. pads (new): from the gates, the pad tiles at level P;
  4. terrace ring: the distance is measured from the union of plateau and pads, so a pad cliff is at most one step high (ring
     width 8 plus pad 6 is 14 tiles, inside the 16 tile buffer of a cell);
  5. town streets inside the plateau and across the pad, to the outer edge of the pad (the road of the graph starts there);
  6. road planner: its end is the outer edge of the pad, with the straight run and the stairs rules as today;
  7. crossings (stairs, flattening), water limit, level cleanup, cliffs, grounds, buildings and paths.
- **Rim of roads outside.** A road tile that lies on a cliff piece or an inner ring draws no rim underlay (the ground of the lower
  neighbour), so the cliff shows through the rim. Done (the sand fringe at the inner ring edge was the underlay drawn over the cliff top).
- **House path network, global.** After all buildings are placed, the front strips (2 rows along the whole south edge) and the
  street form a graph: the nodes are the strips and the sidewalk of the streets, the edges are shortest paths (breadth first over free
  tiles). The paths are the minimum spanning tree of this graph: every building is connected once, to the street or to a nearer
  building, and the network reaches the street at as few places as the tree needs. A building whose strip cannot be reached is
  dropped. The longest connection grew from 10 to 14 tiles so the tree has room (judged by eye). Paths stay 2 tiles wide.

### Town layout and the urban catalog (plan of 2026-11-18, to be confirmed before the first line of code)

Why: the through streets, the gates, the pads and the first buildings exist, but the layout is a random try-and-reject placement of
seven fixed 5 x 4 rectangles of the private `Outside` sheet (`townLayout.ts`). That cannot carry larger buildings with
conditions ("on a corner lot", "only in towns of 3 x 3 chunks", "at most one", "needs a plaza in front"). The layout becomes a
planner with lots, and the buildings become a catalog, like the decoration.

**Pipeline of a town** (a pure function of the town, cached per town; each step reads only the earlier ones; the terrain never
reads it):

1. **Through streets** (exist): gates joined by `townStreets`.
2. **Side streets and blocks:** from the through streets, side streets branch off at right angles at a hashed spacing
   (`TOWN_BLOCK_MIN_TILES` .. `TOWN_BLOCK_MAX_TILES`, to be measured by eye), 2 tiles wide (the through streets stay 3). A side street
   ends at a block edge, at another street, or as a dead end with a small plaza. The space between streets is a **block**.
   Only straight segments and right angles, like the through streets; no street leaves the plateau.
3. **Lots:** a block is cut into **lots**: rectangles that touch a street with their frontage (the side towards the street, at
   least the width of the smallest building). A lot has width, depth, the side of its street and a distance to the town centre
   (centre or edge). Lots are a pure function of the blocks and the town hash, so they are stable.
4. **Assignment:** the catalog items are matched to lots by their conditions (below). First the required and unique ones (Center,
   Mart, town hall) on the best lots, then the others by weight; a lot that no item fits becomes a garden, a park, a small plaza or
   stays empty (trees, fence). Nothing is placed on guesses: an item whose conditions fail is skipped, never forced.
5. **Entrances and paths:** the entrance of every placed building is connected to its street, the house path network (exists) joins
   what is left over. The entrance comes from the item, not from a guess about the sprite.
6. **Props:** plazas, fountains, lamps along streets, trees, hedges and fences, fences at the open edge of the plateau.

**Catalog.** `WorldNoise/assets/urban/` (git-ignored like every asset) holds **one PNG per item or variant** (`<name>.png`,
`<name>-<variant>.png`), `src/urban/urbanTable.ts` (committed, typed) describes them, the same two rules as `deco`: a missing PNG
draws a rectangle in debug mode, and a new item is a PNG plus one table row, no engine change. The deco and the urban catalog share
the parts that mean the same thing (sprite size, footprint, anchor, layer, parts, variants, frames) and the sprite renderer; the
urban table adds what a building needs:

| Property | Meaning |
|---|---|
| kind | `building`, `prop`, `plaza`, `ground` (a patch of own paving or lawn), `fence` (a strip like the cliff ridge); the planner step that places it |
| sprite, footprint, anchor | as in the deco table; a roof or an overhanging part is an `overhead` part, the footprint is the blocked base |
| front | the side with the entrance (default south: the Pokemon view has doors on the south) and the **entrance tile**, the column on the front edge where the door path starts |
| lot | the lot it needs: minimum frontage and depth, free tiles in front (the door yard), corner lot or not, distance to the centre (`centre`, `edge`, `any`) |
| town | which towns: minimum and maximum chunks, shapes, plateau level, the biome of the town cell, generated or designed |
| count | `unique` (at most one per town), `min`, `max`, or only a weight; `required` items are placed first |
| near, excludes | needs a street, plaza or another item within N tiles; must not stand next to a given item or the same item |
| parts | an item may be several parts with their own layer and offset (body, roof, chimney, sign, garden, fence): **all parts valid or the item is not placed** (atomic), so complex items stay one table row |
| variants, weight | a look picked by hash; weight in the pool of its kind |

A condition is a declarative field, evaluated by one generic matcher; there is no code per item. If an item needs a rule the
fields cannot say, the field is added to the matcher for all items (the table stays data), after talking about it.

**Rendering.** Buildings and props go through the sprite pass of the deco (sorted by `(layer, row, column)`, level shade, overhead
parts), so large buildings with roofs work with the cliffs, trees and stairs without extra code. The tile pieces of the `Outside`
sheet (`townDecorationAt`) disappear in step 1 after the seven buildings have been cut into `assets/urban/`.

**Chunk locality.** The layout of a town is computed once per town (cache `TOWN_CACHE_MAX_ENTRIES`), as it is today, and a chunk asks
the town for the items that reach into it. The reach of the largest building is bounded by the footprint of the town, so the guard of
the deco (largest reach plus margin inside the terrain block) is checked for towns too.

Built in this order, each step measured and looked at before the next:

1. **Catalog and renderer:** `urbanTable.ts`, the loader, the seven existing buildings cut into `assets/urban/` by a one-off script,
   drawn through the sprite pass; the layout still places them as today (no visible change, the proof that the catalog works).
2. **Side streets, blocks and lots** as a pure plan with a debug overlay (streets, lots with their frontage; built 2026-11-18). The side streets are not painted into the road mask and the layout does not read the lots until step 3, because both belong to the assignment; measured: how many lots of
   which size a town of 2 x 2, 3 x 3, L and T has, no street leaves the plateau, no street touches a cliff, a chunk equals the whole map.
3. **Assignment with conditions:** required and unique items, weights, empty lots; measured: share of lots filled, towns without Center.
   **Built (2026-11-18), first version:** unique items on the best lots (through-street frontage, then near the centre), weighted houses on all other lots that fit, the side streets painted as paths, no conditions beyond size, `unique` and `minTownChunks` yet (the table has only seven items); measured: every lot filled, every town has Center and Mart; see docs/towns.md.
4. **Entrances and paths (built in part, 2026-11-18, decided with the user):** the whole south row of a lot without a street is paved (front strip), a house may stand up to 2 rows back and then a one tile wide path leads from the front strip to the door column of its sprite (`doorColumn` in the table); measured on 124 towns: all 2 231 buildings connected, every front strip and every door tile paved, no overlap. Open: doors that are not at the south, the entrance as a condition, plazas in front.
   (original text:) **Entrances and paths:** door paths from the entrance tile, the house path network for the rest.
5. **Props:** plazas, fountain, lamps, trees, hedges and fences, open edges.
6. **Designed towns** use the same catalog (a template is a fixed set of placements) and come after step 5.

Good when: every building has an entrance connected to a street, no item stands on a street, a stair, a cliff or the edge of the
plateau, two chunkings of one town give the same layout, a chunk stays within the time budget, and a new building needs only a
PNG and a table row.

Decided with the user (2026-11-18):

- **Facing:** buildings face south by default (the `front` field exists for exceptions, an item with another front has its own sprite).
- **Sizes:** the smallest house is 4 x 3 tiles, a large one 7 x 6 or 7 x 7; no building is wider than 9 or taller than 10 tiles
  (`URBAN_MAX_WIDTH_TILES` 9, `URBAN_MAX_HEIGHT_TILES` 10; the table rejects larger sprites). A lot is therefore at least 4 x 3 and at most
  9 x 10 plus the door yard, and the reach guard uses 9 x 10.
- **Catalog start:** Center, Mart and houses, then shopping centre, apartment block, high-rise, mansion and gyms (the larger buildings
  are `unique` or `max` limited and want the `centre` lots or a big lot).
- **Art:** the first art comes from the private `Outside` sheet (`assets/tilesets/outside.png`, not cleared for publishing, so dev only,
  see "Two asset versions"); the public version gets its own art through the same table.
- **Side streets may be curved.** One rule bounds it: no thin spots, so a street, a block and a lot never get narrower than their
  minimum (a street keeps its width of 2 along its whole course, a block between two streets is at least as deep as the smallest lot,
  and a pinch of a block or lot under the minimum is merged into a neighbour or becomes park). Curves are the later layout; step 2
  starts with straight side streets, and the thin-spot rule is measured the same way for both.

### Town margin and the 7 x 7 cell (plan of 2026-11-18, confirmed by the user, steps 1 and 2 built)

Why: with the lots (see above) the buildings stand right on the edge of the plateau, which later looks unclean and leaves no room
for a ring of trees, hedges or fences. A margin around the town is the room for that ring. The cell gets bigger so that the larger
towns and the margin keep the distance between two towns.

Decided with the user (2026-11-18):

- **Cell 7 x 7 chunks (112 tiles), buffer 2 chunks** (`CELL_SIZE_CHUNKS` 7, `CELL_BUFFER_CHUNKS` 2). The block for the town is still
  3 x 3 chunks in the middle of the cell, so the shapes of `townShapes.ts` stay as they are. Reason: the plateau grows by the margin
  and the plateaus of two neighbouring towns must keep their distance. The step from 5 x 5 to 7 x 7 is enough for now.
- **A town is a core plus a margin.** The **core** is the footprint of whole chunks as today (2 x 2 to 3 x 3 chunks, the shapes of
  `townShapes.ts`). The **margin** is a strip of `TOWN_MARGIN_TILES` (8, a first guess that may be too much: judged by eye, 6 to 8) around the core:
  the dilation of the core by that distance, so a convex corner is rounded with the radius of the margin, a concave corner stays sharp
  and the margins of two arms of an L or T simply overlap. The plateau is core plus margin: a 2 x 2 chunk core (32 tiles) has a plateau
  of 48 x 48 tiles, a 3 x 3 chunk core of 64 x 64.
- **What lives where.** Lots, side streets and buildings are placed in the core only. The margin is the zone for the ring of trees,
  hedges and fences (step 5 of the urban plan) and for nothing else; the through streets cross it from the core to the gate. The sprite of a
  building may overhang the margin and the plateau edge: roofs and crowns reach into the margin, and a high-rise at the north of the town may
  visually rise out of the edge of the town (its footprint stays in its lot). Decoration still keeps out of the whole plateau.
- **The wobble acts on the margin only.** The outline is the edge of the margin eroded by the stepped noise of `TOWN_OUTLINE_WOBBLE_TILES`
  (4), so the edge lies 4 to 8 tiles outside the core and never cuts into the core; the lots keep clean chunk edges. At a gate the wobble
  tapers to 0 as today, so the edge is straight there and the margin is full.
- **The ground of the margin is the ground of the biome** (not the town paving, not `cityGrass`: a ring of grass would look like a ring);
  the core keeps `city` paving, the streets keep `cityStreet` also where they cross the margin.
- **Water in the margin becomes land,** up to the 8 tiles of the margin, like water inside the footprint today. A town on a coast pushes the
  coast out by up to 8 tiles, which is accepted: a town changes the land anyway, and the place may later get a harbour. The land rule (97 %, lowered to 70 % on 2026-11-18, see docs/towns.md)
  still checks the core only. The plateau level is the most common land level of the base ground in the core. Water in the margin counts
  like water at the edge for the water clearance of the plateau level (`waterClearanceTiles`), so such a town is level 2 or lower.
- **Gates and pads sit on the outer edge of the margin.** The gate is the outermost plateau tile of its lane, the pad, the landing and the
  terrace ring follow outside, measured from the union of plateau, margin and pads as before. Ring, pad and landing stay within 16 tiles of
  the plateau (`TOWN_RING_WIDTH_TILES` 8, pad 4 plus landing 6), so they lie inside the cell: the core is 32 tiles from the cell edge, the
  plateau 24 and the ring and landing end 8 tiles before it; two plateaus are at least 48 tiles apart (32 before). The town does not shift
  inside its cell for now (more variation would need a bigger cell, not wanted yet).
- **A tile still finds its town through its own cell,** so the margin must lie inside the cell, which holds.

What changes in the code (each point is a task of the steps below): `townShapes.ts` (the check of the 3 x 3 block stays), `townPlacement.ts`
(core chunks, plateau level from the core, clearance around the plateau), `townTerrain.ts` (`townInfoAt` gets the zone `core`,
`margin` or `ring`; `inside` stays true for core and margin, so the roads, pads and ring keep working, and the code that needs the core
only (the layout, the lots, the town ground) reads the zone), `townGates.ts` (lanes from the outer edge of the margin), `townPads.ts`,
`townStreets.ts` (a street may run in the margin: `isFootprintPoint`), `townGrid.ts` (the box gets the margin; `usable` is the core), the
ground of the margin in `Chunk`/`groundOf`, `cellGrid.ts` (node area), and the constants. The waypoint nodes lie in the node area of the
cell, the 48 x 48 tiles in the middle, like the town block.

Not decided and left for later: the number of towns per area (`TOWN_CELL_PROBABILITY`, the size weights; with a
cell of 49 instead of 25 chunks there are about half as many towns and nodes per area, and the roads between two nodes are 112 instead of
80 tiles long), the padding of the road edges around a request (2 cells today; with the bigger cell 1 may do, to be measured), and all
numbers in `docs/` that the world change makes outdated (they are measured again with the build).

Built in this order, each step measured and looked at before the next:

1. **The 7 x 7 cell with the buffer of 2 chunks**, no margin yet: constants, node area, shapes check; measured: towns, nodes and roads per
   area, the time of a chunk (budget 3 ms for the roads) and of an edge, no plateau touches another.
   **Built (2026-11-18).** Measured on 24 x 24 cells (one seed): towns in 42.5 % of the cells (245; 4 chunks 83, 5 chunks 89, 6 chunks 46, 9 chunks 27), the smallest gap between two footprints 64 tiles (at least 48 needed once the margin exists), 1540 road edges (2.7 per cell), 29 ms per edge when planned cold.
2. **The margin (built 2026-11-18):** zone in `townInfoAt`, the rounded dilation with the wobble on the margin, water to land, the clearance, gates, pads, ring and
   streets on the new edge, the ground of the margin; measured: no level jump of two around a town (as before), the plateaus at least 48 tiles
   apart, every gate straight, a chunk equals the whole map, the time budget.
   **Town shapes (2026-11-18, decided with the user):** the shape kind is drawn first by weight (`TOWN_SHAPE_KIND_WEIGHTS`), then its rotation; new kind `O` (3 x 3 chunks with a hole in the middle where normal nature and decoration grow); numbers in docs/towns.md. **Measured (78 towns, 14 x 14 cells, one seed):** plateaus of 52 x 56 (4 chunks), 72 x 72 (5), 52 x 68 (6) and 68 x 68 tiles (9 chunks); the outline lies at least 4.3 tiles from the core; no level jump of two around any town (terrain levels before the cleanup); all 211 gates straight (3 before to 4 after the gate, 4 deep) once lanes with a short straight edge are skipped; 0 of 1594 crossings on 640 road edges without stairs; 8 347 water tiles of the margins became land; a cold terrain block takes as long as before (1.7 to 2.5 s for the first ones in a fresh page, same with and without the margin). Lots and the town layout read the core only (`townGrid` `usable` is `zone === 'core'`, so step 3 is already done for the grid).
3. **The plan reads the core:** `townGrid.ts` and the lots as described above; the old layout keeps working on the core.

Good when: lots, streets and buildings never touch the outline of the plateau, the margin is at least 4 tiles wide everywhere (the wobble
leaves 4 of the 8), roads and stairs work as before (no failed crossing more than before), and the world is still a pure function of the seed.

### Height levels and cliffs

Discrete height levels belong to the Pokemon look, so they are part of the plan, not a later extra.

- The redistributed elevation is cut into a few land levels (four) plus water. Cliff walls are drawn where two neighbouring
  tiles have different levels.
- Known risk, from `InfinityWalker` (`CLAUDE.md`: "very mountain-heavy landscapes, not visually pleasing"): cutting noise into
  levels gives speckle (tiny plateaus) and cliffs everywhere. Countermeasures to build and judge by eye: low frequency for the
  level noise, a minimum plateau size, and a cap on how often the level may change. This is the first thing to look at in the
  height step, before any cliff art.
- Neighbouring land levels differ by one step at most: measured on the terrain (see `CLAUDE.md`), not enforced; around a town
  the terrace ring enforces it.
- A cliff wall is a drawing rule of the render layer, using the cliff blocks of the sheet (brown walls and wooden stairs in
  column 1, snowy ones in 1.12 to 1.17). Its layout is still to be verified like the grounds.
- **Cliff pieces (decided 2026-11-16, both rings are built).** A cliff is a band of at least 2 tiles on the higher land: the outer ring
  is the 16-pattern (one 32 px tile per piece, hand-drawn: 3 x 3 frame plus the four inner corners in columns 3 and 4, the layout of
  `OFFSETS_IN_SHEET` in `cliffTiles.ts`, one file per level, `WorldNoise/assets/cliff-assets/cliff-N.png`), the inner ring is an autotile
  of the top texture (generated like the ground sheets) over the biome ground, so the inner edge blends into the plateau. A cliff
  may fall straight into water from level 2 (a level 3 plateau needs two tiles of level 2 between it and water, so both cliff sets show;
  the natural terrain keeps this, a town caps its plateau at 2 near water), but the inner ring never has water under it (its underlay is the own ground of the tile). The
  piece lies on the higher tile, so a plateau must be at least 2 tiles wide; that is why too small
  plateaus are cleaned (`levelCleanup.ts`). Where a road meets a cliff the edge must be straight for the stairs, so the road
  changes the level map around the crossing (a "road crossing", see Stairs below).
- Roads cross a level change on stairs. A town footprint is flattened by the plateau override (see Paths and towns).
- **Stairs (plan, in three steps):** the art is `assets/cliff-assets/stairs.png` (4 x 6 tiles of 32 px, described in `stairs.md`), an overlay
  that works over every cliff set. North/south stairs are 3 x 1 tiles on the straight cliff piece, the road is 3 tiles wide and goes
  straight through. East/west stairs are 2 x 4 tiles and too steep for one tile, so the cliff gets a bulge: the higher level grows one
  tile into the lower one for 4 rows, the stairs lie over it, the road below is shifted one row south of the road above (both
  variants, the stairs are drawn diagonally) and both ends of the road finish straight at the stairs. A road may end at a cliff or go around it when no stairs fit.
  (Stage 1, replaced by road planning 3 where it says so below.) Step 1 (built): a *crossing* is where a road passes a level change; the road is straightened around it and the level map
  flattened to a straight edge; step 2 (built): the north/south overlay on the three road tiles of the straight edge, `stairs.png` rows 4 and 5; step 3 (built): the east/west bulge in the level map, the 2 x 4 overlay and the road one row south on the lower side. Bridges later.
  Decoration is never placed on a wall.
- **Terrain scale:** the elevation and the level field use base frequency 0.01, features of about 100 tiles, so that a
  town of 2 x 2 to 3 x 3 chunks fits inside a landmass (at 0.02 hardly any footprint is mostly land). The measured values
  are in `CLAUDE.md`.
- Biome and level stay independent: the level is only the shape, the biome table decides the ground (higher elevation still gives
  more rock and snow).

### Decoration (plan of 2026-11-17, to be confirmed before the first line of code)

The world should look lived in, so there is a lot of decoration: big things (trees, boulders) with small things (flowers, tufts,
pebbles) between them. It is rule-based, not WFC, and a pure function of `(seed, position)` plus the terrain layers before it
(ground, levels, cliffs, roads, towns); the terrain never reads the decoration. Reason: a rule on `(seed, x, y)` is consistent
across chunk borders without extra work, which WFC was not in `InfinityWalker` (its deco layer there is described in
`InfinityWalker/js/tiles.js`: 1 x 1, 1 x 2, 2 x 2, 1 x infinite strips, infinite x infinite tall grass with edge variants, water deco,
"overlappable" deco that was a TODO, trees with repeatable middle parts, palms on the beach).

**What decoration needs to know** (the properties of one item, the user's list):

| Property | Meaning |
|---|---|
| size | the sprite is the PNG (width and height in tiles = pixels / 32); the **footprint** (tiles that must be valid and are blocked) is separate and may be smaller: a tree has a footprint of 1 x 1 or 1 x 2 and a sprite of 3 x 4 |
| anchor | where the footprint sits in the sprite (default: the bottom row, centred) |
| layer | `flat` (under everything that stands: flowers, pebbles, lilies), `object` (trees, rocks, sorted by the row of the footprint), `overhead` (crowns, hanging parts, above objects and cliffs) |
| parts | an item may be several parts with their own layer and offset (stacking): a tree = trunk on `object` + crown on `overhead` |
| where | biomes with a weight each (the density and the pool), the ground of a footprint tile has to be a biome of the item (there is no separate `grounds` list, removed 2026-11-17: the biome keys do the job), surface `land`, `water` or `both`, optional level range, optional "near water" |
| clearance | tiles around the footprint that stay free of earlier-pass items (trees side by side need none: the `grove` pass and `overlapsDeco` make them touch; there is no `repeat` flag, removed 2026-11-17 because nothing used it) |
| overlap | whether its sprite may cover other deco (`overlapsDeco`) and cliffs (`overlapsCliff`: the footprint never stands on a cliff, only the overhang may reach over it); a footprint never overlaps another footprint; roads, stairs and towns are never covered |
| variants, frames | `variants` = several PNGs of the same item (picked by hash), `frames` = animation frames side by side like the water (same frame clock) |
| weight, size class | weight in the pool, and the size class decides the pass (below) |

**Files.** `WorldNoise/assets/deco/` (git-ignored like every asset) holds **one PNG per item or variant** (`<name>.png`,
`<name>-<variant>.png`). The description of all items is one table, `src/deco/decoTable.ts` (committed, typed): data about the art,
not art, so a clone knows the items; a missing PNG draws nothing (a rectangle in debug mode), so the table may run ahead of the art.
Adding an item = a PNG plus one table row, no engine change (the rule of "More assets must be addable later").

**Placement, in passes from big to small.** Each size class is a pass with its own jittered grid:
`large` (cell 6: trees, boulders), `medium` (cell 4), `small` (cell 2), `flat` (cell 1). In a pass:

1. A cell draws a hash of `(seed, pass, cell)`: it is filled with the probability `density(biome, pass) x cluster`, where `cluster`
   is a low-frequency noise (groves and clearings, so trees stand in groups and not evenly); the position inside the cell is jittered
   by the free room (cell size minus footprint minus clearance). **By construction two candidates of one pass never overlap** (the cell is as big as the
   largest footprint plus clearance), so no pass has conflicts inside itself. Touching trees use clearance 0 and no jitter.
2. The item is picked from the pool of the biome by weight, among the items whose `where` fits the ground under the candidate.
3. **Valid** when every footprint tile has an allowed ground, one level for the whole footprint, no road (and no rim of a road), no stairs or
   crossing footprint, no cliff piece (the inner ring of a cliff is allowed; decided with the user 2026-11-17, the cliffs looked bare), and no town (plateau, pads, landings and the terrace ring; decided with the user: no deco in the ring for now), and the overhang
   covers no road, stairs or town and covers cliffs or deco only when the item allows it.
4. **Accepted** when valid and no *accepted* item of an earlier pass overlaps its footprint plus clearance. The accepted items of the earlier
   pass depend only on terrain and on still earlier passes, never on their own pass, so the chain is as long as the number of passes, not unbounded: the result of one tile
   depends on a bounded neighbourhood, and every chunk computes the same answer. Small items thereby fill the gaps between the big ones.

Density, pools and clustering are per biome (a table next to the items). "Lots of decoration" means high first values (`large` 0.3,
`medium` 0.4, `small` 0.5, `flat` 0.35 of the cells, to be judged by eye); a Wallpaper Engine property for a global density factor is possible later.

**Terrain context and chunk locality.** An item belongs to the chunk of its anchor but needs the terrain around the chunk: the margin is twice the
largest sprite reach (the neighbours of the neighbours decide). `Chunk` computes its grounds today for the chunk plus one tile; the plan is to extract a
**terrain block** function (grounds, final levels, cliff flags, road mask, town info, stairs for a chunk plus a margin) that `Chunk` and the deco share, and a
`decoOfChunk(cx, cy)` cache of its own. Whether the larger block is affordable is measured in step 2 (the chunk budget of 3 ms for roads stays; if the margin is too
expensive the deco is computed per block of 2 x 2 chunks and cached). A guard like the one for the town ring checks that the largest reach plus
the margin stays inside what the terrain block provides.

**Rendering.** A **deco pass after all tiles** of the visible chunks (the tile pass stays as it is: ground, cliffs, stairs, town pieces, level shade): all items of the
chunks in view plus the ring of chunks whose items reach into the view, sorted by `(layer, row of the footprint, column, hash)`, drawn
scaled with `drawImage`. The sort is cached while the set of chunks does not change. Overhead parts come after all object parts, so a crown covers a
neighbour's trunk and a cliff, like in the Pokemon games. The level shade (a tint per tile) **is** applied to deco (decided with the user): a sprite is tinted by the shade of the level of its footprint, using a copy of the sprite per level made once (`source-atop` fill on an offscreen canvas) and cached, so transparent parts stay transparent.
Items with frames use the animation clock of the water.

**Water and cliffs.** Surface `water` items (lilies on shallow water, rocks that stand out of the water) have a footprint on water tiles, layer `flat` or `object`, and are drawn
after the water because the deco pass is last. A tree whose crown hangs over a cliff edge uses `overlapsCliff` and an overhead part; its footprint stays on level ground.

**Forests, meadow blobs, strips and fields (decided with the user 2026-11-17 after the first look).**

- **Forests (built, step 5).** A `grove` pass with cells of 2 x 2 tiles in front of the big pass: trees (footprint 2 x 1) have `overlapsDeco`, so only their footprints must stay apart and the crowns may overlap, and the tree rows are sorted by the footprint row so a lower tree covers the crown of the one above. A low-frequency
  noise (`DECO_CLUSTER_FREQUENCY_BY_PASS`) with a strong strength makes forests and clearings, `DECO_DENSITY_BY_PASS_AND_BIOME` the density per biome (forest 0.6, meadow 0.12 ...). The tree pieces of `InfinityWalker` that join crowns (`tree0_top_left_repeat_0`, `..._right_repeat_0`, `..._repeat_1`, tiles (4,36) to (5,37)) are a 2 x 2 crown module with
  the peak in the middle and a seam below: it widens a crown by 2 tiles, so a wide canopy is left half + n modules + right half. That is a strip (below), used for tree rows and forest edges, after the overlapping trees have been judged by eye.
- **Meadow blobs (built, step 5).** Round or oval patches in meadow, steppe and savanna, one cell of 40 tiles each with the chance 0.6, centre jittered; the radii (3 to 8 tiles, width and height apart), the angle, `rough` (edge noise, 0.05 to 0.35) and `dither` (soft edge band, 0.15 to 0.5) are drawn by hash, so no blob is a perfect circle.
  Inside, the `small` and `flat` passes fill with the items marked `blob` (tufts, ferns; density 0.95 and 0.9) and every other pass is thinned out by the blob strength, so no rocks, logs or trees stand in a blob: a large meadow with dense grass.
- **Strips (step 6), 1 x N.** An item that is a left end, a repeatable middle and a right end, N tiles long (cliff ridge `cliff_0` left, `cliff_1` middle, `cliff_2` right, 3 to 8 tiles, rare, horizontal, on land); the generalisation is a strip of whole columns (several rows), which makes the tree rows with the crown module.
- **Fields (step 7), M x N.** Tall grass is an area, not an object: a rectangle of 3 x 3 up to about 6 x 5 tiles (the 9 pieces have corners, edges and a centre, no inner corners, so only rectangles; three looks: light green, dry yellow, dark green by biome), about one field per three chunks, drawn as an overlay under the objects.
  It reuses the autotile code of the grounds with a 9-slice rule, not the item code.

**Not part of this plan:** big structures (houses, ruins, wells; "prefab stamping" with a margin of its own), decoration inside towns (that is the town layout: trees along
streets, fences), animals, collision. The table is built so that a structure is later one more item with a large footprint and `parts`.

**Done when** (measured, then looked at): the same items stand at the same tiles whichever chunk computes them (compare two chunkings of one area), no item
stands on water (unless it is a water item), road, stairs, cliff piece or town, the number of items per 100 tiles per biome is in the wanted range, one chunk stays within its time budget, and a new item
needs only a PNG and a table row.

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
- **Own art:** where no ready autotile exists, a base sheet in the same 96 x 128 layout is generated from a seamless 32 x 32 px texture
  (the preview page, `src/tools/autotileGenerator.ts`) and decorated in Photoshop. Its edges are transparent, so the ground below shows
  through (the renderer has to draw that ground first). The edge bumps repeat every 32 px, which is what lets quarters be reused; a random
  variant within one ground is not planned. The rules and the template are in `DesignCorner/autotile-template/`.
- **A ground per biome (decided and built 2026-11-16).** With own generated sheets, every biome has its own ground and sheet
  instead of the seven shared grounds (Steppe `grass-light-wild`, Savanna from `grassDry`, Meadow `grass`, Beach `sand`, Desert
  `desert`); the rank order is wetter and warmer covers (`groundRank.ts`). Later, each biome gets a second ground, a bare one (dirt) beside its
  natural cover (meadow with dirt patches), which also allows small secret paths inside a biome that do not belong to the world path
  graph. First pair: `grass` and `dirt`.
- **Animated water:** a ground can have several frames (the Essentials way, frames side by side). The renderer picks the frame
  from the time, the same for all tiles, so the sea moves as one. The frame count and speed are constants.
- Until the art exists, the renderer draws flat colors with placeholder masks, so the pipeline can be tested without assets.

### Assets during development and at publish

- **Development:** the Pokemon graphics of the local Essentials v19.1 folder (autotiles and tilesets) may be used to build and
  look at the world quickly. The origin of its tilesets is not credited in its `Credits.txt` and the art comes from Nintendo games.
- **Publish:** before anything is published, every such asset is replaced by one with a clear license (for example the Alienor
  tileset with credit, or own art). The data table below makes that a swap of table rows, not a change of the engine.
- **Not in git:** the repo has a GitHub remote and no asset is committed at all, cleared or not (rule 2026-11-16): everything lives in
  the git-ignored `WorldNoise/assets/`, so the repo has no license question. The user clears what a publish embeds.

### First content and extensibility

Source: the inventory of `DesignCorner/private/dewbuse-*.png` (cells `column.row`, 128 x 96 px each, roughly verified).

- **Grounds, first guess of the rank order:** deep water (2.6), water (2.5), sand (2.0), grass (base), dirt (2.2), rock (2.7),
  snow (from 2.13). Because the rim is baked in, grass is the base and the others lie on it as overlays.
- **During development** the grounds came from the Essentials autotiles; they are replaced by own sheets in `assets/autotiles/`.
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
- [x] Path graph: cell nodes, edge hashes, degree rule, bent roads (replaced by road planning 3), bridges (waypoint nodes only, the bridge is a flat color)
- [x] Stairs where a road crosses a level change (crossings of the bent road, see Road planning for the next stage)
- [x] Road planning 1: waypoint nodes on the best land (largest clearance of 48 hashed candidates)
- [x] Road planning 2: town gates, one per side with an edge, the bent line ends there (straight road to the node inside until the town streets exist)
- [x] Road planning 3: grid path finder with stairs as crossing rules, replacing the bent line, the walk for crossings and the straightening (`road/roadPlanner.ts`, with a gap of 4 tiles between two crossings of a road, so step 5 is done as far as the footprints allow)
- [x] Road planning 4: rounded corners and gentle waves on long straights outside towns (`road/roadSmoothing.ts`)
- [x] Road planning 5: stairs closer together: 4 tiles apart for all crossings (a footprint is 3 tiles each side of its boundary, two footprints stay consistent when the boundaries are 3 apart for north/south and 4 for east/west because of the bulge; 3 for north/south is a later small gain)
- [x] Larger terrain features (base frequency 0.01) so that towns of 2 x 2 to 3 x 3 chunks fit into landmasses
- [x] Town candidates, land check, footprint shapes, gates (the gates are where the straight roads enter the footprint)
- [ ] Generated towns: rule-based layout in the footprint (road loop, lots, houses, Center and Mart, trees and fences)
  - [x] First buildings: Center, Mart and houses from the private `Outside` sheet placed along the existing roads (`townLayout.ts`)
  - [x] Town streets inside the plateau (through streets, side paths to the houses)
  - [x] Zoom-out overview (2026-11-18): below 10 px per tile a coarse sampled view (towns pink outlined over the roads) instead of chunks, see docs/world-and-render.md (`OverviewRenderer`), to see the whole ratio of towns, roads and nature
  - [ ] Town margin (steps 1 and 2 built, the lots read the core) and the 7 x 7 cell (plan in "Town margin and the 7 x 7 cell": cell and buffer, the margin, the plan reads the core); before the layout uses the lots
  - [ ] Town layout and urban catalog (plan in "Town layout and the urban catalog": catalog and renderer, side streets, blocks and lots, assignment with conditions, entrances, props)
- [ ] Designed towns: template format, stamping with rotation, Marmoria City rebuilt as the first (dev) template
- [x] Town plateau: height override inside the footprint, terrace ring (level limited to P - 1 .. P + 1)
- [ ] Fences or trees where the edge of a town is open (no cliff wall)
- [x] Town outline: wavy and stepped; the footprint only loses area (`TOWN_OUTLINE_WOBBLE_TILES` = 4, stepped noise), so it never leaves the chunk block and towns never overlap. Layout, gates and roads still treat the whole chunk footprint as the town (the layout step has to follow the outline)
- [x] Smooth the town outline at the gates (a straight edge where a road enters, because the stairs go there): gates first on the footprint edge, then the wobble tapers to 0 around them
- [x] Cliff pieces for the east, west and north side from the rock kit of the private `Outside` tileset; corners by laying two pieces over each other
- [x] Cliffs redone with the 12 stone pieces of `InfinityWalker/img/tileset.png` (edges, outer and inner corners, one set per level); the Outside rim pieces did not fit together
- [x] Plateaus and lower land at least 2 tiles wide (`elevation/levelCleanup.ts`), the base for the 16-pattern cliff pieces
- [x] Cliffs, outer ring: 16-pattern pieces on the higher tile, from `assets/cliff-assets/cliff-N.png`, the lower neighbour under the corners
- [x] Cliffs, inner ring: a top-texture autotile over the biome ground (`cliff-autotile-N.png`), never water under it
- [x] A straight cliff edge where a road meets a cliff (road crossings: road straightened, level map flattened)
- [x] Stairs where a road crosses a cliff, north/south: overlay of `stairs.png` on the straight cliff piece
- [x] Stairs, east/west: bulge in the level map, 2 x 4 overlay, road one row south of the road above
- [ ] Rule-based decoration (plan in "Decoration")
  - [x] 1. `assets/deco/` and `src/deco/decoTable.ts`: types, loader (one PNG per item or variant, a missing PNG draws nothing), a small dev set (a one-off script may cut items from `InfinityWalker/img/tileset.png` by the cells in `InfinityWalker/js/tiles.js`)
  - [x] 2. Terrain block shared by `Chunk` and the deco (grounds, final levels, cliff flags, roads, towns, stairs, with a margin); measure the chunk time before and after
  - [x] 3. Placement core without drawing: passes, hashes, validity, acceptance, a measure script (items per 100 tiles per biome, rejection reasons, two chunkings give the same items), a debug overlay of footprints
  - [x] 4. Deco pass in the renderer: layers, sorting, frames, the ring of neighbouring chunks; first items (a tree, a flower)
  - [x] 5. Forests (grove pass), meadow blobs, densities tuned by eye
  - [x] 6. Strips (1 x N): the cliff ridge (done); tree rows with crown modules (still open)
  - [x] 7. Fields (tall grass, 9 pieces, rectangles) as an overlay
  - [ ] 8. Water and cliff overhang review, items with parts, the final numbers in `docs/deco.md`
- [x] Own autotile tooling: base sheet generated from a texture in `/autotile-preview.html`, template and rules in `DesignCorner/autotile-template/`
- [x] A ground per biome: one ground per biome (rank order, sheet table into `assets/autotiles/`), flat color where a sheet is missing
- [ ] Second ground per biome (bare earth beside the natural cover) and small secret paths inside a biome
- [x] Draw the lower ground under a tile with a transparent autotile rim (`Tile.draw`), so own sheets show the neighbour and no background
- [ ] First own ground (grass) decorated in Photoshop and checked in the preview, then the other grounds
- [ ] Replace every development-only asset by a cleared one, and own town templates; check that `dist/` embeds only cleared assets (it embeds everything in `assets/`; no asset is committed)
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
- **Deco: a global density property** for the Wallpaper Engine panel (the item table lives in `src/deco/decoTable.ts`, the first art is cut from
  `InfinityWalker/img/tileset.png` by a script, the level shade applies, the town ring stays free: all decided with the user 2026-11-17).
- The list of town shapes beyond 2 x 2, 3 x 3, L and T.
- Which properties are worth exposing besides the seed (ocean share and noise zoom rebuild all chunks). A water animation
  speed property needs its own animation clock; scaling `nowMs` would make the frame jump whenever the value changes.
