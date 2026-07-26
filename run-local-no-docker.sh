#!/usr/bin/env bash
set -e

# Change to the script's directory so relative paths (data, .wwebjs_auth) work.
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Please install it first: https://nodejs.org"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed."
  exit 1
fi

if [ ! -f .env ]; then
  echo "No .env file found. Creating .env from .env.example..."
  cp .env.example .env
  echo "Please edit .env to add your notification settings, then run this script again."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

mkdir -p data .wwebjs_auth

# Load .env so we can read the configured port and avoid conflicts.
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

PORT=${PORT:-9595}

if command -v lsof >/dev/null 2>&1; then
  PIDS=$(lsof -ti:$PORT || true)
  if [ -n "$PIDS" ]; then
    echo "Port $PORT is already in use. Stopping the existing process..."
    echo "$PIDS" | xargs -r kill -9
    sleep 1
  fi
fi

# Stop any leftover Chrome processes from previous Respondr runs.
if command -v pkill >/dev/null 2>&1; then
  pkill -f "Respondr/\.wwebjs_auth" 2>/dev/null || true
fi

# Allow the user to override the browser path via .env or environment.
BROWSER_PATH="${PUPPETEER_EXECUTABLE_PATH:-}"

if [ -n "$BROWSER_PATH" ] && [ -x "$BROWSER_PATH" ]; then
  CHROME_PATH="$BROWSER_PATH"
else
  CHROME_PATH=""
  for path in \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/usr/bin/chromium" \
    "/usr/bin/chromium-browser" \
    "/usr/local/bin/chromium" \
    "/opt/homebrew/bin/chromium"
  do
    if [ -x "$path" ]; then
      CHROME_PATH="$path"
      break
    fi
  done
fi

if [ -z "$CHROME_PATH" ]; then
  echo "No Chrome/Chromium installation found. Installing a Puppeteer-managed Chrome build..."
  # Use the same Puppeteer major version as the project to avoid version mismatches.
  PUPPETEER_VERSION=$(node -e "console.log(require('puppeteer-core/package.json').version.split('.')[0])")
  CHROME_PATH=$(npx --yes "puppeteer@${PUPPETEER_VERSION}" browsers install chrome --format "{{path}}")
fi

if [ -z "$CHROME_PATH" ] || [ ! -x "$CHROME_PATH" ]; then
  echo "Could not find or install a Chrome/Chromium executable."
  exit 1
fi

# On macOS, downloaded Chromium/Chrome builds may be quarantined and killed by the OS.
# Remove the quarantine attribute from the app bundle so it can launch.
if command -v xattr >/dev/null 2>&1; then
  APP_DIR=$(sed -n 's|\(.*/[^/]*\.app\)/.*|\1|p' <<< "$CHROME_PATH")
  if [ -n "$APP_DIR" ] && xattr -l "$APP_DIR" 2>/dev/null | grep -q "com.apple.quarantine"; then
    echo "Removing macOS quarantine attribute from $APP_DIR..."
    xattr -d com.apple.quarantine "$APP_DIR" 2>/dev/null || true
  fi
fi

echo "Using browser at: $CHROME_PATH"
echo "Starting Respondr. Open http://localhost:$PORT and go to the QR page to link WhatsApp."
echo "Press Ctrl+C to stop."

PUPPETEER_EXECUTABLE_PATH="$CHROME_PATH" exec node src/index.js
