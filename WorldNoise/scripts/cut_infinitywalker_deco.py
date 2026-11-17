"""Cut the decoration items of the InfinityWalker tileset into one PNG per item or variant.

Run from the WorldNoise folder (needs Pillow):

    python scripts/cut_infinitywalker_deco.py

The cells come from InfinityWalker/js/tiles.js (deco tiles, trees and palm). The files land in assets/deco/,
which is git-ignored: the art is not cleared for publishing and no asset is committed.
"""

import sys
from pathlib import Path

from PIL import Image

TILE_SIZE_PX = 32

SOURCE = Path('../InfinityWalker/img/tileset.png')
TARGET = Path('assets/deco')

# file stem, first column, first row, width in tiles, height in tiles
ITEMS = [
    ('flower-0', 0, 2, 1, 1),
    ('flower-1', 1, 2, 1, 1),
    ('flower-2', 2, 2, 1, 1),
    ('flower-3', 5, 2, 1, 1),
    ('tuft-small-0', 3, 2, 1, 1),
    ('tuft-small-1', 4, 2, 1, 1),
    ('mushroom', 2, 4, 1, 1),
    ('moss', 1, 4, 1, 1),
    ('stump', 6, 2, 1, 1),
    ('rock-small-0', 5, 3, 1, 1),
    ('rock-small-1', 5, 4, 1, 1),
    ('rock-small-2', 0, 3, 1, 1),
    ('shell-0', 0, 29, 1, 1),
    ('shell-1', 1, 29, 1, 1),
    ('shell-2', 2, 29, 1, 1),
    ('shell-3', 3, 29, 1, 1),
    ('shell-4', 4, 29, 1, 1),
    ('lily-0', 7, 5, 1, 1),
    ('lily-1', 6, 5, 1, 1),
    ('lily-2', 6, 6, 1, 1),
    ('lily-3', 6, 7, 1, 1),
    ('log-0', 5, 1, 2, 1),
    ('log-1', 1, 1, 2, 1),
    ('rock-pair', 1, 3, 2, 1),
    ('tuft-tall-0', 3, 0, 1, 2),
    ('tuft-tall-1', 4, 0, 1, 2),
    ('fern', 7, 1, 1, 2),
    ('boulder', 3, 3, 2, 2),
    ('boulder-water', 6, 3, 2, 2),
    ('tree-oak', 0, 36, 4, 3),
    ('palm', 0, 39, 4, 3),
]


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else TARGET
    sheet = Image.open(source).convert('RGBA')
    target.mkdir(parents=True, exist_ok=True)
    for stem, column, row, width, height in ITEMS:
        box = (
            column * TILE_SIZE_PX,
            row * TILE_SIZE_PX,
            (column + width) * TILE_SIZE_PX,
            (row + height) * TILE_SIZE_PX,
        )
        sheet.crop(box).save(target / f'{stem}.png')
    print(f'{len(ITEMS)} items written to {target}')


if __name__ == '__main__':
    main()
