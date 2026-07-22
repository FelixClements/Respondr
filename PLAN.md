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
- [ ] Verify the container builds with `docker compose build`

**Acceptance:** `docker compose build` completes and the image starts without immediate crash.

---

## Phase 3 — Database & Persistence

- [ ] Create `src/db/index.js` to open/initialize SQLite
- [ ] Create `data/` directory automatically if it does not exist
- [ ] Design schema in `src/db/schema.sql`:
  - `settings(key TEXT PRIMARY KEY, value TEXT)`
  - `ignored_chats(id TEXT PRIMARY KEY, name TEXT, ignored_at INTEGER)`
  - `reminders(id INTEGER PRIMARY KEY, chat_id TEXT, chat_name TEXT, sent_at INTEGER)`
  - `scan_logs(id INTEGER PRIMARY KEY, run_at INTEGER, chats_checked INTEGER, reminders_sent INTEGER, error TEXT)`
- [ ] Add `src/db/settings.js` with get/set helpers for settings
- [ ] Add `src/db/ignored.js` with add/remove/list helpers
- [ ] Add `src/db/history.js` with log-reminder and log-scan helpers
- [ ] Seed default settings: interval = 30 minutes, chat_limit = 50, threshold_hours = 3

**Acceptance:** Running the app creates `data/respondr.db` and settings can be read/written.

---

## Phase 4 — WhatsApp Client Module

- [ ] Create `src/whatsapp/client.js` wrapping `whatsapp-web.js` `Client` with `LocalAuth`
- [ ] Emit a QR code data URL on the `qr` event using `qrcode`
- [ ] Track ready/disconnected/auth-failure states
- [ ] Add `getRecentChats(limit)` that returns an array of `{ id, name, isGroup, isArchived, isMuted, lastMessage: { fromMe, timestamp } }`
- [ ] Skip group chats, archived chats, and muted chats inside the client wrapper or return flags so the caller can filter
- [ ] Add graceful shutdown handling (`client.destroy()` on SIGTERM)

**Acceptance:** Container starts, shows a QR code, and after linking, `getRecentChats(5)` returns real chat data.

---

## Phase 5 — Web Server

- [ ] Create `src/server/index.js` initializing a Hono app and serving it with `@hono/node-server`
- [ ] Add a `render()` helper that uses `ejs.renderFile` and returns HTML via `c.html()`
- [ ] Serve static files from `public/` using `@hono/node-server/serve-static`
- [ ] Add routes:
  - `GET /` — dashboard
  - `GET /qr` — QR code page
  - `GET /settings` — settings form
  - `GET /ignored` — ignored chats page
  - `GET /history` — history page
- [ ] Add `app.onError` global error handler
- [ ] Add optional `basicAuth` middleware when `DASHBOARD_USER` and `DASHBOARD_PASSWORD` are set

**Acceptance:** `curl http://localhost:9595/` returns HTML and no 500 errors.

---

## Phase 6 — Dashboard UI

- [ ] Create `views/layout.ejs` base template with navigation
- [ ] Create `views/index.ejs` showing status, next scan time, and recent reminder count
- [ ] Create `views/qr.ejs` showing the latest QR code image and connection status
- [ ] Create `views/settings.ejs` form for `interval_minutes`, `chat_limit`, `threshold_hours`
- [ ] Create `views/ignored.ejs` listing recent chats with toggle buttons to ignore/unignore
- [ ] Create `views/history.ejs` paginated table of `reminders` and `scan_logs`
- [ ] Add `public/style.css` with minimal responsive styling

**Acceptance:** All pages load, the settings form submits and updates the database, ignored chats toggle works.

---

## Phase 7 — Chat Scanner Engine

- [ ] Create `src/engine/scanner.js`
- [ ] Read `chat_limit` and `threshold_hours` from settings
- [ ] Call `getRecentChats(chat_limit)` and filter out groups, archived, muted, and ignored chats
- [ ] For each remaining chat, calculate elapsed time since the last message
- [ ] If `fromMe === false` and elapsed time > threshold, add to `forgottenChats` list
- [ ] Return `forgottenChats` with fields: `id`, `name`, `lastMessageAt`, `hoursSince`

**Acceptance:** Manual test with a mock chat list returns the correct forgotten chats.

---

## Phase 8 — Notification Providers

- [ ] Create `src/notifications/index.js` that selects the active provider from `.env`
- [ ] Implement `src/notifications/ntfy.js`:
  - POST to `${NTFY_SERVER}/${NTFY_TOPIC}` with title, message, and priority
  - Skip if `NTFY_TOPIC` is empty
- [ ] Implement `src/notifications/gotify.js`:
  - POST to `${GOTIFY_URL}/message?token=${GOTIFY_TOKEN}` with title and message
  - Skip if `GOTIFY_TOKEN` or `GOTIFY_URL` is empty
- [ ] Format message as `"<Name>: no reply for X hours"`
- [ ] Support enabling both providers at once
- [ ] Add `.env.example` placeholders and setup comments for both providers

**Acceptance:** With provider env vars set, `node -e "require('./src/notifications').send(...)"` delivers a test notification. With empty env vars, it logs a skip and does not crash.

---

## Phase 9 — Cron Scheduler & Manual Runner

- [ ] Create `src/engine/runner.js`
- [ ] Function `runOnce()` that:
  - Loads settings
  - Runs scanner
  - Sends notifications for each forgotten chat
  - Logs each reminder to `reminders`
  - Logs the scan run to `scan_logs`
- [ ] Create `src/scheduler.js` that starts `node-cron` using `interval_minutes` from settings
- [ ] Add `POST /api/run` endpoint to trigger a manual scan
- [ ] Add `GET /api/status` endpoint returning ready state, next scan, last scan result
- [ ] Dynamically reschedule when `interval_minutes` changes from the dashboard

**Acceptance:** Calling `POST /api/run` performs a scan, logs results, and sends notifications. The cron runs automatically at the configured interval.

---

## Phase 10 — Integration & Entry Point

- [ ] Create `src/index.js` as the single entry point
- [ ] Initialize database, start WhatsApp client, start web server, then start scheduler
- [ ] Ensure `docker-compose up` brings up the full stack
- [ ] Add a `README.md` update (or create instructions) for Docker build/run and `.env` setup
- [ ] Test the complete flow end-to-end in a container

**Acceptance:** `docker compose up` starts the app, the web UI is reachable, WhatsApp links, and a manual scan works.

---

## Phase 11 — Final Polish

- [ ] Add basic logging (requests, scans, errors) using `console` or a lightweight logger
- [ ] Handle WhatsApp disconnection/reconnection in the UI status page
- [ ] Add simple input validation on settings form
- [ ] Add rate limiting or debounce on manual run button
- [ ] Review for hardcoded secrets and ensure credentials stay in `.env`

**Acceptance:** App runs for 24 hours in Docker without crashing and respects all configured settings.

---

## Proposed File Structure

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
│   ├── server/
│   │   ├── index.js
│   │   └── render.js
│   ├── whatsapp/
│   │   └── client.js
│   ├── engine/
│   │   ├── scanner.js
│   │   ├── runner.js
│   │   └── scheduler.js
│   ├── notifications/
│   │   ├── index.js
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
│   ├── qr.ejs
│   ├── settings.ejs
│   ├── ignored.ejs
│   └── history.ejs
└── public/
    └── style.css
```
