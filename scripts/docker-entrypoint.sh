#!/bin/sh
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
AUTH_DIR="${AUTH_DIR:-/app/.wwebjs_auth}"

# Root-owned bind mounts (e.g. ./data:/app/data created by root on the host)
# mask the image-time chown, so fix ownership at runtime before dropping to node.
if [ "$(id -u 2>/dev/null || echo 0)" = "0" ]; then
  mkdir -p "$DATA_DIR" "$AUTH_DIR"
  chown -R node:node "$DATA_DIR" "$AUTH_DIR" 2>/dev/null || \
    echo "WARNING: could not chown $DATA_DIR/$AUTH_DIR to node; SQLite may fail with EACCES" >&2
  if command -v setpriv >/dev/null 2>&1; then
    echo "Starting Respondr as node (via setpriv)..."
    exec setpriv --reuid=node --regid=node --clear-groups node dist/index.js
  elif command -v gosu >/dev/null 2>&1; then
    echo "Starting Respondr as node (via gosu)..."
    exec gosu node node dist/index.js
  elif command -v su >/dev/null 2>&1; then
    echo "Starting Respondr as node (via su)..."
    exec su node -s /bin/sh -c 'exec node dist/index.js'
  else
    echo "WARNING: no privilege-drop tool found; running as root" >&2
    exec node dist/index.js
  fi
else
  echo "Starting Respondr..."
  exec node dist/index.js
fi
