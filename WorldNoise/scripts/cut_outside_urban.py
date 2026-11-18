"""Cut the town buildings of the Essentials Outside tileset into one PNG per building.

Run from the WorldNoise folder (needs Pillow):

    python scripts/cut_outside_urban.py

The files land in assets/urban/, which is git-ignored: the art is not cleared for publishing and no asset is committed.
"""

import sys
from pathlib import Path
from typing import NamedTuple

from PIL import Image

TILE_SIZE_PX = 32

SOURCE = Path('assets/tilesets/outside.png')
TARGET = Path('assets/urban')


class Cut(NamedTuple):
    stem: str
    column: int
    row: int
    width_tiles: int
    height_tiles: int


ITEMS = [
    Cut('center', 0, 326, 5, 5),
    Cut('mart', 0, 331, 4, 4),
    Cut('house-blue', 0, 171, 5, 4),
    Cut('house-orange', 0, 192, 5, 4),
    Cut('house-red', 0, 198, 5, 4),
    Cut('house-grey', 0, 179, 5, 4),
    Cut('house-purple', 3, 183, 5, 4),
]


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else TARGET
    sheet = Image.open(source).convert('RGBA')
    target.mkdir(parents=True, exist_ok=True)
    for cut in ITEMS:
        box = (
            cut.column * TILE_SIZE_PX,
            cut.row * TILE_SIZE_PX,
            (cut.column + cut.width_tiles) * TILE_SIZE_PX,
            (cut.row + cut.height_tiles) * TILE_SIZE_PX,
        )
        sheet.crop(box).save(target / f'{cut.stem}.png')
    print(f'{len(ITEMS)} files in {target}')


if __name__ == '__main__':
    sys.exit(main())
