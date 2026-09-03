# Production security hardening design

**Date:** 2026-08-30  
**Status:** Implemented

## Goal

Harden Respondr for internet-facing deployment without relying solely on operator discipline. Fail closed in production when misconfigured; preserve single-admin + env-bootstrap workflow.

## Decisions

1. **Startup guard** — `validateProductionConfig()` in `src/index.ts` rejects production starts without a unique 32+ char `BETTER_AUTH_SECRET` and `https://` `BETTER_AUTH_URL`.
2. **SETUP_TOKEN** — Production HTTP `/api/setup` requires `SETUP_TOKEN` when set; blocked entirely when unset (use `DASHBOARD_*` env bootstrap instead).
3. **Signup lockdown** — `disableSignUp: true`, disabled username enumeration path, database hook caps users at one.
4. **Rate limits** — In-memory limiter on setup (5/15min), sign-in (10/15min), and auth-status (30/min) per client IP.
5. **Security headers** — Hono `secureHeaders()` globally; no strict CSP (PWA compatibility).
6. **Gotify** — Token in `X-Gotify-Key` header, not query string. Outbound Gotify/NTFY URLs reject cloud metadata / link-local and do not follow redirects; LAN HTTP remains allowed.
7. **Docker** — `NODE_ENV=production`, required `.env`, no placeholder secret defaults.
8. **Web Push** — Subscription endpoints must be HTTPS on known push-provider hosts.
9. **Listen address** — Development binds `127.0.0.1` unless `HOST` is set. HTTP `/api/setup` without `SETUP_TOKEN` is allowed only on a loopback bind.

## Out of scope

Non-root Docker user, Chromium sandbox changes, reverse-proxy config as code, dependency CVE remediation in puppeteer chain.
