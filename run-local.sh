#!/usr/bin/env bash
set -e

# Change to the script's directory so relative volume paths work.
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed. Please install Docker and Docker Compose first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available. Please install Docker Compose."
  exit 1
fi

if [ ! -f .env ]; then
  echo "No .env file found. Creating one from .env.example..."
  cp .env.example .env
  echo "Please edit .env to add your notification settings, then run this script again."
  exit 1
fi

mkdir -p data .wwebjs_auth

echo "Pulling the latest Respondr image from GitHub Container Registry..."
docker compose pull

echo ""
echo "Starting Respondr. Open http://localhost:9595 and go to the QR page to link WhatsApp."
echo "Press Ctrl+C to stop."
echo ""
docker compose up
