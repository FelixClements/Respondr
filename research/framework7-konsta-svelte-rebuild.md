# Framework7 + Konsta UI + Svelte — Research for a full website rebuild

**Date:** 2026-08-18  
**Scope:** Evaluate Framework7 and Konsta UI for rebuilding Respondr’s frontend with Svelte, including routing, PWA/mobile, theming, and migration from a typical SvelteKit app.

---

## Executive summary

| Stack | Best for | Avoid when |
|-------|----------|------------|
| **SvelteKit + Konsta UI** | Full website rebuild with SSR/SSG, file-based routing, API routes, PWA, and mobile-native UI | You need Framework7’s stack router, master-detail tablet layouts, or 100% of F7 widgets out of the box |
| **Vite + Svelte 5 + Framework7-Svelte** | Hybrid mobile app with native-like navigation, F7 router, Cordova/Capacitor shell | You need SvelteKit SSR, `+page.server.ts` loads, or standard web routing |
| **Framework7-Svelte + Konsta UI** | F7 app shell (router, views, panels) with Tailwind-styled inner UI | You are on SvelteKit, or you want a single component system |

**Primary recommendation for Respondr:** Start with **SvelteKit + Konsta UI v5 + Tailwind v4**, keep the existing Hono API as the backend, and add PWA via `@vite-pwa/sveltekit` or SvelteKit’s service-worker story. Only choose Framework7 if native-like stack navigation and F7-specific widgets are hard requirements that outweigh SvelteKit’s routing and data-loading model.

Both libraries share the same author ([Vladimir Kharlampidi / nolimits4web](https://github.com/nolimits4web)). Konsta is the portable UI layer; Framework7 is the full mobile application framework.

---

## 1. Framework7 Svelte support

### Official package and docs

- **NPM package:** [`framework7-svelte`](https://www.npmjs.com/package/framework7-svelte) (companion to [`framework7`](https://www.npmjs.com/package/framework7))
- **Documentation:** [Framework7 Svelte docs](https://framework7.io/svelte/introduction)
- **Installation:** [framework7.io/svelte/installation](https://framework7.io/svelte/installation)
- **Package structure:** [framework7.io/svelte/package](https://framework7.io/svelte/package)

### Current versions (npm, 2026-08-18)

| Package | Version |
|---------|---------|
| `framework7` | 9.1.2 |
| `framework7-svelte` | 9.1.2 |

Releases are active (9.1.2 published 2026-07-28). GitHub repo [`framework7io/framework7`](https://github.com/framework7io/framework7) has ~18.7k stars and recent commits.

### Maturity

Framework7 Svelte is a **first-party, production-oriented integration**, not a community fork:

- Svelte components mirror almost all Framework7 Core widgets ([introduction](https://framework7.io/svelte/introduction)).
- Framework7 Svelte plugin wires Framework7 Router into Svelte’s component model.
- TypeScript definitions ship for Svelte components (added in v9 per [release notes](https://cdn.framework7.io/release-notes/)).
- v9 moved `framework7-svelte` to pure ESM with `.svelte` components only.

Recommended bootstrap path is **Framework7 CLI** ([framework7.io/cli](https://framework7.io/cli)), which scaffolds Framework7-Svelte with Web / PWA / Cordova targets, starter templates (single view, tabs, split view), icons, and splash screens.

### Svelte 5 compatibility

**Yes — requires Framework7 v9+ and Svelte 5.**

Official installation page states:

> Framework7 v9 and Svelte 5: Framework7 Svelte has been updated to support the latest Svelte v5 API with its new reactivity system and runes. Make sure to use Svelte 5 or later for full compatibility with Framework7 v9.

Source: [framework7.io/svelte/installation](https://framework7.io/svelte/installation)

v9.0.0 release notes ([cdn.framework7.io/release-notes](https://cdn.framework7.io/release-notes/)) list “Updated to latest Svelte v5 API” under Svelte changes.

---

## 2. Konsta UI

### What it is

Konsta UI is a **mobile UI component library** built on **Tailwind CSS**, providing iOS and Material Design components for React, Vue, and Svelte.

- **Homepage:** [konstaui.com](https://konstaui.com/)
- **Svelte docs:** [konstaui.com/svelte](https://konstaui.com/svelte)
- **GitHub:** [konstaui/konsta](https://github.com/konstaui/konsta) (~4.2k stars, active through 2026-07)

Current release: **v5.3.0** (2026-07-28) per [release notes](https://konstaui.com/release-notes).

### Relationship to Framework7

Same author as Framework7. Konsta is explicitly positioned as a **UI layer** that pairs with “parent” frameworks:

> Konsta UI mostly designed to be used with "parent" frameworks like Ionic or Framework7. In this case you use "parent" framework as your app shell (routing, navigation, state management, native APIs, etc.) and Konsta UI components for inner pages/views UIs.

Source: [konstaui.com](https://konstaui.com/)

Community maintainer explanation ([GitHub Discussion #107](https://github.com/konstaui/konsta/discussions/107)):

- **Konsta** = portable UI components (use anywhere).
- **Framework7** = full app framework (router, views, device APIs, transitions) comparable to Ionic / Expo in scope.

### Svelte support

Official since Konsta v0.8.0 (2022-04-15). Import from `konsta/svelte`:

```svelte
import { App, Page, Navbar, Block, Button } from 'konsta/svelte';
```

Docs: [konstaui.com/svelte/installation](https://konstaui.com/svelte/installation), [konstaui.com/svelte/usage](https://konstaui.com/svelte/usage)

**Requirements for Konsta v5:**

- Svelte project + **Tailwind CSS v4** (`@theme` configuration)
- Import theme: `@import 'konsta/svelte/theme.css';` in main CSS ([installation](https://konstaui.com/svelte/installation))

### Svelte 5 compatibility

**Yes — Konsta UI v5+ targets Svelte 5 Runes API.**

v5.0.0 release ([konstaui.com/release-notes](https://konstaui.com/release-notes)):

- All Svelte components updated to Svelte v5 Runes API
- Slots replaced by `{#snippet ...}` for child content
- Svelte 5 TypeScript support landed in v4.0.0 ([issue #207](https://github.com/konstaui/konsta/issues/207), commit [b01a8ed](https://github.com/konstaui/konsta/commit/b01a8ed681e013837126e9d5428fc9cc3ee58868))

Konsta works in **SvelteKit** projects (SvelteKit import fixes noted in v0.8.1 changelog). There is no official “Konsta + SvelteKit template,” but the component library is framework-agnostic beyond Tailwind setup.

---

## 3. Using Framework7 + Konsta UI together on Svelte

### Can they be combined?

**Yes**, for **Vite + Svelte + Framework7-Svelte** (not SvelteKit + Framework7).

Official Konsta pattern ([usage](https://konstaui.com/svelte/usage), [KonstaProvider](https://konstaui.com/svelte/konsta-provider)):

```svelte
<script>
  import { App, View, Page, Navbar } from 'framework7-svelte';
  import { KonstaProvider, Block, Button } from 'konsta/svelte';
</script>

<KonstaProvider theme="parent">
  <App theme="ios" class="k-ios">
    <View>
      <Page>
        <Navbar title="My App" />
        <Block><Button>Action</Button></Block>
      </Page>
    </View>
  </App>
</KonstaProvider>
```

Key integration rules:

1. Use **`KonstaProvider`** instead of Konsta’s `App` when Framework7 owns the shell.
2. Add **`k-ios`** or **`k-material`** on the F7 root element.
3. Set `KonstaProvider theme="parent"` to inherit F7’s `ios` / `md` classes ([KonstaProvider props](https://konstaui.com/svelte/konsta-provider)).

### Recommended architecture (F7 + Konsta path)

```
┌─────────────────────────────────────────┐
│  Capacitor / Cordova (optional shell)   │
├─────────────────────────────────────────┤
│  Framework7 Core + F7 Router            │
│  framework7-svelte: App, View, Page,    │
│  Navbar, Panel, Tabbar, routable modals   │
├─────────────────────────────────────────┤
│  KonstaProvider + konsta/svelte         │
│  (Block, Button, List, Dialog, etc.)    │
├─────────────────────────────────────────┤
│  Your domain logic / API client         │
└─────────────────────────────────────────┘
```

- **F7 owns:** routing, page transitions, master-detail, panels, swipe-back, device/statusbar, service worker registration API.
- **Konsta owns:** page content widgets, Tailwind styling, design tokens.

### Anti-pattern

**Do not combine Framework7 with SvelteKit.** See routing section below. Konsta alone pairs with SvelteKit; Framework7 does not.

---

## 4. Routing: Framework7 Router vs SvelteKit vs standalone Svelte

### Framework7 Router

Rich, mobile-first router integrated with Views and animated transitions.

- **Docs:** [framework7.io/docs/routes.html](https://framework7.io/docs/routes.html)
- **View / browser history:** [framework7.io/docs/view.html](https://framework7.io/docs/view.html)

Capabilities include:

- Route tables with `path`, `name`, `async`, `asyncComponent`, `component`, `componentUrl`
- Dynamic params (`/user/:userId/`)
- Master/detail routes, routable tabs, modals, panels
- `beforeEnter` / `beforeLeave` guards
- `keepAlive` routes
- `browserHistory` for hash-based web URLs (not file-based SvelteKit routes)

For Svelte, routes typically use `asyncComponent: () => import('./pages/Foo.svelte')` per F7 router docs.

F7 Svelte explicitly integrates this router ([introduction](https://framework7.io/svelte/introduction)): “Framework7 Svelte plugin provides… components with integration of Framework7 Router to render pages in the ‘Svelte-way’.”

### SvelteKit

File-based routing (`src/routes/`), layouts, `+page.ts` / `+page.server.ts` loads, SSR/SSG, adapters.

**Official Framework7 position: SvelteKit is not supported.**

- Maintainer closed SSR issue as `wontfix`: [framework7io/framework7#3928](https://github.com/framework7io/framework7/issues/3928) — “Supporting Svelte Kit is not in near future on a roadmap”
- Open feature request for a SvelteKit template remains unanswered in substance: [framework7io/framework7#3984](https://github.com/framework7io/framework7/issues/3984)
- Community reports routing limitations motivating migration **from F7 to SvelteKit+Konsta**: [konstaui/konsta#107](https://github.com/konstaui/konsta/discussions/107)

Technical blockers for F7 + SvelteKit SSR include ESM directory imports and Svelte components using browser-only patterns during SSR (same #3928 thread).

### Standalone Svelte (Vite, no Kit)

Works with Framework7-Svelte using F7’s router. This is the **supported** non-Kit path. Bootstrap via Framework7 CLI or manual Vite + Svelte 5 setup per [installation](https://framework7.io/svelte/installation).

### Routing decision matrix

| Need | Choose |
|------|--------|
| SSR, SEO, `+server` API routes, standard web deploy | **SvelteKit + Konsta** |
| iOS/Android stack navigation, swipe-back, tablet master-detail | **Framework7-Svelte** (± Konsta) |
| Simple SPA, client-only, minimal deps | **Vite + Svelte + Konsta** (bring your own router, e.g. `svelte-spa-router`) |
| Both SvelteKit data loading and F7 router | **Not officially viable** — pick one routing model |

---

## 5. PWA and mobile app capabilities

### Framework7

**PWA**

- CLI can scaffold **Web app, PWA, or Cordova** targets ([framework7.io/cli](https://framework7.io/cli)).
- Built-in **service worker module** on app init ([framework7.io/docs/app](https://framework7.io/docs/app)):

```js
const app = new Framework7({
  serviceWorker: {
    path: './service-worker.js',
    scope: '/',
  },
});
```

- Methods: `app.serviceWorker.register()`, events `serviceWorkerRegisterSuccess`, etc.
- Manifest and service worker files are often **added manually**; forum reports they are not always generated by CLI ([forum thread](https://forum.framework7.io/t/manifest-and-serviceworker-for-pwa/11644)).

**Capacitor / Cordova**

- CLI officially documents **Cordova** install ([framework7.io/cli/installation](https://framework7.io/cli/installation)).
- **Capacitor** is not a first-class CLI target, but community reports F7 browser build + `npx cap init/sync` works ([forum](https://forum.framework7.io/t/how-to-use-framework7-with-capacitorjs/11429)).
- Status bar, safe areas: F7 statusbar wrapper requires Cordova/Capacitor + `cordova-plugin-statusbar` ([framework7.io/docs/statusbar.html](https://framework7.io/docs/statusbar.html)).

### Konsta UI

Konsta docs **do not cover** Cordova/Capacitor packaging; they defer to those platforms:

> Current documentation doesn't cover the process of compilation of Konsta UI app to Cordova or Capacitor app… refer to their official documentations.

Source: [konstaui.com/svelte](https://konstaui.com/svelte)

Konsta homepage states hybrid apps are supported **via Capacitor/Cordova** as the shell ([konstaui.com](https://konstaui.com/)).

**Practical approach for Konsta + SvelteKit PWA:**

- Use SvelteKit + `@vite-pwa/sveltekit` or custom service worker
- Align with existing Respondr PWA research: [offline-pwa-respondr.md](./offline-pwa-respondr.md), [ios-pwa-constraints-respondr.md](./ios-pwa-constraints-respondr.md)

### Respondr-specific note

Respondr’s backend (Hono, WhatsApp Web, SQLite) stays server-side. PWA offline scope remains “read-and-queue,” not full reminder generation offline — independent of UI framework choice.

---

## 6. Theming: iOS and Material Design

### Framework7

- Dual themes: **iOS** (`.ios`) and **Material** (`.md`) with theme-based rendering helpers (`if-ios`, `if-md`, etc.) — [theme-based rendering](https://framework7.io/docs/theme-based-rendering.html)
- Color system with iOS- and MD-specific CSS variables — [color themes](https://framework7.io/docs/color-themes.html)
- **Dark mode** via `dark` class; `app.setDarkMode()`, `app.setColorTheme()`
- **Material You** in v9: `mdColorScheme: 'vibrant' | 'monochrome' | 'default'`
- Icons: `framework7-icons`, Material Icons

### Konsta UI

- Themes: **`ios`** and **`material`** (KonstaProvider `theme` prop)
- Root classes: **`k-ios`**, **`k-material`**
- v5: iOS 26 + Material Design 2025 refresh ([release notes](https://konstaui.com/release-notes))
- Material: global touch ripple via `touchRipple` on KonstaProvider
- iOS: system font; Material: Roboto (load via Google Fonts) — [installation](https://konstaui.com/svelte/installation)
- Styling via **Tailwind v4** utilities and Konsta theme CSS
- `theme="parent"` syncs with F7/Ionic platform classes

### Using both

When combining F7 + Konsta, keep **F7 `theme` prop** and **Konsta `k-*` class** aligned (`ios` ↔ `k-ios`, Material ↔ `k-material`), and prefer `theme="parent"` on KonstaProvider.

---

## 7. Migration from a typical SvelteKit app

### If staying on SvelteKit (recommended default)

| SvelteKit concept | Konsta equivalent |
|-------------------|-------------------|
| `src/routes/**` | Keep — Konsta is UI only |
| `+layout.svelte` | Wrap with `<App>` or page chrome (`Page`, `Navbar`) |
| `+page.server.ts` / `load` | Unchanged |
| `+server.ts` API routes | Unchanged (or keep separate Hono API) |
| Form actions | Unchanged |
| Modals / dialogs | Konsta `Dialog`, `Sheet`, `Popup`; may need programmatic patterns (see [konsta#107 migration note](https://github.com/konstaui/konsta/discussions/107)) |
| Tailwind | Upgrade to v4 + Konsta theme import |

**Effort:** Mostly component replacement and layout restructure. Routing and data layer stay intact.

### If migrating to Framework7-Svelte

Expect a **larger rewrite**:

| SvelteKit feature | F7 migration impact |
|-------------------|-------------------|
| File-based routes | Rebuild as F7 `routes` array with `asyncComponent` imports |
| SSR / `+page.server.ts` | Drop or limit to build-time; F7 is client-first |
| `hooks.server.ts` auth | Move to client guards + API JWT/session checks |
| Layout groups | F7 Views, Tabbar, Split View patterns |
| `goto()` | `f7.views.main.router.navigate()` |
| SEO | Poor fit; F7 targets app-like experiences |

Real-world report: developer moved **Svelte+Framework7 → SvelteKit+Konsta** due to F7 routing limitations ([konsta#107](https://github.com/konstaui/konsta/discussions/107)).

### Respondr today

The repo is currently **Node/Hono backend only** (no Svelte frontend in `package.json`). This is a greenfield frontend choice rather than a SvelteKit migration — but if the product direction includes SSR, installable PWA, and conventional web routing, **SvelteKit + Konsta** is the lower-risk path.

---

## 8. Known limitations, gotchas, and community activity

### Framework7

| Issue | Detail | Source |
|-------|--------|--------|
| **No SvelteKit** | Maintainer `wontfix` on SSR | [#3928](https://github.com/framework7io/framework7/issues/3928) |
| **No SvelteKit template** | Open request since 2022 | [#3984](https://github.com/framework7io/framework7/issues/3984) |
| **Opinionated router** | Hard to swap for SvelteKit or custom routers | [konsta#107](https://github.com/konstaui/konsta/discussions/107) |
| **PWA scaffolding** | Manifest/SW may need manual setup | [Forum](https://forum.framework7.io/t/manifest-and-serviceworker-for-pwa/11644) |
| **Capacitor** | Community-driven, not CLI-first | [Forum](https://forum.framework7.io/t/how-to-use-framework7-with-capacitorjs/11429) |
| **TypeScript** | Improved in v9; some CLI/template friction reported | [Forum](https://forum.framework7.io/t/svelte-typescript-support/16378) |
| **Swiper** | F7 v8+ removed Swiper React/Vue/Svelte wrappers — use Swiper Element | [Release notes](https://cdn.framework7.io/release-notes/) |

**Community:** Large (18k+ stars), [forum.framework7.io](https://forum.framework7.io/), active releases. Svelte is a supported but smaller slice vs Vue/React.

### Konsta UI

| Issue | Detail | Source |
|-------|--------|--------|
| **Fewer widgets than F7** | No full parity with Framework7 component set | [#3984 comment](https://github.com/framework7io/framework7/issues/3984), [#107](https://github.com/konstaui/konsta/discussions/107) |
| **No F7 + SvelteKit combo** | F7 breaks Kit; Konsta alone works | [#192](https://github.com/konstaui/konsta/discussions/192) |
| **Tailwind coupling** | v5 requires Tailwind v4 — plan CSS migration | [Release notes](https://konstaui.com/release-notes) |
| **Svelte 5 snippets** | v5 breaking change: slots → `{#snippet}` | [Release notes](https://konstaui.com/release-notes) |
| **Capacitor docs** | Not covered in Konsta docs | [konstaui.com/svelte](https://konstaui.com/svelte) |

**Community:** Smaller (4k stars) but same maintainer, frequent releases, GitHub discussions active.

### F7 + Konsta + SvelteKit

Explicitly **not recommended** — [konsta#192](https://github.com/konstaui/konsta/discussions/192): combining all three is broken/undefined; pick SvelteKit+Konsta **or** F7+Konsta.

---

## 9. Package names and install commands

### Framework7 + Svelte (manual)

```bash
# Core + Svelte bindings
npm install framework7 framework7-svelte

# Recommended: global CLI for scaffolding
npm install -g framework7-cli
# or: npx framework7-cli create

# Common additions
npm install framework7-icons
# Material icons (per CLI postinstall patterns)
```

Docs: [framework7.io/svelte/installation](https://framework7.io/svelte/installation), [framework7.io/cli/installation](https://framework7.io/cli/installation)

**Vite init snippet** ([package docs](https://framework7.io/svelte/package)):

```js
import Framework7 from 'framework7/lite';
import Framework7Svelte from 'framework7-svelte';

Framework7.use(Framework7Svelte);
```

```svelte
<script>
  import { App, View, Page, Navbar } from 'framework7-svelte';
</script>
```

### Konsta UI + Svelte

```bash
# Assumes Svelte + Tailwind v4 already configured
npm install konsta
```

In CSS:

```css
@import 'tailwindcss';
@import 'konsta/svelte/theme.css';
```

Docs: [konstaui.com/svelte/installation](https://konstaui.com/svelte/installation)

### SvelteKit + Konsta (recommended greenfield)

```bash
npm create svelte@latest my-app   # or: npx sv create
cd my-app
npm install konsta
# Add Tailwind v4 per SvelteKit + Tailwind docs, then Konsta theme import
```

Optional PWA:

```bash
npm install -D @vite-pwa/sveltekit
```

### Capacitor (either stack, after web build)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add ios
npx cap add android
# Point webDir to build output (e.g. build/ or dist/)
npx cap sync
```

Official Capacitor docs: [capacitorjs.com](https://capacitorjs.com/docs)

---

## 10. Is Konsta necessary if using Framework7?

**No.** Framework7 ships a complete component set and styling system. Konsta is optional.

| Use Framework7 alone when… | Add Konsta when… | Use Konsta alone (no F7) when… |
|----------------------------|------------------|--------------------------------|
| You want one cohesive F7 design system | You prefer **Tailwind** workflow | You use **SvelteKit** or custom routing |
| You need F7 router, panels, master-detail | You want MD 2025 / iOS 26 styling via Tailwind | You only need mobile UI primitives |
| You follow F7 CLI templates | You want lighter page-level components inside F7 shell | You are building a PWA/website, not an F7-style stack app |
| Minimal dependencies | Design team already standardized on Tailwind v4 | You do not need F7-specific widgets (e.g. Photo Browser, Swipeout list) |

**Component coverage:** Framework7 has **more** specialized mobile widgets. Konsta covers core patterns (lists, navbars, tabbars, dialogs, sheets, forms) but community notes gaps vs F7 ([#3984](https://github.com/framework7io/framework7/issues/3984)).

**Styling philosophy:**

- F7 = CSS variables + F7-specific classes (`.block`, `.list`, `.navbar`)
- Konsta = Tailwind utilities + `k-*` component classes

Mixing both on the same page is supported but adds **two styling systems** — use F7 for shell/navigation, Konsta for content, as documented.

---

## Actionable recommendations for Respondr rebuild

### 1. Choose the stack before picking components

**Default:** `SvelteKit 2 + Svelte 5 + Konsta UI 5 + Tailwind 4 + existing Hono API`

Rationale:

- Respondr benefits from PWA, auth, and API integration patterns SvelteKit handles well.
- Framework7’s SvelteKit incompatibility is official and longstanding.
- Existing PWA research in this repo assumes a service-worker-centric web app, not an F7 hash router.

**Choose Framework7-Svelte only if** product requirements include native-like stack navigation, F7-specific components, and a client-only SPA acceptable for all routes.

### 2. Proposed architecture (recommended)

```
Browser / installed PWA
  └── SvelteKit frontend (Konsta UI)
        ├── SSR/SSG for marketing or auth pages (if needed)
        ├── Client-heavy app shell for dashboard/chat
        ├── Service worker (vite-pwa or custom) per offline research
        └── Fetch → Hono API (existing backend)

Optional later: Capacitor wrapper around static adapter build
```

### 3. Proof-of-concept sequence

1. `npx sv create respondr-web` with Svelte 5 + TypeScript.
2. Add Tailwind v4 + `konsta` + theme CSS.
3. Build one authenticated screen (e.g. dashboard) with `Page`, `Navbar`, `List`, `Block`.
4. Wire to Hono API; validate session handling in `hooks.server.ts` or client fetch.
5. Add PWA manifest + service worker; test iOS Home Screen constraints per [ios-pwa-constraints-respondr.md](./ios-pwa-constraints-respondr.md).
6. **Only if** stack transitions feel insufficient, spike a **separate** F7-Svelte prototype (do not merge into Kit).

### 4. If evaluating Framework7 anyway

- Use Framework7 CLI with **Svelte + PWA or Cordova** target.
- Pin `framework7@^9.1` and `framework7-svelte@^9.1`.
- Plan **Vite SPA**, not SvelteKit.
- Budget time for manual PWA manifest/service worker.
- Trial **KonstaProvider** only if Tailwind is a firm requirement.

### 5. Risk register

| Risk | Mitigation |
|------|------------|
| F7 + SvelteKit temptation | Treat as out of scope unless maintainer ships official support |
| Konsta missing a widget | Custom Tailwind component or headless primitive; check F7 widget list early |
| Tailwind v4 migration | Lock versions in POC; follow Konsta v5 install guide |
| iOS PWA limits | Already documented; do not depend on Background Sync |
| Two UI systems (F7+Konsta) | Avoid unless there is a clear Tailwind mandate |

---

## Primary source index

| Topic | URL |
|-------|-----|
| Framework7 Svelte introduction | https://framework7.io/svelte/introduction |
| Framework7 Svelte installation (Svelte 5) | https://framework7.io/svelte/installation |
| Framework7 Svelte package | https://framework7.io/svelte/package |
| Framework7 CLI | https://framework7.io/cli |
| Framework7 routes | https://framework7.io/docs/routes.html |
| Framework7 views / browser history | https://framework7.io/docs/view.html |
| Framework7 app / service worker API | https://framework7.io/docs/app |
| Framework7 color themes | https://framework7.io/docs/color-themes.html |
| Framework7 statusbar (Capacitor) | https://framework7.io/docs/statusbar.html |
| Framework7 release notes | https://cdn.framework7.io/release-notes/ |
| Konsta UI homepage | https://konstaui.com/ |
| Konsta Svelte docs | https://konstaui.com/svelte |
| Konsta Svelte installation | https://konstaui.com/svelte/installation |
| Konsta Svelte usage / F7 integration | https://konstaui.com/svelte/usage |
| Konsta KonstaProvider | https://konstaui.com/svelte/konsta-provider |
| Konsta release notes | https://konstaui.com/release-notes |
| F7 SvelteKit wontfix | https://github.com/framework7io/framework7/issues/3928 |
| F7 SvelteKit template request | https://github.com/framework7io/framework7/issues/3984 |
| F7 vs Konsta discussion | https://github.com/konstaui/konsta/discussions/107 |
| SvelteKit + F7 + Konsta (don't) | https://github.com/konstaui/konsta/discussions/192 |
| Konsta Svelte 5 types issue | https://github.com/konstaui/konsta/issues/207 |
