# Self-hosted security guide

Respondr is a single-admin dashboard that runs WhatsApp Web automation on your server. That is a sensitive job. If you put port 9595 on the public internet without thinking, you are handing strangers a shot at your WhatsApp session, your chat metadata, and your notification channels.

This document is for operators who self-host Respondr and may expose it outside their home LAN.

## Threat model

Respondr is **single-tenant**: one instance, one admin account, one WhatsApp link. The real risks are:

1. Someone takes over the dashboard before you finish setup.
2. Someone guesses or steals your admin session.
3. A compromised container gives an attacker Chromium, your WhatsApp auth files, and your SQLite database.

Assume attackers can reach your HTTP port. Assume they will probe `/api/auth-status` and `/api/setup` on fresh installs.

## Built-in protections (September 2026)

| Control | Behavior |
|---------|----------|
| Production startup guard | `NODE_ENV=production` requires unique `BETTER_AUTH_SECRET` (32+ chars) and `BETTER_AUTH_URL` starting with `https://` |
| Listen address | Development defaults to `127.0.0.1`. Production defaults to `0.0.0.0`. Override with `HOST`. |
| First-boot setup | HTTP `/api/setup` is open without a token only on a loopback bind. Production and `HOST=0.0.0.0` require `SETUP_TOKEN` (via `X-Setup-Token` or `setupToken` in JSON), or use `DASHBOARD_*` env bootstrap instead. |
| Env bootstrap | `DASHBOARD_USER` + `DASHBOARD_PASSWORD` still create the admin at container boot without HTTP setup |
| Signup lockdown | `disableSignUp: true`, `/sign-up/email` and `/is-username-available` disabled, database hook rejects a second user |
| Password policy | Minimum 8 characters |
| Rate limits | `POST /api/setup`: 5 / 15 min / IP; `POST /api/auth/sign-in*`: 10 / 15 min / IP; `GET /api/auth-status`: 30 / min / IP (requires `TRUST_PROXY=true` behind a reverse proxy to trust `X-Forwarded-For`) |
| Outbound webhooks | Gotify/NTFY URLs must be `http`/`https`. LAN and Docker DNS are allowed. Cloud metadata / link-local hosts are blocked. Requests do not follow redirects. |
| Web Push endpoints | HTTPS only, hostname must be a known push provider (FCM, Mozilla, Apple, WNS) |
| Security headers | `secureHeaders()` on all responses (nosniff, DENY framing, referrer policy, permissions policy) |
| Gotify auth | Token sent in `X-Gotify-Key` header, not query string |
| Docker defaults | `docker-compose.yml` sets `NODE_ENV=production` and requires `.env` (no placeholder secrets) |

## Remaining operator responsibilities

| Area | Notes |
|------|-------|
| TLS termination | App enforces `https://` in `BETTER_AUTH_URL` for production; terminate TLS at Caddy, nginx, or Traefik |
| Proxy rate limits | App already rate-limits setup, sign-in, and auth-status. Set `TRUST_PROXY=true` in `.env` when deploying behind a reverse proxy so client IPs are extracted from `X-Real-IP` or `X-Forwarded-For`. Ensure your reverse proxy overwrites `X-Forwarded-For` with the true client IP (`$remote_addr`) to prevent header spoofing. |
| Strong passwords | App minimum is 8 characters; use 12+ for admin accounts |
| Container hardening | Container runs as unprivileged `node` user; Chromium uses `--no-sandbox` (typical in Docker) |
| Dependency CVEs | Keep images patched; `whatsapp-web.js`/puppeteer chain has upstream advisories |

## First-boot setup options

**Option A (recommended for Docker):** set before first `docker compose up`:

```env
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=<long random password>
```

**Option B:** set `SETUP_TOKEN` and complete `/setup` in the browser with the token from `.env`:

```env
SETUP_TOKEN=<openssl rand -base64 32>
```

In production without either option, HTTP setup returns `503`. The same is true in development if you set `HOST=0.0.0.0` without `SETUP_TOKEN`.

## Production `.env` example

```env
NODE_ENV=production
BETTER_AUTH_URL=https://respondr.example.com
BETTER_AUTH_SECRET=<openssl rand -base64 32>
DASHBOARD_USER=admin
DASHBOARD_PASSWORD=<long random password>
# or SETUP_TOKEN=<openssl rand -base64 32>
```

### Example: Caddy in front

```caddy
respondr.example.com {
    reverse_proxy localhost:9595
}
```

## Operator checklist (internet-facing)

- [ ] Generate a unique `BETTER_AUTH_SECRET` (32+ random bytes).
- [ ] Set `DASHBOARD_USER` and `DASHBOARD_PASSWORD` before first boot, **or** set `SETUP_TOKEN` and use `/setup` before exposing the port.
- [ ] Set `BETTER_AUTH_URL` to your public `https://` URL.
- [ ] Put TLS in front (reverse proxy). Do not expose plain HTTP.
- [ ] Use a strong admin password (12+ characters).
- [ ] Keep Docker images and host OS patched.
- [ ] Back up the `respondr_data` and `respondr_wwebjs_auth` volumes.
- [ ] Prefer VPN or private network access over raw public exposure when possible.

## What looks solid

| Area | Notes |
|------|-------|
| API authorization | Everything under `/api/*` except `/api/auth`, `/api/setup`, and `/api/auth-status` goes through `requireAuth`. |
| SQL | Parameterized queries in `src/db/*.ts`. |
| XSS | No user-controlled `{@html}` sinks in the Svelte app. |
| CORS | No permissive cross-origin middleware on the API. |
| Push payloads | Server sets `url: '/'` from code, not user input. |

## Out of scope

Dependency CVE scanning, penetration testing, and WhatsApp ToS risk. WhatsApp may ban accounts that use unofficial automation regardless of how well you lock down the server.

## Reporting vulnerabilities

Open a private report via GitHub Security Advisories on the repository. Do not post exploit details in public issues before a fix is available.
