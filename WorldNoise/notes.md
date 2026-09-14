# WorldNoise - Notizen

## Steps

- [x] Ordner von `TileGridBase` klonen, Namen anpassen (`package.json`, `public/project.json`) - 2026-09-14
- [x] Erste Noise-Layer (Elevation) statt Checkerboard in `world/Tile.ts` - 2026-09-14 (`simplex-noise` + `alea`,
      4 Octaves, `world/noise.ts`, grobe Farbstufen: Wasser/Strand/Land/Hügel/Berg)
- [ ] Moisture- und Temperature-Layer dazu
- [ ] Redistribution-Kurve auf Elevation
- [ ] Biome-Lookup-Table (Elevation x Moisture x Temperature -> Biome -> Tile-Darstellung)
