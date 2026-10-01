#!/usr/bin/env python3
"""Package the extension into a zip suitable for extensions.gnome.org.

Only extension runtime files are included; packaging and development files
are not.
"""

import os
import sys
import zipfile

INCLUDE_FILES = ('metadata.json', 'extension.js')
INCLUDE_DIRS = ('assets', 'bin')


def main() -> None:
    out = sys.argv[1]
    parent = os.path.dirname(out)
    if parent:
        os.makedirs(parent, exist_ok=True)

    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in INCLUDE_FILES:
            z.write(path, path)
        for root in INCLUDE_DIRS:
            for dirpath, _dirs, files in os.walk(root):
                for name in files:
                    path = os.path.join(dirpath, name)
                    z.write(path, path)

    print('wrote', out)


if __name__ == '__main__':
    main()
