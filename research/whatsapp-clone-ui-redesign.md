# WhatsApp-clone UI redesign for Respondr — Research findings

**Date:** 2026-08-19  
**Reference demo:** [whatsapp-f7-react.uiinitiative.com](https://whatsapp-f7-react.uiinitiative.com/)  
**Scope:** Evaluate whether Respondr’s SvelteKit + Konsta UI dashboard should be reskinned to resemble the UI Initiative WhatsApp demo, and compare three implementation paths.

> **Update (2026-08-19):** Global chrome direction has moved to **MD3-native Android** — see [native-android-ui-respondr.md](./native-android-ui-respondr.md). This doc remains useful for chat-list density, screen mapping, and stack tradeoffs; green toolbars and WA hex tokens are **not** the target anymore.

---

## Executive summary

Respondr is a **WhatsApp automation dashboard** (reminder engine), not a messenger. The UI Initiative demo is a **full iOS WhatsApp shell clone** built with **Framework7 + React + Vite** ([catalog page](https://uiinitiative.com/catalog/whatsapp-f7-react)). Most demo screens (Status, Calls, Camera, message threads) are **irrelevant** to Respondr; the valuable patterns are **chat list rows, settings layout, tab bar, and iOS grouped-list chrome**.

| Approach | Verdict | Effort (credible v1) |
|----------|---------|----------------------|
| **(A) Reskin Konsta + Tailwind** | ✅ **Recommended** | **10–15 person-days** (~2–3 weeks) |
| **(B) Buy UI Initiative template, port to Svelte/Konsta** | ⚠️ Reference purchase only | **15–25 person-days** (port + integration) |
| **(C) Migrate to Framework7 + React** | ❌ Not recommended | **30–50 person-days** (full rewrite) |

**Recommendation:** **Approach A** — treat the live demo as a visual spec. Keep SvelteKit 2, Konsta UI 5, Tailwind 4, Better Auth, Hono API, and `@vite-pwa/sveltekit` unchanged. Optionally buy the template (**B**) as a licensed CSS/layout reference if pixel-level fidelity matters; do **not** change stacks (**C**).

Prior research already concluded Framework7 + SvelteKit is officially incompatible ([#3928 wontfix](https://github.com/framework7io/framework7/issues/3928)); see [framework7-konsta-svelte-rebuild.md](./framework7-konsta-svelte-rebuild.md).

---

## 1. Primary sources consulted

| Source | What it establishes | URL |
|--------|---------------------|-----|
| UI Initiative WhatsApp catalog | Screen list, stack (F7+React), PWA, mocked data, last updated May 2023 | https://uiinitiative.com/catalog/whatsapp-f7-react |
| Live demo HTML/JS/CSS | Routes, tab bar, colors, F7 components in production bundle | https://whatsapp-f7-react.uiinitiative.com/ |
| Framework7 templates page | WhatsApp listed under UI Initiative; same author as Konsta | https://framework7.io/templates/ |
| Framework7 color themes | Custom `--f7-color-primary`; iOS/Material token model | https://framework7.io/docs/color-themes.html |
| Framework7 Swipeout / Messages | Widgets used in demo but absent from Konsta | https://framework7.io/docs/swipeout.html, https://framework7.io/docs/messages.html |
| F7 + SvelteKit incompatibility | Official wontfix on SSR/SvelteKit integration | https://github.com/framework7io/framework7/issues/3928 |
| Konsta Colors | `@theme { --color-brand-* }` drives component theming | https://konstaui.com/svelte/colors |
| Konsta Tabbar / Navbar / List | Props for large titles, full-bleed lists, tab colors | https://konstaui.com/svelte/tabbar, https://konstaui.com/svelte/navbar, https://konstaui.com/svelte/list |
| UI Initiative forum (#14406) | WhatsApp template is React-specific; other templates ship as F7-Core JSX | https://forum.framework7.io/t/ui-initiative-premium-framework7-templates-plugins/14406 |
| WhatsApp brand green (secondary) | Official brand guide cites `#25D366` and teal `#075E54` | https://www.color-name.com/whatsapp-green.color |
| WhatsApp dark UI tokens (secondary) | Widely observed Web/iOS dark palette; Meta does not publish a public UI token spec | https://www.wwebcustomizer.com/blog/how-to-get-dark-mode-on-whatsapp-web-beyond-the-default |

**Note on color sources:** WhatsApp/Meta publishes **brand** colors in marketing materials; **in-app UI tokens** are inferred from the UI Initiative demo bundle and community-documented Web dark-mode hex values. The demo uses slightly different greens (`#4BD763`) than official brand green (`#25D366`).

---

## 2. UI Initiative WhatsApp template (catalog)

### Product facts

| Attribute | Detail |
|-----------|--------|
| Name | “WhatsApp UI made with Framework7 & React” |
| Stack | Framework7 CLI + Vite + React; iOS theme; PWA with service worker |
| Data | 100% locally mocked — no API |
| Dark mode | Auto from system preference (`darkMode: "auto"` in demo bundle) |
| Last updated | May 14, 2023 ([catalog](https://uiinitiative.com/catalog/whatsapp-f7-react)) |
| License | Commercial; download requires purchase/login |
| All-Access bundle | **$49** one-time, lifetime ([UI Initiative homepage](https://uiinitiative.com/)) |
| Svelte variant | **None** — React-only per [forum #14406](https://forum.framework7.io/t/ui-initiative-premium-framework7-templates-plugins/14406) |

### Demo technical footprint (verified from bundle)

- **HTML:** `viewport-fit=cover`, `apple-mobile-web-app-capable`, PWA manifest at `assets/manifest.*.json`
- **Config:** `theme: "ios"` in JS bundle
- **Hosting:** Cloudflare Pages (analytics beacon in HTML)
- **Public source:** Minified `index.4d19ec1c.js` + `index.fccd5c0f.css` only; full F7 CLI project ships with purchase

---

## 3. Demo screen inventory and Respondr mapping

Routes extracted from `index.4d19ec1c.js`:

| Demo route | Screen | F7 patterns | Respondr relevance |
|------------|--------|-------------|-------------------|
| `/chats/` | Chat list (default tab) | Large navbar, `Searchbar`, `swipeout` rows, avatars | ✅ **Primary** — map to `/chats` |
| `/chats/:id/` | Message thread | `Messages`, `Messagebar`, bubble grouping | ⚠️ **Defer** — Respondr has no composer; optional “preview last message” later |
| `/contacts/` | New Chat popup | Searchable contacts modal | ❌ **Skip** — Respondr doesn’t start WA chats |
| `/settings/` | Settings root | Profile header, colored icon rows | ✅ **Primary** — map to `/settings` |
| `/profile/:id/` | Contact info | Profile detail, media grid | ⚠️ **Partial** — could inspire per-chat detail drawer |
| `/status/` | Status / stories | Horizontal story rings | ⚠️ **Pattern only** — borrow header for `/` “Updates” |
| `/status-privacy/` | Status privacy | Grouped list sub-page | ❌ **Skip** |
| `/calls/` | Calls log | Segmented All/Missed, swipeout | ❌ **Skip** — no telephony |
| `/contacts/` (calls context) | New Call popup | Searchable contacts | ❌ **Skip** |
| `/camera/` | Camera modal | `MediaDevices` viewfinder | ❌ **Skip** |
| `/(.*)` | 404 | — | N/A |

### Demo tab bar (4 tabs)

From demo JS: **Status** (`status`) | **Calls** (`phone`) | **Chats** (`chat_bubble`, default) | **Settings** (`gear`).

**Respondr proposal (3 tabs):** keep current IA — **Home/Updates** | **Chats** (default) | **Settings** — with WhatsApp visual treatment. Do **not** add Status/Calls tabs; they misrepresent the product.

### Chat list swipe actions (demo)

Verified labels: **Unread**, **Pin** (left); **More**, **Archive** (right) — all stubbed with `dialog.alert` in demo.

**Respondr mapping:** **Done** (green, right swipe) | **Ignore** (gray, left swipe) — same gesture pattern, different semantics.

### Settings icon colors (demo JS)

| Hex | Icon | Demo row |
|-----|------|----------|
| `#4BD763` | `chat_bubble` | Chats |
| `#4BD763` | `arrow_up_arrow_down` | (data/storage) |
| `#007AFF` | `person_fill` | Account |
| `#007BFD` | `info` | Help |
| `#09AC9F` | `device_laptop` | Linked Devices |
| `#FE3C30` | `app_badge` | Notifications |
| `#FF2C55` | `heart_fill` | Tell a Friend |
| `#FFC601` | `star_fill` | Starred Messages |

Reuse this **colored circle + chevron row** pattern for Respondr settings groups.

---

## 4. Visual patterns from the live demo

### App shell

```
┌─────────────────────────────────────┐
│  Large-title Navbar (transparent)    │  ← “Chats”, “Settings”, etc.
│  [Edit]              [compose icon]  │
├─────────────────────────────────────┤
│  Optional Searchbar (subnavbar)      │
├─────────────────────────────────────┤
│  Scrollable content (list / messages)│
├─────────────────────────────────────┤
│  Tabbar: Status | Calls | Chats | ⚙  │  ← icons + labels, safe-areas
└─────────────────────────────────────┘
```

- **Navigation:** F7 stack router with swipe-back; routable popups for Contacts/Camera
- **Typography:** iOS system stack (`-apple-system`, SF Pro) — already in Respondr `app.css`
- **List style:** Full-bleed chat rows on gray page background — **not** Konsta `strong inset` cards

### Colors observed in demo bundle

**From production CSS** (`index.fccd5c0f.css` — F7 iOS base):

| Token | Hex | Usage |
|-------|-----|-------|
| Page background | `#efeff4` | Grouped list pages |
| Navbar / bar bg | `#f7f7f7` / `#f7f7f8` | Top bars, tab bar |
| Separator | `#c8c8cd` / `#e5e5ea` | Hairlines |
| Muted text | `#8e8e93` | Timestamps, secondary |
| iOS blue | `#007aff` | System links/actions |
| iOS red | `#ff3b30` | Destructive |
| Dark surfaces | `#1c1c1d`, `#121212`, `#252525` | Dark mode chrome |

**From demo JS** (WhatsApp-specific accents):

| Token | Hex | Usage |
|-------|-----|-------|
| WA icon green | `#4BD763` | Settings Chats row, accents |
| Teal | `#09AC9F` | Linked devices |
| Yellow | `#FFC601` | Starred |
| Pink | `#FF2C55` | Social/share rows |

**Official WhatsApp brand** (not identical to demo accents):

| Token | Hex | Source |
|-------|-----|--------|
| WhatsApp Green | `#25D366` | [Brand guide citation](https://www.color-name.com/whatsapp-green.color) |
| Dark Teal (legacy header) | `#075E54` | Same source; common in light-mode marketing |
| Light bubble green | `#DCF8C6` | Outgoing message bubbles (native app pattern) |
| Chat wallpaper | `#ECE5DD` | Default light wallpaper |

**WhatsApp dark mode** (Web/iOS — secondary sources; use for Respondr dark pass):

| Token | Hex | Usage |
|-------|-----|-------|
| App background | `#111B21` | Canvas |
| Panel / header | `#202C33` | Nav, list rows |
| Composer / received bubble | `#2A3942` | Inputs, surfaces |
| Sent bubble | `#005C4B` | Outgoing (if thread view added) |
| Primary text | `#E9EDEF` | Body text |
| Secondary text | `#8696A0` | Timestamps |
| Accent green | `#25D366` | Badges, online, CTAs |
| Link blue | `#53BDEB` | URLs |

Sources: [WWeb Customizer dark palette table](https://www.wwebcustomizer.com/blog/how-to-get-dark-mode-on-whatsapp-web-beyond-the-default).

### Design tokens for Respondr (`web/src/app.css`)

```css
@import 'tailwindcss';
@import 'konsta/svelte/theme.css';

@theme {
  /* Konsta primary — drives Tabbar active, links, etc. */
  --color-brand-primary: #25D366;
  --color-brand-wa-green: #25D366;
  --color-brand-wa-green-demo: #4BD763;  /* UI Initiative demo accent */
  --color-brand-wa-teal: #075E54;
  --color-brand-wa-blue: #007AFF;
  --color-brand-wa-red: #FF3B30;
  --color-brand-wa-yellow: #FFC601;
  --color-brand-wa-pink: #FF2C55;
  --color-brand-wa-teal-accent: #09AC9F;

  /* Light chrome */
  --color-brand-wa-bg: #EFEFF4;
  --color-brand-wa-surface: #FFFFFF;
  --color-brand-wa-bar: #F6F6F6;
  --color-brand-wa-muted: #8E8E93;
  --color-brand-wa-separator: #C8C8CD;

  /* Dark chrome */
  --color-brand-wa-dark-bg: #111B21;
  --color-brand-wa-dark-panel: #202C33;
  --color-brand-wa-dark-surface: #2A3942;
  --color-brand-wa-dark-text: #E9EDEF;
  --color-brand-wa-dark-muted: #8696A0;
}
```

Apply via Konsta `colors` props on `Tabbar`, `Navbar`, `Badge` per [Konsta Colors](https://konstaui.com/svelte/colors). Set PWA `theme_color` to `#075E54` or `#25D366` in `vite.config.ts` and `app.html` (currently `#0B0F19`).

---

## 5. Three-approach comparison

### (A) Reskin Konsta + Tailwind — **Recommended**

**What:** Keep SvelteKit routing, auth, API; restyle with design tokens, new list-row components, optional swipe gestures.

| Pros | Cons |
|------|------|
| Zero stack change; builds on existing `web/` Konsta app | No native F7 `Swipeout` — custom gesture component |
| SvelteKit SSR/static adapter + Better Auth unchanged | ~80–90% demo fidelity without thread view |
| Konsta already provides `Tabbar`, `Navbar`, `List`, `Searchbar`, `Badge` | Demo last updated 2023 — verify against current iOS WA occasionally |
| Aligns with [framework7-konsta-svelte-rebuild.md](./framework7-konsta-svelte-rebuild.md) decision | |

**Effort:** 10–15 person-days (see §9).

### (B) Buy UI Initiative template, port to Svelte/Konsta

**What:** Purchase React+F7 template ($49 All-Access or individual); manually port JSX pages, CSS class names, and assets to Svelte 5 + Konsta equivalents.

| Pros | Cons |
|------|------|
| Licensed source for spacing, assets, dark mode CSS | **Cannot drop in** — React + F7 Router ≠ SvelteKit |
| Faster than guessing layout from demo alone | Port is manual; author confirms WhatsApp is React-only ([#14406](https://forum.framework7.io/t/ui-initiative-premium-framework7-templates-plugins/14406)) |
| Good reference for `Messages` bubble CSS if thread view needed later | Still need custom swipe + Respondr-specific screens |
| | Template frozen May 2023 — may not match 2025 native WA |

**Effort:** 15–25 person-days (purchase review 1–2d + port chat list/settings 5–8d + SvelteKit integration 4–6d + swipe/search 3–5d + polish 2–4d).

**When worth it:** Team wants pixel-level reference and licensed assets; still implements on Konsta/SvelteKit.

### (C) Migrate to Framework7 + React

**What:** Replace `web/` with F7 CLI React project; rewire auth, API client, PWA; optionally reuse purchased template directly.

| Pros | Cons |
|------|------|
| Template runs **natively** — full Swipeout, Messages, stack nav | **Discards entire SvelteKit frontend** — routes, layouts, Better Auth patterns |
| Best demo fidelity out of the box | Loses SvelteKit `+page` data loading, static adapter integration as-is |
| F7 PWA/service worker built-in ([F7 app docs](https://framework7.io/docs/app)) | Hono API stays separate; auth becomes client-heavy |
| | Two languages in repo (React frontend + Node backend) if team prefers Svelte |
| | Official F7+SvelteKit path does not exist — would be React, not Svelte |

**Effort:** 30–50 person-days (scaffold 2–3d + auth/API 5–8d + port all Respondr screens 10–15d + settings sub-routes 5–8d + PWA/deploy 3–5d + QA 5–10d).

**Verdict:** Only if product pivots to a **full in-app messaging client**. Out of scope for a reminder dashboard.

### Decision matrix

| Criterion | (A) Konsta reskin | (B) Buy + port | (C) F7 + React |
|-----------|-------------------|----------------|----------------|
| Keeps SvelteKit + Hono split | ✅ | ✅ | ❌ |
| Chat list WA look | ✅ | ✅ | ✅ |
| Message thread | Custom/defer | Port CSS | ✅ native |
| Swipe Done/Ignore | Custom | Custom | ✅ Swipeout |
| Time to ship | **Shortest** | Medium | Longest |
| Maintenance | Lowest | Medium | High (second UI stack) |

---

## 6. Konsta coverage vs demo gaps

| Demo pattern | Konsta / Tailwind | Gap |
|--------------|-------------------|-----|
| Bottom tab bar | ✅ `Tabbar`, `TabbarLink` ([docs](https://konstaui.com/svelte/tabbar)) | Customize `colors`, icons |
| Large transparent navbar | ✅ `Navbar large transparent` ([docs](https://konstaui.com/svelte/navbar)) | Wire `scrollEl` for collapse |
| Chat-style rows | ✅ `List` + `ListItem` media/subtitle/after ([docs](https://konstaui.com/svelte/list)) | Drop `inset`; use plain `List` on gray bg |
| Search | ✅ `Searchbar` in navbar subnavbar | Add to `/chats` |
| Unread badge | ✅ `Badge` with custom `colors` | Green pill `#25D366` |
| Settings grouped lists | ✅ `List strong` + `ListItem link` | Add `SettingsRow` with icon circle |
| Swipe actions | ❌ Not in Konsta | **New `SwipeableRow.svelte`** |
| Message bubbles | ❌ Not in Konsta | Defer; F7 `Messages` ([docs](https://framework7.io/docs/messages.html)) as reference |
| Stack swipe-back | ⚠️ SvelteKit `goto` | Optional View Transitions API |
| Status / Calls / Camera | N/A | Do not implement |

**Conclusion:** ~80–90% visual match on list/settings/chrome without Framework7. Remaining fidelity is swipe physics and optional thread view.

---

## 7. Component mapping (demo → Respondr)

| Demo (F7 + React) | Respondr (Konsta + Svelte) | Notes |
|-------------------|----------------------------|-------|
| F7 `Tabbar` 4-tab | `Tabbar` 3-tab in `+layout.svelte` | Home / Chats / Settings icons |
| F7 `Navbar` large | `Navbar large` | Chats, Settings, Home |
| F7 `Searchbar` | Konsta `Searchbar` | Filter chat list by name |
| F7 `List` + `ListItem` swipeout | `List` + `ChatListItem` in `SwipeableRow` | Done / Ignore actions |
| F7 `Badge` | Konsta `Badge` | “Reply” unread pill |
| F7 `Messages` | — (defer) | Not needed for v1 |
| Settings profile block | `SettingsProfileHeader.svelte` | User + “Reminder engine” subtitle |
| Settings icon rows | `SettingsRow.svelte` | Colored circles from demo palette |
| F7 `Popup` (Contacts) | — | No “new chat” in Respondr |
| Connection status | `ConnectionBanner.svelte` | WA link state on Home |
| PWA install prompt | `InstallBanner.svelte` (existing) | Restyle to WA green |

---

## 8. Screen-by-screen redesign

Current routes: `/`, `/chats`, `/settings/*`, `/login`, `/setup`, `/qr`.

### `/chats` — highest priority

- Full-bleed list on `#EFEFF4` / dark `#111B21`
- Row: 48px avatar, bold title, gray preview (`hoursSince`, last direction), timestamp in `after`
- Badge: green pill for `needsReply`; muted check for `done`
- Swipe: Done (green) / Ignore (gray) replacing inline footer buttons
- Ignored section: “Archived”-style collapsed group at bottom
- Navbar: large “Chats”; right: refresh icon (not compose)

### `/` — Updates (Home reskin)

- Borrow Status page **header style** without story rings
- Connection card (WA linked/disconnected)
- Summary metrics (urgent count, snoozed, next scan)
- Recent reminders as compact list
- Keep “Run scan now” — styled as list footer action

### `/settings` and sub-routes

- Profile header + grouped icon rows (see demo colors §3)
- Map: Core → Account; Notifications; Link/QR → Chats group; History/Logs → Data
- Sub-pages keep `Navbar` + `backLink`; inset lists OK inside detail pages

### `/login`, `/setup`, `/qr`

- Minimal splash: green accent, centered Respondr branding (not Meta trademarks)
- QR: “Link a Device” pattern without WA logo

---

## 9. File change plan (`web/src/`)

### New files

| Path | Purpose |
|------|---------|
| `lib/theme/tokens.css` | CSS custom properties (optional split from `app.css`) |
| `lib/theme/icons.ts` | Tab/settings icon name constants |
| `lib/components/WaTabbar.svelte` | Wrapped `Tabbar` with WA colors + icons |
| `lib/components/WaNavbar.svelte` | Large/transparent defaults |
| `lib/components/ChatListItem.svelte` | Avatar, preview, badge, timestamp |
| `lib/components/SwipeableRow.svelte` | Horizontal swipe revealing actions |
| `lib/components/SettingsProfileHeader.svelte` | Settings top profile block |
| `lib/components/SettingsRow.svelte` | Colored icon circle + chevron |
| `lib/components/ConnectionBanner.svelte` | WA disconnected CTA |
| `lib/components/StatusCard.svelte` | Home/Updates metric cards |

### Modified files

| Path | Changes |
|------|---------|
| `app.css` | Add `@theme` WA tokens; page background utilities; dark variants |
| `app.html` | `theme-color` → `#075E54` or `#25D366` |
| `routes/+layout.svelte` | Use `WaTabbar`; WA page bg; tab icons (`house`/`bubble_left_bubble_right`/`gear`); active green state |
| `routes/+page.svelte` | Updates layout; remove indigo stat cards; `ConnectionBanner`, `StatusCard` |
| `routes/chats/+page.svelte` | Full-bleed list; `ChatListItem` + swipe; optional `Searchbar`; remove inline Done/Ignore buttons |
| `routes/settings/+page.svelte` | Profile header; `SettingsRow` groups |
| `routes/settings/core/+page.svelte` | WA grouped list styling |
| `routes/settings/notifications/+page.svelte` | Same chrome |
| `routes/settings/link/+page.svelte` | Same chrome |
| `routes/settings/history/+page.svelte` | Same chrome |
| `routes/login/+page.svelte` | WA splash styling |
| `routes/setup/+page.svelte` | Match login chrome |
| `routes/qr/+page.svelte` | Link-a-device layout |
| `lib/components/InstallBanner.svelte` | Green accent, bottom offset above tab bar |
| `lib/status.ts` | Optional: map status colors to WA palette |

### Config outside `web/src/` (related)

| Path | Changes |
|------|---------|
| `web/vite.config.ts` | PWA `theme_color`, `background_color` |
| `web/static/manifest.webmanifest` | Align theme colors if duplicated |
| `web/package.json` | Optional: `framework7-icons` for SF Symbol–like icons used by Konsta examples |

### Unchanged

- `lib/api.ts`, `lib/auth-client.ts` — no UI changes
- Backend Hono routes — no changes

---

## 10. Implementation phases and effort

| Phase | Work | Days |
|-------|------|------|
| 0 — Tokens | `@theme`, PWA colors, dark variables | 0.5–1 |
| 1 — Shell | `WaTabbar`, `WaNavbar`, layout bg, safe areas | 1–2 |
| 2 — Chat list | `ChatListItem`, full-bleed list, search | 2–4 |
| 3 — Swipe | `SwipeableRow` Done/Ignore | 2–4 |
| 4 — Settings + Home | Profile header, `SettingsRow`, Updates tab | 2–3 |
| 5 — Auth + QR polish | Login/setup/qr restyle | 1–2 |
| 6 — Dark mode + PWA | Test all routes; `InstallBanner` | 2–3 |
| **Total (A)** | | **10–15** |
| **Buy + port (B)** | Above + template port overhead | **15–25** |
| **F7 + React (C)** | Full frontend rewrite | **30–50** |

---

## 11. What to keep vs omit

### Keep (domain-critical)

- Done / Ignore / Unignore semantics
- QR linking (`/qr`, `/settings/link`) — clearly “link WhatsApp Web”, not in-app messaging
- Notifications (NTFY, Gotify, Web Push) — see [ios-pwa-constraints-respondr.md](./ios-pwa-constraints-respondr.md)
- Core settings, history, logs, manual scan
- Better Auth flow
- Install banner + PWA offline scope per [offline-pwa-respondr.md](./offline-pwa-respondr.md)

### Omit from demo

- Status stories, Calls, New Call, Camera, Contact Info thread, message composer
- “Compose new chat” — Respondr doesn’t initiate conversations
- PWA title “WhatsApp” — keep **Respondr** branding

### Legal / branding

Use **WhatsApp-like** styling without Meta logos or trademarked assets. Product name stays **Respondr**; subtitle may say “WhatsApp reminders.”

---

## 12. PWA / mobile notes

| Topic | Impact | Source |
|-------|--------|--------|
| `theme_color` | Green for OS status bar | [web.dev manifest](https://web.dev/learn/pwa/web-app-manifest) |
| `viewport-fit=cover` | Already in `app.html` | Respondr codebase |
| Safe areas | Tab bar `safe-areas`; `body` bottom padding | `+layout.svelte` |
| iOS install | No `beforeinstallprompt`; keep Safari instructions | [ios-pwa-constraints-respondr.md](./ios-pwa-constraints-respondr.md) |
| Fixed tab bar | Adjust `padding-bottom` if tab height changes | Current layout |
| Touch targets | ~72px list rows for swipe | Demo list CSS |

---

## 13. Risk register

| Risk | Mitigation |
|------|------------|
| Users think Respondr *is* WhatsApp | Clear branding; no WA logo |
| Konsta lacks Swipeout | `SwipeableRow` or visible button fallback |
| Template purchase sunk cost | Buy only for reference; port selectively |
| F7 migration scope creep | Reject approach C unless product pivots |
| Demo dated May 2023 | Use for layout; spot-check current iOS WA |
| Trademark | “WhatsApp-like” chrome only |

---

## 14. Primary source URL index

| Topic | URL |
|-------|-----|
| Live demo | https://whatsapp-f7-react.uiinitiative.com/ |
| UI Initiative catalog | https://uiinitiative.com/catalog/whatsapp-f7-react |
| UI Initiative pricing | https://uiinitiative.com/ |
| Framework7 templates | https://framework7.io/templates/ |
| UI Initiative forum announcement | https://forum.framework7.io/t/ui-initiative-premium-framework7-templates-plugins/14406 |
| Framework7 color themes | https://framework7.io/docs/color-themes.html |
| Framework7 Swipeout | https://framework7.io/docs/swipeout.html |
| Framework7 Messages | https://framework7.io/docs/messages.html |
| F7 + SvelteKit wontfix | https://github.com/framework7io/framework7/issues/3928 |
| Konsta Colors | https://konstaui.com/svelte/colors |
| Konsta Tabbar | https://konstaui.com/svelte/tabbar |
| Konsta Navbar | https://konstaui.com/svelte/navbar |
| Konsta List | https://konstaui.com/svelte/list |
| WhatsApp brand green | https://www.color-name.com/whatsapp-green.color |
| WhatsApp dark palette (secondary) | https://www.wwebcustomizer.com/blog/how-to-get-dark-mode-on-whatsapp-web-beyond-the-default |
| Prior F7/Konsta research | [framework7-konsta-svelte-rebuild.md](./framework7-konsta-svelte-rebuild.md) |
| Respondr iOS PWA | [ios-pwa-constraints-respondr.md](./ios-pwa-constraints-respondr.md) |
| Respondr offline PWA | [offline-pwa-respondr.md](./offline-pwa-respondr.md) |

---

## Appendix: Current Respondr UI baseline

The `web/` app uses **Konsta 5.3**, **Tailwind 4**, **SvelteKit 2**, **Svelte 5** with a 3-tab layout (`+layout.svelte`: Home / Chats / Settings), `KonstaProvider theme="ios"`, and generic styling (indigo stat cards, `List strong inset`, inline Done/Ignore buttons). The redesign is **visual/IA alignment**, not a greenfield frontend.
