# Respondr — Mobile PWA implementation plan

This plan turns the wayfinder decisions into a build order. It keeps the existing Hono/EJS stack and adds the PWA on top.

## What we are building

A mobile-first Progressive Web App for Respondr, installable on iOS Safari and Android Chrome, with push reminders and a mobile-optimized UI. The desktop dashboard remains unchanged.

## Decisions to implement

| Area | Decision |
|---|---|
| Scope | Add mobile PWA; desktop stays for linking and full management. |
| Stack | Hono + EJS + vanilla JS; add `manifest.json` and service worker. |
| Navigation | Bottom tabs: **Home**, **Chats**, **Settings**. |
| Home | Dashboard: status + 3 horizontal stat cards + recent reminders. |
| Chats | Card-style list with avatars; actions via **swipe left/right**. Ignored section lives under Chats. |
| Settings | Core settings, notifications, Advanced (Logs, History, Link instructions, Re-subscribe). |
| Auth | Same username/password; reuse `/login` responsive; 30-day mobile session cookie. |
| Linking | Not a tab; Home banner with 5 desktop-linking steps + manual refresh. |
| Install prompt | Bottom banner on first visit, X dismiss; iOS shows "Show me how" steps; Android shows install CTA. |
| Push | Contextual permission request; re-prompt once per session; Settings "Re-subscribe"; fallback to ntfy/Gotify. |
| Offline | Cache app shell + API data; queue mutations; no Background Sync on iOS. |

## Phases

### Phase 1 — PWA manifest and service worker scaffold

- [ ] Add `public/manifest.json` with name, short_name, icons, `display: standalone`, `start_url: "/?standalone=1"`, `theme_color`, `background_color`.
- [ ] Add `public/icon-192.png` and `public/icon-512.png` (or generate placeholders).
- [ ] Add `public/service-worker.js` (vanilla) and `public/sw-register.js`.
- [ ] Register the service worker on page load.
- [ ] Update `src/server/pages.js` / layout to include manifest link, theme color, and `sw-register.js`.

**Acceptance:** Lighthouse PWA audit shows the app is installable and has a service worker.

### Phase 2 — Mobile viewport and base styles

- [ ] Add mobile-first CSS (`public/mobile.css`) with bottom tab bar, cards, touch targets, safe-area insets.
- [ ] Add `?mobile` or `display-mode: standalone` detection to serve mobile layout.
- [ ] Create `views/layout.ejs` responsive split: desktop unchanged, mobile adds bottom tab bar and mobile CSS.
- [ ] Ensure tap targets are at least 44×44 px.

**Acceptance:** Open `/` on a 375px-wide viewport; bottom tabs and cards render without horizontal scroll.

### Phase 3 — Mobile login

- [ ] Make `views/login.ejs` and `views/setup.ejs` responsive for phone.
- [ ] Set mobile session cookie to 30 days (desktop keeps 7 days). Use a `?mobile=1` flag or user-agent path to choose TTL.
- [ ] Test login on iOS PWA in standalone mode.

**Acceptance:** Login works on iOS PWA and the cookie persists for 30 days.

### Phase 4 — Home tab

- [ ] Create mobile `views/index.ejs` variant (or `views/mobile/index.ejs`).
- [ ] Show: WhatsApp status, 3 horizontal stats (Need reply / Snoozed / Next scan), recent reminders.
- [ ] Add pull-to-refresh for the Home tab.
- [ ] Handle "not linked" state with the 5-step banner (Phase 8).

**Acceptance:** Home matches the `prototypes/layout/index.html` "Stat row" dashboard.

### Phase 5 — Chats tab

- [ ] Create mobile `views/chats.ejs` with card-style chat rows.
- [ ] Add avatars, name, time, status meta, swipe left/right actions (Done, Ignore, Unignore).
- [ ] Add an "Ignored" section within the Chats tab (toggle or separate segment).
- [ ] Wire `/chats/:id/done`, `/chats/:id/ignore`, `/chats/:id/unignore` to return JSON or redirect appropriately for mobile.

**Acceptance:** Chats matches `prototypes/layout/index.html` card list with swipe actions.

### Phase 6 — Settings tab

- [ ] Create mobile `views/settings.ejs` grouping Core, Notifications, Advanced.
- [ ] Core: interval, chat limit, threshold.
- [ ] Notifications: ntfy, Gotify, Web Push subscribe/re-subscribe, test.
- [ ] Advanced: Link WhatsApp instructions, Logs, History, logout.
- [ ] Add re-subscribe logic: if the server reports no valid push subscription, show the re-subscribe prompt.

**Acceptance:** All existing settings and notification options are reachable on mobile.

### Phase 7 — Install prompt

- [ ] Add an install prompt banner for iOS and Android.
- [ ] Detect `display-mode: standalone` and `navigator.standalone` to avoid prompting installed users.
- [ ] Android: use `beforeinstallprompt` where available; show install CTA.
- [ ] iOS: show bottom banner with "Show me how"; tapping opens the 3 Safari install steps.
- [ ] Add X dismiss and store dismissal in `localStorage`.
- [ ] Show only on first visit (or until dismissed).

**Acceptance:** Install prompt works on iOS and Android and is not shown after the user installs/dismisses.

### Phase 8 — WhatsApp linking instructions

- [ ] Add a "Not connected" banner on the Home tab when `status.isReady === false`.
- [ ] Banner displays the 5 steps and an "I’ve linked, refresh" button.
- [ ] Keep the desktop `/qr` page unchanged for the actual QR code.

**Acceptance:** When not linked, the mobile Home shows the banner; when linked, it disappears.

### Phase 9 — Web Push

- [ ] Add a service worker `push` event that displays a notification.
- [ ] Add client-side `pushManager.subscribe` triggered contextually (e.g. after the user enables notifications for a chat).
- [ ] POST subscription to `/api/push/subscribe`.
- [ ] Add re-prompt guard (max once per app session) and a "Re-subscribe" button in Settings.
- [ ] Detect failed subscriptions and show a muted state + ntfy/Gotify fallback.

**Acceptance:** A test push reaches the iOS PWA when installed on iOS 16.4+; subscription loss is handled gracefully.

### Phase 10 — Offline resilience

- [ ] Precache app shell and static assets in service worker `install`.
- [ ] Use a **Network First** strategy for `/api/*` and cache fallback for the last response.
- [ ] Use a **Cache First / Stale-While-Revalidate** strategy for static assets.
- [ ] Queue user actions (ignore, done, settings changes) in IndexedDB and replay on `online` event.
- [ ] Use Background Sync as an enhancement on Android; iOS falls back to `online` event.

**Acceptance:** The PWA opens offline and shows the last-known data; queued actions replay when online.

## Out of scope

- Native iOS or Android apps.
- Replacing or removing the desktop dashboard.
- Background chat scanning or reminder generation on the client.
- Changing the WhatsApp Web linking protocol.

## Open questions for implementation

- Where exactly to trigger the first contextual push permission (which chat action).
- Exact icon assets and splash screens.
- Whether to use Workbox or a hand-rolled service worker (recommended: hand-rolled for this size).
