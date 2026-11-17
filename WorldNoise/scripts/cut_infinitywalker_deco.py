"""Cut the decoration items of the InfinityWalker tileset into one PNG per item or variant.

Run from the WorldNoise folder (needs Pillow):

    python scripts/cut_infinitywalker_deco.py

The cells come from InfinityWalker/js/tiles.js (deco tiles, trees and palm). The files land in assets/deco/,
which is git-ignored: the art is not cleared for publishing and no asset is committed.
"""

import sys
from pathlib import Path
from typing import NamedTuple

from PIL import Image

TILE_SIZE_PX = 32

SOURCE = Path('../InfinityWalker/img/tileset.png')
TARGET = Path('assets/deco')

class Cut(NamedTuple):
    stem: str
    column: int
    row: int
    width_tiles: int
    height_tiles: int


ITEMS = [
    Cut('flower-0', 0, 2, 1, 1),
    Cut('flower-1', 1, 2, 1, 1),
    Cut('flower-2', 2, 2, 1, 1),
    Cut('flower-3', 5, 2, 1, 1),
    Cut('tuft-small-0', 3, 2, 1, 1),
    Cut('tuft-small-1', 4, 2, 1, 1),
    Cut('mushroom', 2, 4, 1, 1),
    Cut('moss', 1, 4, 1, 1),
    Cut('stump', 6, 2, 1, 1),
    Cut('rock-small-0', 5, 3, 1, 1),
    Cut('rock-small-1', 5, 4, 1, 1),
    Cut('rock-small-2', 0, 3, 1, 1),
    Cut('shell-0', 0, 29, 1, 1),
    Cut('shell-1', 1, 29, 1, 1),
    Cut('shell-2', 2, 29, 1, 1),
    Cut('shell-3', 3, 29, 1, 1),
    Cut('shell-4', 4, 29, 1, 1),
    Cut('lily-0', 7, 5, 1, 1),
    Cut('lily-1', 6, 5, 1, 1),
    Cut('lily-2', 6, 6, 1, 1),
    Cut('lily-3', 6, 7, 1, 1),
    Cut('log-0', 5, 1, 2, 1),
    Cut('log-1', 1, 1, 2, 1),
    Cut('rock-pair', 1, 3, 2, 1),
    Cut('tuft-tall-0', 3, 0, 1, 2),
    Cut('tuft-tall-1', 4, 0, 1, 2),
    Cut('fern', 7, 1, 1, 2),
    Cut('boulder', 3, 3, 2, 2),
    Cut('boulder-water', 6, 3, 2, 2),
    Cut('tree-oak', 0, 36, 4, 3),
    Cut('palm', 0, 39, 4, 3),
    Cut('tall-grass-light', 3, 5, 3, 3),
    Cut('tall-grass-dry', 3, 11, 3, 3),
    Cut('tall-grass-dark', 3, 17, 3, 3),
    Cut('cliff-ridge-left', 5, 0, 1, 1),
    Cut('cliff-ridge-middle', 6, 0, 1, 1),
    Cut('cliff-ridge-right', 7, 0, 1, 1),
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
    print(f'{len(ITEMS)} items written to {target}')


if __name__ == '__main__':
    main()
