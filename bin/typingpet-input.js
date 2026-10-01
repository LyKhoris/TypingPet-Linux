#!/usr/bin/env -S gjs -m
/*
 * Typing Pet — evdev input helper
 * SPDX-License-Identifier: GPL-2.0-or-later
 *
 * GNOME Shell (and every Wayland client) cannot observe global key events:
 * Wayland only delivers keys to the focused client, by design. So, exactly
 * like other Linux typing-sound tools, we read key events straight from the
 * kernel input layer at /dev/input/event*.
 *
 * Privacy: we only ever look at *whether* a key was pressed. The keycode is
 * forwarded so the extension can drive optional per-key patterns; we never
 * read text, never store anything, and nothing leaves the machine.
 *
 * This runs as a separate process so a failure here can never take down
 * gnome-shell.
 *
 * Output, one line per key press (flushed immediately):
 *   KEY <evdev-code>
 *   ERR <reason>     (fatal; the process then exits)
 */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GioUnix from 'gi://GioUnix';

// struct input_event on 64-bit: timeval (16) + u16 type + u16 code + s32 value
const EVENT_SIZE = 24;
const OFF_TYPE = 16;
const OFF_CODE = 18;
const OFF_VALUE = 20;

const EV_KEY = 0x01;
const KEY_A = 30; // used to identify keyboard devices
const KEY_MAX = 0xff; // keyboard range; excludes BTN_* mouse/touchpad buttons

// Read-only permission is enough; keep the bitmask meaning explicit.
const KEY_PRESS = 1;

const stdout = new GioUnix.OutputStream({ fd: 1, close_fd: false });

function emit(text) {
    stdout.write_all(new TextEncoder().encode(text), null);
    stdout.flush(null);
}

function isKeyboard(eventName) {
    // eventName is e.g. "event3"; the capability bitmask lives in sysfs.
    // Note: the kernel prints the bitmap highest word first.
    const capPath = `/sys/class/input/${eventName}/device/capabilities/key`;
    try {
        const [, bytes] = GLib.file_get_contents(capPath);
        const words = new TextDecoder().decode(bytes).trim().split(/\s+/).reverse();
        const word = BigInt(`0x${words[Math.floor(KEY_A / 64)] ?? '0'}`);
        return (word & (1n << BigInt(KEY_A % 64))) !== 0n;
    } catch {
        return false;
    }
}

function listKeyboards() {
    const found = [];
    const dir = Gio.File.new_for_path('/dev/input');
    let enumerator;
    try {
        enumerator = dir.enumerate_children('standard::name',
            Gio.FileQueryInfoFlags.NONE, null);
    } catch {
        return found;
    }

    let info;
    while ((info = enumerator.next_file(null)) !== null) {
        const name = info.get_name();
        if (name.startsWith('event') && isKeyboard(name))
            found.push(`/dev/input/${name}`);
    }
    return found;
}

class Device {
    constructor(path) {
        this._path = path;
        this._buffer = new Uint8Array(0);
        this._stream = Gio.File.new_for_path(path).read(null);
        this._read();
    }

    _read() {
        this._stream.read_bytes_async(4096, GLib.PRIORITY_DEFAULT, null,
            (stream, res) => {
                let bytes;
                try {
                    bytes = stream.read_bytes_finish(res);
                } catch {
                    return; // device went away
                }
                if (bytes.get_size() === 0)
                    return;

                this._append(bytes.toArray());
                this._read();
            });
    }

    _append(chunk) {
        const merged = new Uint8Array(this._buffer.length + chunk.length);
        merged.set(this._buffer, 0);
        merged.set(chunk, this._buffer.length);
        this._buffer = merged;

        const view = new DataView(this._buffer.buffer,
            this._buffer.byteOffset, this._buffer.length);

        let offset = 0;
        while (this._buffer.length - offset >= EVENT_SIZE) {
            const type = view.getUint16(offset + OFF_TYPE, true);
            const code = view.getUint16(offset + OFF_CODE, true);
            const value = view.getInt32(offset + OFF_VALUE, true);

            if (type === EV_KEY && value === KEY_PRESS && code <= KEY_MAX)
                emit(`KEY ${code}\n`);

            offset += EVENT_SIZE;
        }

        this._buffer = this._buffer.slice(offset);
    }
}

function main() {
    const paths = listKeyboards();
    if (paths.length === 0) {
        emit('ERR no-keyboard-device\n');
        return 1;
    }

    const devices = [];
    for (const path of paths) {
        try {
            devices.push(new Device(path));
        } catch (e) {
            emit(`ERR access-denied ${path} (${e.message})\n`);
            return 1;
        }
    }

    // Pick up keyboards plugged in later.
    const monitor = Gio.File.new_for_path('/dev/input')
        .monitor_directory(Gio.FileMonitorFlags.NONE, null);
    monitor.connect('changed', () => {
        for (const path of listKeyboards()) {
            if (!devices.some(d => d._path === path)) {
                try {
                    devices.push(new Device(path));
                } catch {
                    // ignore
                }
            }
        }
    });

    return 0;
}

main();
