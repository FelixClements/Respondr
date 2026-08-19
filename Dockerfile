FROM node:22-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY web/package*.json ./web/
RUN npm ci && npm ci --prefix web

COPY . .
RUN npm run build

FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-sandbox \
    build-essential \
    python3 \
    curl \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgtk-3-0 \
    libxss1 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    libx11-xcb1 \
    && npm config set update-notifier false \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
    && apt-get remove -y build-essential python3 \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/web/build ./web/build
COPY better-auth.docker.mjs ./better-auth.docker.mjs
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
COPY public/icon-192.png public/icon-512.png public/icon-maskable-192.png public/icon-maskable-512.png public/icon.svg public/icon-maskable.svg ./public/

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 9595

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:9595/ || exit 1

CMD ["./docker-entrypoint.sh"]
