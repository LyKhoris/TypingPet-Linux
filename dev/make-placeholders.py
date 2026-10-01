#!/usr/bin/env python3
"""Generate placeholder pet sprites (no third-party art is bundled).

Produces three 200x200 RGBA PNGs in ../assets: default, left hand up,
right hand up. These stand in for a real character so the mechanism can be
tested end to end.
"""

import os

from PIL import Image, ImageDraw

SIZE = 200
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')

OUTLINE = (120, 70, 10, 255)
SKIN = (255, 214, 153, 255)
BODY = (255, 176, 59, 255)
INK = (60, 40, 20, 255)


def draw(path: str, left_up: bool, right_up: bool) -> None:
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = SIZE // 2

    # Body
    d.rounded_rectangle([cx - 38, 96, cx + 38, 178], radius=26,
                        fill=BODY, outline=OUTLINE, width=4)

    def arm(sx: int, sy: int, hx: int, hy: int) -> None:
        d.line([sx, sy, hx, hy], fill=OUTLINE, width=11)
        d.ellipse([hx - 8, hy - 8, hx + 8, hy + 8],
                  fill=SKIN, outline=OUTLINE, width=3)

    arm(cx - 36, 112, cx - 60, 58 if left_up else 152)
    arm(cx + 36, 112, cx + 60, 58 if right_up else 152)

    # Head
    d.ellipse([cx - 34, 42, cx + 34, 110], fill=SKIN, outline=OUTLINE, width=4)
    # Eyes
    d.ellipse([cx - 16, 68, cx - 6, 80], fill=INK)
    d.ellipse([cx + 6, 68, cx + 16, 80], fill=INK)
    # Smile
    d.arc([cx - 12, 80, cx + 12, 100], 20, 160, fill=OUTLINE, width=3)

    img.save(path)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    draw(os.path.join(OUT, 'default.png'), False, False)
    draw(os.path.join(OUT, 'left.png'), True, False)
    draw(os.path.join(OUT, 'right.png'), False, True)
    print('wrote placeholder sprites to', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
