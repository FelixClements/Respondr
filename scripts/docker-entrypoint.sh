#!/bin/sh
set -e

echo "Running Better Auth migrations..."
npx auth@latest migrate --config ./better-auth.docker.mjs --yes

echo "Starting Respondr..."
exec node dist/index.js
