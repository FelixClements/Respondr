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

CHROME_PATH=""
for path in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary" \
  "/usr/bin/google-chrome" \
  "/usr/bin/google-chrome-stable" \
  "/usr/bin/chromium" \
  "/usr/bin/chromium-browser"
do
  if [ -x "$path" ]; then
    CHROME_PATH="$path"
    break
  fi
done

if [ -z "$CHROME_PATH" ]; then
  echo "No Chrome/Chromium installation found. Installing a Puppeteer-managed Chrome build..."
  CHROME_PATH=$(npx puppeteer browsers install chrome --format "{{path}}")
fi

if [ -z "$CHROME_PATH" ] || [ ! -x "$CHROME_PATH" ]; then
  echo "Could not find or install a Chrome/Chromium executable."
  exit 1
fi

echo "Using Chrome at: $CHROME_PATH"
echo "Starting Respondr. Open http://localhost:9595 and go to the QR page to link WhatsApp."
echo "Press Ctrl+C to stop."
PUPPETEER_EXECUTABLE_PATH="$CHROME_PATH" node src/index.js
