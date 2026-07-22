FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_ARGS="--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage"

# Install Chromium, native build tools for better-sqlite3, and curl for healthchecks.
# Build tools are removed after npm ci to keep the image smaller.
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

COPY . .

EXPOSE 9595

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:9595/ || exit 1

CMD ["npm", "start"]
