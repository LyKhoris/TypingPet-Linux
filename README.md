# Typing Pet — Linux / GNOME

A GNOME Shell extension that puts a small desktop pet on your screen which
bounces and reacts to your typing.

This is an **unofficial Linux/GNOME reimplementation** of
[**Typing Pet**](https://github.com/swoonqx/TypingPet) by
[**swoonqx**](https://github.com/swoonqx).

> **Status:** early development. The pet renders, moves and reacts to input;
> presets, patterns and the settings UI are still to come.

## Credits

The original **Typing Pet** is a Windows desktop pet created by **swoonqx**:

- Original project: https://github.com/swoonqx/TypingPet
- Author: https://github.com/swoonqx

This project is not affiliated with or endorsed by the original author. It is
an independent reimplementation of the same idea for Linux/GNOME. No source
code was reused — the original is distributed as a closed-source Windows
executable, so everything here is written from scratch. All credit for the
concept, design, and inspiration belongs to swoonqx.

## Install

The extension itself installs in one click, but on Wayland it also needs
read-only access to keyboard input, which only a system package can grant.
Because of that, **the package is the recommended way to install** — it sets
everything up in one step:

- **Arch:** `packaging/PKGBUILD` (also on the AUR)
- **From source (system install):** `./dev/install-system.sh`
- **extensions.gnome.org:** the extension alone, then grant access with
  `./dev/install-input-access.sh`

After installing, enable it with:

```sh
gnome-extensions enable typingpet@lykhoris.github.io
```

or toggle it in the **Extensions** app.

## Why does it need keyboard access?

GNOME Shell — and every Wayland client — **cannot** observe global keystrokes.
Wayland delivers key events only to the focused window; this is intentional, to
stop apps keylogging each other. So reacting to typing anywhere requires reading
the kernel input layer (`/dev/input/event*`) directly, the same way every Linux
typing-sound tool works.

Neither the extension nor a Wayland app can grant itself that access. It comes
from a udev rule shipped with the package:

```
SUBSYSTEM=="input", KERNEL=="event*", ENV{ID_INPUT_KEYBOARD}=="1", TAG+="uaccess"
```

`uaccess` lets systemd-logind give the user of the **active session** access,
with no group and no re-login; access is revoked when the session ends. The rule
is deliberately narrow — **keyboards only**, read-only, never mice or touchpads.

## Privacy

Typing Pet detects only **that a key was pressed**. It never reads, stores or
transmits the character typed. Input is processed locally by a helper process
and nothing leaves the machine.

## How it works

```
gnome-shell ──┐
              │  spawns (unprivileged, separate process)
              ▼
   bin/typingpet-input.js ── reads /dev/input/event* ──► "KEY <code>" lines
              │
              ▼
        extension.js ──► sprite actor in the Shell overlay group
```

- The **pet** is a `Clutter`/`St` actor in the Shell's overlay group, so
  always-on-top, transparency and click-through are native (not protocols).
- The **input helper** is a separate GJS process reading evdev. Keeping it out
  of `gnome-shell` means a failure there can never take down the Shell.
- A `TAG+="uaccess"` udev rule grants the read access.

## Development

Run a nested GNOME Shell (a normal window you can interact with) with the
extension installed and enabled, fully isolated under `./.dev`:

```sh
./dev/run-nested.sh
```

Other scripts:

- `./dev/install-system.sh` — install system-wide from source
- `./dev/install-input-access.sh` — install only the udev rule
- `./dev/grant-test-access.sh` — temporary ACL for testing without a package
- `./dev/make-placeholders.py` — regenerate the placeholder sprites

## Layout

```
extension.js            GNOME Shell extension entry point
metadata.json
prefs.js                (coming) Adwaita settings window
bin/typingpet-input.js  evdev input helper (unprivileged)
assets/                 placeholder sprites
data/udev/              keyboard-access udev rule
packaging/              PKGBUILD and package files
dev/                    development scripts
```

## Requirements

- GNOME Shell (see `shell-version` in `metadata.json`)
- GJS (ships with GNOME Shell)

## License

Licensed under the **GNU General Public License v2.0 or later**
(`SPDX-License-Identifier: GPL-2.0-or-later`). See [`LICENSE`](LICENSE).

This license covers this project's own code only. The original **Typing Pet**
by swoonqx is a separate work with its own terms (it is not open source); see
the Credits section above.
