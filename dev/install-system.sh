#!/usr/bin/env bash
# Build and install Typing Pet system-wide from a source checkout.
#
# Installs the extension as a *system* extension and the udev rule that grants
# keyboard access. This is what the distro packages do; it exists so you can
# install from source without a package tool.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UUID="typingpet@lykhoris.github.io"

EXTDIR="/usr/share/gnome-shell/extensions/$UUID"

sudo install -d "$EXTDIR"
sudo install -m644 "$ROOT/metadata.json" "$ROOT/extension.js" "$EXTDIR/"
sudo cp -r "$ROOT/assets" "$ROOT/bin" "$EXTDIR/"

sudo install -Dm644 "$ROOT/data/udev/70-typingpet.rules" \
    /usr/lib/udev/rules.d/70-typingpet.rules
sudo udevadm control --reload
sudo udevadm trigger --subsystem-match=input --action=change

cat <<EOF

Installed to $EXTDIR

Enable it with:
  gnome-extensions enable $UUID
Then look in the Extensions app. No re-login needed.
EOF
