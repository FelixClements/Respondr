#!/bin/sh
set -e

echo "Starting Respondr..."
exec node dist/index.js
