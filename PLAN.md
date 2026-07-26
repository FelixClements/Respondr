# Respondr — Build Plan

This plan breaks the project into small, self-contained phases. Each task has a `[ ]` checkbox so it can be checked off as it is completed.

---

## Configuration & Defaults

- **Runtime:** Docker (`node:22-slim` base image)
- **Web framework:** Hono + `@hono/node-server` on port `9595`
- **Frontend:** EJS templates rendered manually + vanilla JS; optional Hono `basicAuth`
- **Persistence:** SQLite in a mounted `data/` volume
- **WhatsApp session:** `LocalAuth`, stored in `.wwebjs_auth` (mounted volume)
- **Notifications:** NTFY + Gotify, selectable via `.env`
- **Process:** Docker Compose with restart policy

---

## Phase 1 — Project Scaffolding

- [x] Create `package.json` with scripts: `start`, `dev`, `test`
- [x] Install production dependencies: `hono`, `@hono/node-server`, `ejs`, `whatsapp-web.js`, `node-cron`, `better-sqlite3`, `qrcode`, `axios`, `dotenv`
- [x] Install dev dependency: `nodemon`
- [x] Create `.env.example` with all required and optional variables
- [x] Update `.gitignore` to ignore `node_modules/`, `.wwebjs_auth/`, `data/`, `.env`
- [x] Add `.dockerignore` for `node_modules`, `.wwebjs_auth`, `data`, `.env`

**Acceptance:** `npm install` succeeds and `npm start` runs without errors (even if it only logs a placeholder).

---

## Phase 2 — Docker Setup

- [x] Write `Dockerfile` based on `node:22-slim`
- [x] Install Chromium and dependencies inside the image
- [x] Set Puppeteer launch args for Docker (`--no-sandbox`, `--disable-setuid-sandbox`, etc.)
- [x] Write `docker-compose.yml` exposing port `9595` and mounting `data/` and `.wwebjs_auth/` volumes
- [x] Add a healthcheck to the Dockerfile or docker-compose service
- [x] Verify the container builds with `docker compose build`

**Acceptance:** `docker compose build` completes and the image starts without immediate crash.

---

## Phase 3 — Database & Persistence

- [x] Create `src/db/index.js` to open/initialize SQLite
- [x] Create `data/` directory automatically if it does not exist
- [x] Design schema in `src/db/schema.sql`:
  - `settings(key TEXT PRIMARY KEY, value TEXT)`
  - `ignored_chats(id TEXT PRIMARY KEY, name TEXT, ignored_at INTEGER)`
  - `reminders(id INTEGER PRIMARY KEY, chat_id TEXT, chat_name TEXT, sent_at INTEGER)`
  - `scan_logs(id INTEGER PRIMARY KEY, run_at INTEGER, chats_checked INTEGER, reminders_sent INTEGER, error TEXT)`
- [x] Add `src/db/settings.js` with get/set helpers for settings
- [x] Add `src/db/ignored.js` with add/remove/list helpers
- [x] Add `src/db/history.js` with log-reminder and log-scan helpers
- [x] Seed default settings: interval = 30 minutes, chat_limit = 50, threshold_hours = 3

**Acceptance:** Running the app creates `data/respondr.db` and settings can be read/written.

---

## Phase 4 — WhatsApp Client Module

- [x] Create `src/whatsapp/client.js` wrapping `whatsapp-web.js` `Client` with `LocalAuth`
- [x] Emit a QR code data URL on the `qr` event using `qrcode`
- [x] Track ready/disconnected/auth-failure states
- [x] Add `getRecentChats(limit)` that returns an array of `{ id, name, isGroup, isArchived, isMuted, lastMessage: { fromMe, timestamp } }`
- [x] Skip group chats, archived chats, and muted chats inside the client wrapper or return flags so the caller can filter
- [x] Add graceful shutdown handling (`client.destroy()` on SIGTERM)

**Acceptance:** Container starts, shows a QR code, and after linking, `getRecentChats(5)` returns real chat data.

---

## Phase 5 — Web Server

- [x] Create `src/server/index.js` initializing a Hono app and serving it with `@hono/node-server`
- [x] Add a `render()` helper that uses `ejs.renderFile` and returns HTML via `c.html()`
- [x] Serve static files from `public/` using `@hono/node-server/serve-static`
- [x] Add routes:
  - `GET /` — dashboard
  - `GET /qr` — QR code page
  - `GET /settings` — settings form
  - `GET /ignored` — ignored chats page
  - `GET /history` — history page
- [x] Add `app.onError` global error handler
- [x] Add optional `basicAuth` middleware when `DASHBOARD_USER` and `DASHBOARD_PASSWORD` are set

**Acceptance:** `curl http://localhost:9595/` returns HTML and no 500 errors.

---

## Phase 6 — Dashboard UI

- [x] Create `views/layout.ejs` base template with navigation
- [x] Create `views/index.ejs` showing status, next scan time, and recent reminder count
- [x] Create `views/qr.ejs` showing the latest QR code image and connection status
- [x] Create `views/settings.ejs` form for `interval_minutes`, `chat_limit`, `threshold_hours`
- [x] Create `views/ignored.ejs` listing recent chats with toggle buttons to ignore/unignore
- [x] Create `views/history.ejs` paginated table of `reminders` and `scan_logs`
- [x] Add `public/style.css` with minimal responsive styling

**Acceptance:** All pages load, the settings form submits and updates the database, ignored chats toggle works.

---

## Phase 7 — Chat Scanner Engine

- [x] Create `src/engine/scanner.js`
- [x] Read `chat_limit` and `threshold_hours` from settings
- [x] Call `getRecentChats(chat_limit)` and filter out groups, archived, muted, and ignored chats
- [x] For each remaining chat, calculate elapsed time since the last message
- [x] If `fromMe === false` and elapsed time > threshold, add to `forgottenChats` list
- [x] Return `forgottenChats` with fields: `id`, `name`, `lastMessageAt`, `hoursSince`

**Acceptance:** Manual test with a mock chat list returns the correct forgotten chats.

---

## Phase 8 — Notification Providers

- [x] Create `src/notifications/index.js` that selects the active provider from `.env`
- [x] Implement `src/notifications/ntfy.js`:
  - POST to `${NTFY_SERVER}/${NTFY_TOPIC}` with title, message, and priority
  - Skip if `NTFY_TOPIC` is empty
- [x] Implement `src/notifications/gotify.js`:
  - POST to `${GOTIFY_URL}/message?token=${GOTIFY_TOKEN}` with title and message
  - Skip if `GOTIFY_TOKEN` or `GOTIFY_URL` is empty
- [x] Format message as `"<Name>: no reply for X hours"`
- [x] Support enabling both providers at once
- [x] Add `.env.example` placeholders and setup comments for both providers

**Acceptance:** With provider env vars set, `node -e "require('./src/notifications').send(...)"` delivers a test notification. With empty env vars, it logs a skip and does not crash.

---

## Phase 9 — Cron Scheduler & Manual Runner

- [x] Create `src/engine/runner.js`
- [x] Function `runOnce()` that:
  - Loads settings
  - Runs scanner
  - Sends notifications for each forgotten chat
  - Logs each reminder to `reminders`
  - Logs the scan run to `scan_logs`
- [x] Create `src/scheduler.js` that starts `node-cron` using `interval_minutes` from settings
- [x] Add `POST /api/run` endpoint to trigger a manual scan
- [x] Add `GET /api/status` endpoint returning ready state, next scan, last scan result
- [x] Dynamically reschedule when `interval_minutes` changes from the dashboard

**Acceptance:** Calling `POST /api/run` performs a scan, logs results, and sends notifications. The cron runs automatically at the configured interval.

---

## Phase 10 — Integration & Entry Point

- [x] Create `src/index.js` as the single entry point
- [x] Initialize database, start WhatsApp client, start web server, then start scheduler
- [ ] Ensure `docker-compose up` brings up the full stack
- [x] Add a `README.md` update (or create instructions) for Docker build/run and `.env` setup
- [ ] Test the complete flow end-to-end in a container

**Acceptance:** `docker compose up` starts the app, the web UI is reachable, WhatsApp links, and a manual scan works.

---

## Phase 11 — Final Polish

- [x] Add basic logging (requests, scans, errors) using `console` or a lightweight logger
- [x] Handle WhatsApp disconnection/reconnection in the UI status page
- [x] Add simple input validation on settings form
- [x] Add rate limiting or debounce on manual run button
- [x] Review for hardcoded secrets and ensure credentials stay in `.env`

**Acceptance:** App runs for 24 hours in Docker without crashing and respects all configured settings.

---

## Phase 12 — Login Page (Single Account)

- [x] Add `src/server/auth.js` with session handling and a single-user auth model
- [x] Store account in `settings` table as `auth_username` and `auth_password_hash` (only one account allowed)
- [x] Add `/setup` route for first-run account creation when no account exists
- [x] Add GET/POST `/login` routes and `views/login.ejs` form
- [x] Add POST `/logout` route that clears the session
- [x] Add session middleware (signed cookie or in-memory token) and protect all routes except login/setup/static
- [x] Hash passwords with Node.js `crypto.scrypt` (prefer built-in to avoid new dependency)
- [x] Use `DASHBOARD_USER`/`DASHBOARD_PASSWORD` env vars to pre-create the account on first run

**Acceptance:** Only one account can be created; login page blocks unauthenticated users; all dashboard routes require login.

---

## Phase 13 — WhatsApp / Chrome / Puppeteer Status Icons

- [x] Extend `src/whatsapp/client.js` to expose `getHealth()` returning:
  - `whatsapp`: current status and `isReady`
  - `puppeteer`: browser object present and WS endpoint reachable
  - `chrome`: child process PID/running state and launch-error flag
- [x] Track puppeteer launch errors in `startClient()`
- [x] Update `GET /api/status` to include the `health` object
- [x] Add `public/status.js` that polls `/api/status` every 5 seconds and renders three status icons
- [x] Update `views/layout.ejs` to show the icons with color states (green/red) and tooltips

**Acceptance:** Layout shows real-time status for WhatsApp connection, Chrome process, and Puppeteer; icons update without page reload.

---

## Phase 14 — Checked Chats Page

- [x] Add GET `/chats` route in `src/server/index.js`
- [x] Call `getRecentChats(settings.chat_limit)` and pass results to `views/chats.ejs`
- [x] Create `views/chats.ejs` listing chat name, last message time, and whether the last message was `fromMe`
- [x] Show hours since last message and a "needs reply" indicator based on threshold
- [x] Add inline ignore/unignore buttons using existing `ignoredDb` helpers
- [x] Update `views/layout.ejs` navigation to include the Chats link

**Acceptance:** `/chats` loads a list of checked chats with last-sender info; ignore/unignore toggles work and refresh the page.

---

## Phase 15 — Notification Provider Settings UI

- [x] Add notification settings to the `settings` table (`ntfy_*` and `gotify_*` keys) with a `settingsDb.has()` helper
- [x] Refactor `src/notifications/index.js` and `src/notifications/{ntfy,gotify}.js` to read settings from the database at send time
- [x] Create `src/notifications/config.js` to resolve active providers and validate required fields
- [x] Add GET/POST `/notifications` route and `views/notifications.ejs` form to enable/disable and configure each provider
- [x] Add `POST /api/test-notification` endpoint that sends a test message through active providers
- [x] Seed notification settings from existing `.env` variables on first run for backward compatibility
- [x] Update `.env.example` comments to show these values can also be set in the dashboard

**Acceptance:** Notification providers can be enabled and configured from the UI; test notification succeeds; runner uses the stored settings.

---

## Phase 16 — Logging Page & Log Level

- [x] Rewrite `src/lib/logger.js` to support `debug`, `info`, `warn`, `error` levels and keep the last N log entries in memory
- [x] Monkey-patch `console.log`/`console.warn`/`console.error` so library output (WhatsApp, Puppeteer, Chrome) is captured
- [x] Add `log_level` setting and initialize the logger level on startup
- [x] Add `GET /logs` route and `views/logs.ejs` with a level selector and auto-refreshing log stream
- [x] Add `GET /api/logs` endpoint for the live log stream
- [x] Add `POST /logs` to change the active log level
- [x] Update `views/layout.ejs` navigation and `public/style.css` for the logs page

**Acceptance:** The `/logs` page displays captured logs in real time and lets the user switch between debug/info/warn/error levels; WhatsApp/Puppeteer/Chrome errors appear in the log stream.

---

## Phase 17 — Debug & Connection Reliability

- [x] Add debug logging throughout `src/whatsapp/client.js` for QR, auth, ready, disconnected, loading, state, battery, getHealth, and getRecentChats
- [x] Add `restartClient()` and `POST /api/reconnect` endpoint
- [x] Add a reconnect button to the dashboard
- [x] Harden `getHealth()` and `/api/status` with try/catch around puppeteer/chrome checks
- [x] Add `fetch` timeout with `AbortController` in `public/status.js` so the status indicator never stays on "checking..."
- [x] Expand default `PUPPETEER_ARGS` for stability and update `run-local-no-docker.sh` to install Chrome matching the project's Puppeteer major version
- [x] Surface current log level on the `/logs` page

**Acceptance:** Debug logs are visible when log level is debug; `/api/status` never crashes the server; status indicator updates or shows "unavailable" within 8 seconds; reconnect works from the dashboard.

---

## Updated Proposed File Structure

```
/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .gitignore
├── .dockerignore
├── package.json
├── README.md
├── PLAN.md
├── src/
│   ├── index.js
│   ├── lib/
│   │   └── logger.js        # updated: level-aware, in-memory ring buffer
│   ├── server/
│   │   ├── index.js
│   │   ├── render.js
│   │   └── auth.js          # new: session/login helpers & middleware
│   ├── whatsapp/
│   │   └── client.js
│   ├── engine/
│   │   ├── scanner.js
│   │   ├── runner.js
│   │   └── scheduler.js
│   ├── notifications/
│   │   ├── index.js
│   │   ├── config.js        # new: provider settings resolution
│   │   ├── ntfy.js
│   │   └── gotify.js
│   └── db/
│       ├── index.js
│       ├── settings.js
│       ├── ignored.js
│       └── history.js
├── views/
│   ├── layout.ejs
│   ├── index.ejs
│   ├── login.ejs            # new
│   ├── chats.ejs            # new
│   ├── notifications.ejs    # new
│   ├── logs.ejs             # new
│   ├── qr.ejs
│   ├── settings.ejs
│   ├── ignored.ejs
│   └── history.ejs
└── public/
    ├── style.css
    └── status.js            # new
```
