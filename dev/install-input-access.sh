#!/usr/bin/env bash
# One-time setup: grant Typing Pet read-only access to keyboard input devices.
#
# Creates a dedicated "typingpet" group, installs a udev rule that grants the
# group read access to keyboard devices only (not mice/touchpads), and adds
# your user to the group.
#
# After running this you must log out and back in (or reboot) for the new
# group membership to take effect.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GROUP="typingpet"
RULE_SRC="$ROOT/data/udev/70-typingpet.rules"
RULE_DST="/etc/udev/rules.d/70-typingpet.rules"

if [[ ! -f "$RULE_SRC" ]]; then
    echo "error: $RULE_SRC not found" >&2
    exit 1
fi

cat <<EOF
This will:
  1. create the system group '$GROUP'
  2. install $RULE_DST
  3. add '$USER' to '$GROUP'   (a log out / login is required afterwards)

EOF

read -rp "Continue? [y/N] " reply
[[ "${reply,,}" == y* ]] || { echo "aborted."; exit 1; }

sudo groupadd -f "$GROUP"
sudo install -m 0644 "$RULE_SRC" "$RULE_DST"
sudo udevadm control --reload
sudo udevadm trigger --subsystem-match=input --action=change
sudo usermod -aG "$GROUP" "$USER"

cat <<EOF

Done.

Next: log out and back in (or reboot) so your new group membership applies,
then restart the extension (or run ./dev/run-nested.sh for the dev sandbox).
EOF
