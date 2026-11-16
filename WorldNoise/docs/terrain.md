# Terrain: noise channels, biomes, height levels

Part of [WorldNoise](../CLAUDE.md). Every channel is a pure function of `(SEED, x, y)`; nothing is stored. Source folders:
`src/core/` (generic noise primitives), `src/elevation/`, `src/moisture/`, `src/temperature/`, `src/biome/`.

## Constants

All in `config/constants.ts`. **`SEED`** is the one root seed of the project; each channel salts it with its own name
(`${SEED}:elevation`), so channels are not identical noise fields. Per channel: `ELEVATION_*`, `MOISTURE_*` and `TEMPERATURE_*`
each have octaves, base frequency, persistence, lacunarity, raw range low/high and contrast. Elevation adds the limits
`ELEVATION_DEEP_WATER_LEVEL`, `ELEVATION_SEA_LEVEL`, `ELEVATION_BEACH_LEVEL`, `ELEVATION_ROCK_LEVEL`, `HEIGHT_LEVEL_OCTAVES`,
`HEIGHT_LEVEL_THRESHOLDS`. Temperature adds `TEMPERATURE_REFERENCE_ELEVATION` and `TEMPERATURE_DROP_PER_ELEVATION`;
`MOISTURE_BAND_THRESHOLDS` / `TEMPERATURE_BAND_THRESHOLDS` cut the biome table.

## Modules

- **`core/noise.ts`** (new, generic infra alongside `core/Ticker.ts`) — `createFractalNoise2D(seed, octaves,
  baseFrequency, persistence, lacunarity)`: wraps `simplex-noise`'s `createNoise2D`, seeded via `alea(seed)` (so
  the same seed always regenerates the same world — no world state needs to be stored/persisted). Layers
  `octaves` calls of simplex noise at doubling frequency (`lacunarity`) and halving amplitude (`persistence`) —
  classic fractal Brownian motion — and normalizes the weighted sum from simplex's native ~[-1, 1] range to
  [0, 1]. Knows nothing about elevation/tiles/biomes — purely a noise-field primitive, reused as-is by the
  elevation, moisture and temperature channels.
- **`elevation/elevationNoise.ts`** (new) — `export const elevationNoise: Noise2D`, a single module-level
  function: the private raw fractal noise (`createFractalNoise2D` + the `ELEVATION_*` constants above) passed through
  `redistributeElevation`. A ready-to-call function, not a class to instantiate — there's currently no live-mutable
  elevation state (no WE property changes the seed), so unlike `ColorWar`'s `WorldPreset` this doesn't need to be
  owned/passed around by `World`; `Chunk` just imports it directly.
- **`core/redistribute.ts`** (new, generic like `core/noise.ts`) — `createRedistribution(rawRangeLow, rawRangeHigh,
  contrast)`: raw fractal noise is bell-shaped (98 % of the values between 0.24 and 0.76, half between 0.4 and 0.6),
  so the raw range is stretched to 0..1 (values outside are clamped) and then pushed away from the middle by an
  S-curve. `contrast` is in [0, 1): 0 leaves the stretched value unchanged, higher values give more lowland and
  highland and less middle. Both ranges are checked when the function is created, so a bad constant fails loudly
  instead of producing NaN. The result is symmetric around 0.5. Every noise channel makes its own redistribution
  from its own constants.
- **`elevation/redistribute.ts`** (new) — `redistributeElevation`, the redistribution made from the `ELEVATION_*`
  constants. Retuning those moves the elevation limits (`ELEVATION_*_LEVEL`) used by the biome table, which are measured
  against the redistributed values.
- **`moisture/moistureNoise.ts`, `temperature/temperatureNoise.ts`** (new) — `moistureNoise` and `temperatureNoise`,
  built like `elevationNoise` (own seed salt `${SEED}:moisture` / `${SEED}:temperature`, fractal noise, own
  redistribution), one folder per channel. Base frequency is 0.005, half of the elevation's 0.01; a biome patch is about
  80 to 100 tiles wide (looked at in the biome map at this frequency), the terrain features about 100, so patches are
  about as large as the terrain features or larger. Contrast is 0.2, which makes each channel close to
  evenly spread over 0..1 (5 10 12 12 11 11 12 12 10 5 percent per tenth), so every (moisture, temperature) cell of a
  biome table is about equally likely. Measured on 250 000 tiles: correlation between any two of elevation, moisture
  and temperature is below 0.01. Temperature is plain noise, not tied to a latitude (the world is endless and has no
  latitude); how it falls with height is `temperature/temperatureAtElevation.ts`.
- **`temperature/temperatureAtElevation.ts`** (new) — `temperatureAtElevation(temperature, elevation)`: the air gets
  colder with height, `TEMPERATURE_DROP_PER_ELEVATION` (1.2) per unit of elevation above
  `TEMPERATURE_REFERENCE_ELEVATION` (0.58, the measured mean elevation of the land, so cold and hot land stay about
  equally common: 32 % each of the land below the rock limit). The biome table uses this value for the temperature
  band. Result: a cold region has snow down to the lowland; where the base temperature is in the hot third, the highest
  tiles above the rock limit are snow peak for 27 % of them and rock for the rest, and lower down such a region stays
  steppe, savanna or desert. Only the base temperature noise is called hot or cold here; the band of a tile uses
  the temperature after the drop.
- **`biome/biome.ts`** (new) — `biomeAt(elevation, moisture, temperature)` returns a `Biome` (its `id`, which is also its
  ground). Water, beach and mountain follow the elevation (`ELEVATION_DEEP_WATER_LEVEL`, `_SEA_LEVEL`, `_BEACH_LEVEL`,
  `_ROCK_LEVEL`), land is a 3 x 3 table by temperature band (cold, mild, hot, from `temperatureAtElevation`) and moisture
  band (dry, normal, wet), both cut at one third and two thirds: snow field, tundra, snow forest / steppe, meadow,
  forest / desert, savanna, jungle. Above the rock limit the tile is snow peak if its temperature band is cold, else
  mountain. Every biome is its own ground with its own autotile sheet ([tileset.md](tileset.md)). Measured on 1 440 000 tiles: the nine land biomes are 5.4 to 7.8 % each,
  deep and shallow water 12.5 and 11.4 %, beach 5.8 %, snow peak 11.6 %, mountain 3.4 %. Mountain tiles together are
  15 % of the world (above the rock limit 0.85); with the first limit 0.72 they were 31 % and mostly snow, the
  `InfinityWalker` mountain problem again.
- **`elevation/heightLevel.ts`** (new) — `heightLevelAt(x, y, elevation)`: level 0 is water (elevation at or below
  `ELEVATION_SEA_LEVEL`), land gets level 1..N from a *smoothed* elevation, i.e. the same seed with only
  `HEIGHT_LEVEL_OCTAVES` (2) octaves, redistributed like the full elevation and cut at `HEIGHT_LEVEL_THRESHOLDS`.
  Same seed means the smoothed field is the low-frequency part of the full one, so levels and ground stay
  correlated. `cliffTypeOf(level, neighbours)` gives the cliff piece of a tile at level 2 or higher that has a *lower*
  neighbour, water included (the piece lies on the higher tile; two orthogonal lower neighbours make an outer corner, one makes an edge
  named by the side it goes down to, only a lower diagonal makes an inner corner, null without a lower neighbour). Level 1 has no
  piece: its border with water is a ground transition, a shore. A cliff may fall straight into water from level 2; a level above 2 keeps a clearance to water (see
  `levelCleanup.ts`). Neighbouring land levels differ by at most one step in the natural terrain (checked on 1 000 000 tiles; with
  all 4 octaves a few jumps of two appeared); around a town the terrace ring keeps it. There are four land levels, cut at
  `HEIGHT_LEVEL_THRESHOLDS` 0.52, 0.75 and 0.9 (before, three levels at 0.55 and 0.8). Why smoothed and not a
  filter: a 5 x 5 majority filter on the levels was measured and made it worse (tiny interior plateaus 16 to 198 in
  600 x 600 tiles at the old terrain scale), because it breaks the narrow middle band into pieces. Both noises use
  `ELEVATION_BASE_FREQUENCY` (0.01, features of about 100 tiles; the reason is in [idea.md](../idea.md), Paths and towns). Measured
  on one seed and 1 024 x 1 024 tiles (read the numbers as an order of magnitude): water 24 % of the tiles, land 25.6 / 19.9 /
  17.9 / 12.6 % over levels 1 to 4 (the three levels before: 36 / 28 / 36 %).
- **`elevation/levelCleanup.ts`** (new) — two steps on the level block of a chunk. `limitLevelsNearWater(levels, size)`: a level
  above 2 needs a clearance to water, 3 tiles for level 3 and 5 for level 4 (`waterClearanceTiles`, 1 + 2 per level above 2 in
  `heightLevel.ts`; `maxLevelAtWaterDistance` is the inverse), so between a level 3 plateau and water lie two tiles of level 2 and
  both cliff sets show; the level of a tile is the lower of its own and what the distance to the nearest water allows (Chebyshev
  distance, searched up to `WATER_LIMIT_REACH_TILES`, 4). `cleanHeightLevels(levels, size)`: no plateau and no lower land is thinner than
  2 tiles, because the 16-pattern cliff pieces (one 32 px tile per edge and corner) cannot draw a 1 tile wide ridge, peninsula or
  gap. For each level k from 2 up the mask `level >= k` gets a morphological opening and then a closing with a 2 x 2 block
  (every plateau tile lies in a 2 x 2 block of plateau, every lower tile next to it in one of lower land or water), and the new
  level is 1 + the number of masks a land tile is in; water stays water. The operators are monotone, so level 3 stays inside
  level 2; that neighbouring land levels still differ by one step at most is not guaranteed by the filter (on a random field it
  can fail): the natural terrain, the water limit and the taper of the town ring are one step Lipschitz, which is why it holds
  on the real terrain. `Chunk` computes a block with a margin of 9 tiles (the layout reach 3, the filter reach 2 and the water
  limit reach 4) of the level after the town override and crops it, so a chunk gets exactly the levels the whole map would get.
  Measured on 1 024 x 1 024 tiles with four levels: 0 tiles of level 3 or 4 closer to water than their clearance, 0 jumps of two
  among land, 0 jumps of more than two between land and water, 1 tile that is not in a 2 x 2 block of its plateau, chunk
  generation about 1.1 ms.
- **`elevation/color.ts`** (new) — the temporary flat-band look of the height levels (`shadeForHeightLevel`), which the
  cliff art replaces. The ground comes from the biome.
