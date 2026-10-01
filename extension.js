import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const PET_SIZE = 160;
const MARGIN = 24;
const GRAVITY = 2800; // px/s^2
const JUMP = 560; // px/s
const IDLE_MS = 700;

export default class TypingPetExtension extends Extension {
    enable() {
        this._keyCount = 0;
        this._hand = 0;
        this._y = 0;
        this._vy = 0;
        this._last = 0;
        this._idleId = 0;
        this._drag = null;

        const asset = (name) =>
            Gio.FileIcon.new(Gio.File.new_for_path(
                GLib.build_filenamev([this._extDir(), 'assets', name])));

        this._images = {
            default: asset('default.png'),
            left: asset('left.png'),
            right: asset('right.png'),
        };

        // The pet itself.
        this._actor = new St.Bin({
            reactive: true,
            track_hover: true,
            style_class: 'typingpet-actor',
        });
        this._icon = new St.Icon({
            gicon: this._images.default,
            icon_size: PET_SIZE,
        });
        this._actor.set_child(this._icon);
        Main.layoutManager.uiGroup.add_child(this._actor);

        // Debug readout so you can see that key events are being captured.
        this._debug = new St.Label({
            text: 'keys: 0',
            style: 'font: 13px monospace; color: rgba(255,255,255,0.9); ' +
                'background: rgba(0,0,0,0.55); padding: 4px 8px; border-radius: 6px;',
        });
        Main.layoutManager.uiGroup.add_child(this._debug);

        // At startup the layout may not know about monitors yet, so wait for it.
        this._placed = false;
        this._monitorsChangedId = Main.layoutManager.connect('monitors-changed',
            this._place.bind(this));
        this._place();

        // Interaction: drag to move, hover to go translucent.
        this._actor.connect('button-press-event', this._onPress.bind(this));
        this._actor.connect('enter-event', () => {
            this._actor.ease({ opacity: 140, duration: 120 });
        });
        this._actor.connect('leave-event', () => {
            this._actor.ease({ opacity: 255, duration: 120 });
        });

        // Pointer events only (drag). Key events cannot be observed from the
        // Shell on Wayland, so those arrive from the evdev helper instead.
        this._stageId = global.stage.connect('captured-event',
            this._onCapturedEvent.bind(this));

        this._startInput();

        // Physics ticker for the bounce.
        this._tickId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16,
            this._tick.bind(this));

        log('[typingpet] enabled');
    }

    disable() {
        if (this._idleId) { GLib.source_remove(this._idleId); this._idleId = 0; }
        if (this._tickId) { GLib.source_remove(this._tickId); this._tickId = 0; }
        if (this._stageId) { global.stage.disconnect(this._stageId); this._stageId = 0; }
        this._stopInput();
        if (this._monitorsChangedId) {
            Main.layoutManager.disconnect(this._monitorsChangedId);
            this._monitorsChangedId = 0;
        }
        if (this._debug) { this._debug.destroy(); this._debug = null; }
        if (this._actor) { this._actor.destroy(); this._actor = null; }
        this._drag = null;
        log('[typingpet] disabled');
    }

    _extDir() {
        const dir = this.dir;
        if (typeof dir === 'string')
            return dir;
        if (dir && typeof dir.get_path === 'function')
            return dir.get_path();
        return GLib.path_get_dirname(String(this.path));
    }

    _place() {
        const mon = Main.layoutManager.primaryMonitor;
        if (!mon || !this._actor)
            return;

        this._actor.set_position(
            mon.x + mon.width - PET_SIZE - MARGIN,
            mon.y + mon.height - PET_SIZE - MARGIN);
        if (this._debug)
            this._debug.set_position(mon.x + 16, mon.y + 16);

        if (!this._placed) {
            this._placed = true;
            log(`[typingpet] placed on ${mon.width}x${mon.height} monitor`);
        }
    }

    _setImage(gicon) {
        if (this._icon)
            this._icon.gicon = gicon;
    }

    _startInput() {
        const helper = GLib.build_filenamev(
            [this._extDir(), 'bin', 'typingpet-input.js']);

        try {
            this._inputProc = Gio.Subprocess.new(
                ['gjs', '-m', helper],
                Gio.SubprocessFlags.STDOUT_PIPE |
                Gio.SubprocessFlags.STDERR_SILENCE);
        } catch (e) {
            logError(e, '[typingpet] failed to start input helper');
            this._inputProc = null;
            return;
        }

        this._inputStream = new Gio.DataInputStream({
            base_stream: this._inputProc.get_stdout_pipe(),
        });
        this._readInputLine();
    }

    _readInputLine() {
        if (!this._inputStream)
            return;

        this._inputStream.read_line_async(GLib.PRIORITY_DEFAULT, null,
            (stream, res) => {
                let line = null;
                try {
                    [line] = stream.read_line_finish_utf8(res);
                } catch {
                    return; // helper exited
                }

                if (line === null)
                    return; // EOF

                this._handleInputLine(line);
                this._readInputLine();
            });
    }

    _handleInputLine(line) {
        if (line.startsWith('KEY ')) {
            this._onKey(parseInt(line.slice(4), 10));
        } else if (line.startsWith('ERR ')) {
            log(`[typingpet] input helper: ${line.slice(4)}`);
        }
    }

    _stopInput() {
        this._inputStream = null;
        if (this._inputProc) {
            try {
                this._inputProc.force_exit();
            } catch {
                // already gone
            }
            this._inputProc = null;
        }
    }

    _onCapturedEvent(_stage, event) {
        const type = event.type();

        // While dragging, follow the pointer globally.
        if (this._drag) {
            if (type === Clutter.EventType.MOTION) {
                const [x, y] = event.get_coords();
                this._actor.set_position(
                    this._drag.ax + (x - this._drag.x),
                    this._drag.ay + (y - this._drag.y));
                return Clutter.EVENT_STOP;
            }
            if (type === Clutter.EventType.BUTTON_RELEASE) {
                this._drag = null;
                return Clutter.EVENT_STOP;
            }
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _onPress(actor, event) {
        if (event.get_button() !== 1)
            return Clutter.EVENT_PROPAGATE;

        const [x, y] = event.get_coords();
        this._drag = { x, y, ax: actor.x, ay: actor.y };
        return Clutter.EVENT_STOP;
    }

    _onKey(_code) {
        this._keyCount++;
        if (this._keyCount === 1)
            log('[typingpet] first key captured');
        if (this._debug)
            this._debug.text = `keys: ${this._keyCount}`;

        // Alternate left / right hand image.
        this._hand ^= 1;
        this._setImage(this._hand ? this._images.left : this._images.right);

        // Bounce if we are on the ground.
        if (this._vy === 0 && this._y === 0)
            this._vy = -JUMP;

        // Fall back to the default image after a short pause.
        if (this._idleId) {
            GLib.source_remove(this._idleId);
            this._idleId = 0;
        }
        this._idleId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, IDLE_MS, () => {
            this._idleId = 0;
            this._setImage(this._images.default);
            return GLib.SOURCE_REMOVE;
        });
    }

    _tick() {
        const now = GLib.get_monotonic_time() / 1e6;
        if (this._last === 0)
            this._last = now;

        let dt = now - this._last;
        this._last = now;
        if (dt > 0.05)
            dt = 0.05;

        if (this._y < 0 || this._vy < 0) {
            this._vy += GRAVITY * dt;
            this._y += this._vy * dt;
            if (this._y >= 0) {
                this._y = 0;
                this._vy = 0;
            }
            if (this._actor)
                this._actor.translation_y = this._y;
        }

        return GLib.SOURCE_CONTINUE;
    }
}
