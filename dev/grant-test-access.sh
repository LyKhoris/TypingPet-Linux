#!/usr/bin/env bash
# TEMPORARY / DEV ONLY: grant the current user read access to input devices
# for this session, without logging out.
#
# This uses an ACL on the existing device nodes. It is reset when devices are
# re-plugged or the machine reboots. For the permanent, narrower setup use
# ./dev/install-input-access.sh instead.
set -euo pipefail

sudo setfacl -m "u:${USER}:r" /dev/input/event*
echo "Granted read access to /dev/input/event* for $USER (temporary)."
