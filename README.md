# Typing Pet — Linux / GNOME

A GNOME Shell extension that puts a small desktop pet on your screen which
bounces and reacts to your typing.

This is an **unofficial Linux/GNOME reimplementation** of
[**Typing Pet**](https://github.com/swoonqx/TypingPet) by
[**swoonqx**](https://github.com/swoonqx).

> **Status:** early development. The extension is being built from scratch.

## Credits

The original **Typing Pet** is a Windows desktop pet created by **swoonqx**:

- Original project: https://github.com/swoonqx/TypingPet
- Author: https://github.com/swoonqx

This project is not affiliated with or endorsed by the original author. It is
an independent reimplementation of the same idea for Linux/GNOME. No source
code was reused — the original is distributed as a closed-source Windows
executable, so everything here is written from scratch. All credit for the
concept, design, and inspiration belongs to swoonqx.

## What it does

- Sits on the desktop, always on top, and bounces in time with your keystrokes.
- Alternates between left-hand and right-hand images while you type.
- Lets you use your own images as the character (position: default / left / right).
- Reacts to chosen keys, key combos, and mouse clicks with pattern images (up to 10).
- Saves presets (up to 10) and can show up to 3 pets at once.
- Controls for size, wobble, opacity, hover translucency, click-through, and layering.
- A panel indicator holds the menu and settings.
- Reacts only to *that* a key was pressed — never to which character.

## Requirements

- GNOME Shell (development targets a specific Shell version; see `metadata.json`).
- Linux with GNOME on Wayland or X11.

## Install

Not yet available — the extension is under construction.

## Design

The extension is built as a GNOME Shell extension:

- A global key listener on the Shell stage for anonymous input events.
- `Clutter` sprite actors placed in the Shell's overlay group.
- A small mood/animation state machine (idle / typing / pattern / hover).
- An Adwaita settings window (`prefs.js`) backed by a GSettings schema.
- A `PanelMenu` indicator for the runtime menu.

## License

Licensed under the **GNU General Public License v2.0 or later**
(`SPDX-License-Identifier: GPL-2.0-or-later`). See [`LICENSE`](LICENSE).

This license covers this project's own code only. The original **Typing Pet**
by swoonqx is a separate work with its own terms (it is not open source); see
the Credits section above.
