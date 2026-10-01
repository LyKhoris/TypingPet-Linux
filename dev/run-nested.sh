#!/usr/bin/env bash
# Run a nested GNOME Shell (via mutter-devkit) with the Typing Pet extension
# installed and enabled.
#
# The nested Shell opens as a normal window inside your current session, so you
# can see it, click into it, drag the pet around, and type at it.
#
# Everything is isolated under ./.dev so your real GNOME config is untouched.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UUID="typingpet@lykhoris.github.io"
export UUID

export DEV_HOME="$ROOT/.dev"
export XDG_DATA_HOME="$DEV_HOME/data"
export XDG_CONFIG_HOME="$DEV_HOME/config"
export XDG_CACHE_HOME="$DEV_HOME/cache"
export XDG_STATE_HOME="$DEV_HOME/state"

EXT_DIR="$XDG_DATA_HOME/gnome-shell/extensions/$UUID"
LOG="$DEV_HOME/gnome-shell.log"

# Always regenerate sprites first so edits to the generator show up.
python3 "$ROOT/dev/make-placeholders.py"

mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_STATE_HOME" "$DEV_HOME"
rm -rf "$EXT_DIR"
mkdir -p "$EXT_DIR"
cp "$ROOT/metadata.json" "$ROOT/extension.js" "$EXT_DIR/"
cp -r "$ROOT/assets" "$EXT_DIR/assets"
cp -r "$ROOT/bin" "$EXT_DIR/bin"

echo "Extension staged at: $EXT_DIR"
echo "Log: $LOG"

# Isolated D-Bus + isolated config, so enabling the extension does not touch
# your real GNOME setup.
dbus-run-session -- bash -c "
  set -e
  gsettings set org.gnome.shell disable-user-extensions false
  gsettings set org.gnome.shell enabled-extensions \"['$UUID']\"
  echo \"enabled-extensions => \$(gsettings get org.gnome.shell enabled-extensions)\"
  exec gnome-shell --devkit
" 2>&1 | tee "$LOG"
