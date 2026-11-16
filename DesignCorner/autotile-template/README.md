# Autotile template (RPG Maker XP layout)

One autotile is a **96 x 128 px** PNG with transparency: 6 x 8 quarters of 16 x 16 px, numbered 1 to 48 row by row (id = row * 6 + column + 1).
The renderer builds every 32 x 32 px ground tile from four quarters (top left, top right, bottom left, bottom right) and picks the
quarters by the eight neighbours ([WorldNoise/src/tileset/autotile.ts](../../WorldNoise/src/tileset/autotile.ts)).

Input for an artist or an AI tool: **one seamless 32 x 32 px ground texture** (it becomes quarters 27, 28, 33, 34). Output: the whole sheet.

## Files

| File | Use |
|---|---|
| `autotile-template-1x.png` | 96 x 128 guide layer for Photoshop: red = must be transparent, green = ground, grey = not needed |
| `autotile-mask.png` | the same as a hard black and white mask (white = ground, black = transparent, grey = not needed), for an AI tool |
| `autotile-template-guide.png` | the template 8 times larger, with the quarter ids and roles |

## Layout (quarter ids)

```
        col 0  col 1  col 2  col 3  col 4  col 5
row 0     1      2      3      4     5 iTL  6 iTR     rows 0-1: strip, only the inner corners are used
row 1     7      8      9     10    11 iBL 12 iBR
row 2    13 oTL  14 eT  15 eT  16 eT  17 eT  18 oTR    rows 2-7: 3 x 3 tiles frame of the blob
row 3    19 eL   20     21     22     23     24 eR
row 4    25 eL   26     27     28     29     30 eR
row 5    31 eL   32     33     34     35     36 eR
row 6    37 eL   38     39     40     41     42 eR
row 7    43 oBL  44 eB  45 eB  46 eB  47 eB  48 oBR
```

`o` outer corner, `i` inner corner, `e` edge, T/B/L/R the side or corner, unlabelled quarters are plain ground.

- **Not needed: 1, 2, 3, 4, 7, 8, 9, 10.** The renderer never draws them. Leave them empty (or copy 13, 18, 43, 48 into 1, 2, 7, 8, as the
  Essentials sheets do).
- **Ground:** the 16 plain quarters 20 to 23, 26 to 29, 32 to 35, 38 to 41 (the inner 4 x 4).
- **Edge:** 14 to 17 (top), 44 to 47 (bottom), 19, 25, 31, 37 (left), 24, 30, 36, 42 (right).
- **Outer corner** (a convex corner of the shape): 13, 18, 43, 48. **Inner corner** (a concave bite): 5, 6, 11, 12.

## Rules

1. **Transparent outside.** The edge of the shape lies **8 px** (the default inset, 0 to 16 in the generator) inside the quarter on the side that faces the outside. Everything
   beyond it is fully transparent (alpha 0): no background, no border color, no blur. The red area of the template.
   - with the default inset of 8 px: top edge: rows 0 to 7 of the quarter are transparent; bottom: rows 8 to 15; left: columns 0 to 7; right: columns 8 to 15
   - outer corner: the two outside sides are transparent (an L shape), the outline turns at the point (8, 8)
   - inner corner: only the 8 x 8 px square in the corner of the bite is transparent (5 top left, 6 top right, 11 bottom left, 12 bottom right)
2. **Outline crosses every quarter border at the same place**, 8 px from the outer border, so quarters join without a step.
3. **Ground texture.** Every quarter shows the texture of its slot in the tile: slot top left = quarter 27, top right = 28, bottom left = 33,
   bottom right = 34. A quarter that sits in the left column of its tile (even column in the sheet: 13, 15, 17, 19, ...) uses the left half of the
   texture, an odd column the right half; an even row of the frame the top half, an odd row the bottom half. Short: the ground part of the whole
   6 x 6 block is the 32 px texture repeated, aligned to the centre tile.
4. **Edges repeat every 32 px, so these quarters are identical:**

   | Side | Identical | Sequence |
   |---|---|---|
   | top | 14 = 16 and 15 = 17 | 14 15 16 17 |
   | bottom | 44 = 46 and 45 = 47 | 44 45 46 47 |
   | left | 19 = 31 and 25 = 37 | 19 25 31 37 |
   | right | 24 = 36 and 30 = 42 | 24 30 36 42 |

   Nothing more is required (14 = 15 is not). The rim may differ between the two halves (a scallop of period 32 px), but 16 must continue
   into 15 and 15 into 16 seamlessly, because both orders happen. The rim of an edge must also join the inner corners and outer corners.
5. **Only 16 quarters are designed by hand:** the four outer corners (13, 18, 43, 48), the four inner corners (5, 6, 11, 12) and one pair of edge
   quarters per side (14 15, 44 45, 19 25, 24 30). Everything else is a copy or the plain texture.
6. **No anti-aliasing, no semi-transparency**, nearest neighbour only, the palette of the texture. Size exactly 96 x 128 px (an animated
   sheet is 96 px times the frame count wide, frames side by side).

## Check

Save the sheet into `WorldNoise/autotiles/`, run `npm run dev` in `WorldNoise/` and open `/autotile-preview.html`: it shows the sheet,
a test shape and all 47 tiles, on a checkerboard or on ground colors, and reloads when the file changes
([docs/tileset.md](../../WorldNoise/docs/tileset.md)). Look for steps or holes in the edge, a texture that jumps at a quarter border and
a semi-transparent edge.

## Workflow

1. Draw a seamless 32 x 32 px texture (for a water sheet with frames, one texture per frame, named so that they sort in the frame order).
2. Start `npm run dev` in `WorldNoise/`, open `/autotile-preview.html`, choose the texture(s) (or drop them on the page). The page
   generates the base sheet (rules above) and shows it at once. Options, all described in [docs/tileset.md](../../WorldNoise/docs/tileset.md):
   edge style (curve, edge, wavy with four wave shapes, rough with a seed), inset for all sides or per side, outer and inner corner radius,
   full texture or a rim band only, dither, edge shade and texture shift. The texture simply stops at the edge, there is no border color
   unless you switch the edge shade on. Then "Download sheet" and "Download guide" (a red/green guide layer that matches the generated
   sheet, in place of `autotile-template-1x.png` when the inset is not 8 px).
3. Open the PNG in Photoshop with the guide (`autotile-template-1x.png` for the default inset of 8 px) as a guide layer and add the details.
   Keep the rules: only the 16 quarters of rule 5 are drawn by hand, copy the equal ones (rule 4), keep the edge on the red/green border,
   no semi-transparent pixels.
4. Save the sheet into `WorldNoise/autotiles/`, paste its relative path (Copy Relative Path, `WorldNoise\autotiles\sand.png`) into the
   preview and look at it again after every save.

An image-generation AI was tried for the whole sheet and dropped: it does not keep the quarter grid, repeats nothing every 32 px and draws
the inner corners as islands.
