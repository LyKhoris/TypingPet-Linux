#!/usr/bin/env bash
# Install just the udev rule that lets Typing Pet read keyboard events.
#
# Use this if you installed the extension from extensions.gnome.org and need to
# grant keyboard access. Installing the distro package does this for you.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULE_SRC="$ROOT/data/udev/70-typingpet.rules"
RULE_DST="/usr/lib/udev/rules.d/70-typingpet.rules"

sudo install -m644 "$RULE_SRC" "$RULE_DST"
sudo udevadm control --reload
sudo udevadm trigger --subsystem-match=input --action=change

echo "Installed $RULE_DST."
echo "Typing Pet can now read keyboard events (read-only, keycodes only)."
