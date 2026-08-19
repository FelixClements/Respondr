# Native Android UI direction for Respondr PWA

**Date:** 2026-08-19  
**Stack:** SvelteKit 2 + Konsta UI 5.3 + Tailwind 4 + `@vite-pwa/sveltekit`  
**Scope:** Move from “WhatsApp-green skin on Konsta Material” to a UI that reads as **native Android / Material Design 3** while remaining a reminder dashboard (not a messenger clone).

---

## Executive summary

**Recommended direction:** Adopt **Material Design 3 (MD3) surface-first chrome** with **Respondr teal as the primary seed**, using Konsta’s built-in MD role tokens (`bg-md-light-surface`, `text-md-light-on-surface`, etc.) instead of hardcoded WhatsApp hex values. Keep bottom **Navigation bar** (Konsta `Tabbar`), switch to a **neutral top app bar** (surface + on-surface text), reserve green for **primary CTAs and badges only**, enable Konsta **touch ripples**, load **Roboto**, and align PWA `theme_color` / `background_color` with **surface** roles—not the legacy `#075E54` header.

This is the direction **WhatsApp itself is taking on Android**: Meta’s 2024–2025 redesign removes the iconic green top bar, adds a bottom navigation bar, increases neutral surfaces, and aligns with MD3 ([Meta Design blog](https://www.meta.com/design-at-meta/blog/whatsapp-user-interface-update/); [Gadgets 360 beta report](https://www.gadgets360.com/apps/news/whatsapp-new-interface-colours-rolling-out-latest-android-beta-4476784)). Respondr should borrow **WhatsApp’s information density for chat rows**, not its **2016-era green toolbar**.

| Approach | Native Android feel | Brand fit | Effort |
|----------|--------------------|-----------|--------|
| **A. MD3-native (recommended)** — Konsta defaults + `--color-brand-primary` seed + remove `wa*` color overrides | High | Strong (teal primary, selective green accents) | **5–8 person-days** |
| **B. WhatsApp clone (current)** — `#075E54` navbar, WA dark hex grid, custom tab colors | Low (reads as themed messenger) | High but misleading (not a chat app) | Already built; maintenance cost ongoing |
| **C. MD3 Expressive** — large flexible app bars, search app bar, edge-hugging FABs | Medium–high (needs custom layout work; M3 Expressive web impl. unavailable per [MD3 app bar docs](https://m3.material.io/components/top-app-bar/overview)) | Good for “Updates” hero | **+3–5 days** on top of A |
| **D. Material You dynamic color** — wallpaper-derived palette | Highest on Android 12+ native apps | Unpredictable in PWA | **Not practical** for Konsta PWA today |

**Use `k-md-vibrant` (default / no extra class)** — not `k-md-monochrome`. Vibrant matches MD3’s colorful on-container text and accent containers ([MD3 color update Aug 2024](https://m3.material.io/styles/color/system/overview)). Monochrome is for subdued utility apps; Respondr needs clear urgency signals (badges, “Need reply” stats).

---

## What “more native Android” means (concrete deltas from current UI)

Current implementation uses Konsta `theme="material"` but **overrides almost every MD default** via `waNavbarColors`, `waTabbarColors`, page-level `#075E54` / `#111b21` / `#25D366` classes, and PWA `theme_color: #075E54`. Native Android (MD3 + current WhatsApp Android beta) differs in these specific ways:

| # | Current (WhatsApp skin) | Native Android / MD3 target | Primary source |
|---|-------------------------|----------------------------|----------------|
| 1 | Green `#075E54` sticky navbar, white title | **Surface-toned top app bar** (`surface` / `surface-container`), **on-surface** title (16–22sp), optional scroll color fill—not brand-filled bar | [MD3 top app bar](https://m3.material.io/components/top-app-bar/overview) |
| 2 | `theme-color` and manifest `theme_color` = `#075E54` | Match **page background / surface** (light ~`#FFFBFE`, dark ~`#1C1B1F`) so status bar blends with app chrome | [MDN PWA colors](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors), [Chrome themed omnibox](https://developer.chrome.com/docs/lighthouse/pwa/themed-omnibox) |
| 3 | App background `#f0f2f5` (WA Web gray) | **`surface-container-lowest`** or **`surface`** neutral (MD tone-based surfaces, not messenger gray) | [MD3 color system](https://m3.material.io/styles/color/system/overview) |
| 4 | List rows `bg-white` / `dark:bg-[#111b21]` hardcoded | Konsta `List` on **`surface-container`** / default list colors; dividers via `dividers` prop (MD: full-bleed or inset per media) | [Konsta List](https://konstaui.com/svelte/list) |
| 5 | Tab bar active = green text + green tint pill (`#25D366/20`) | **Navigation bar**: inactive `on-surface-variant`, active **`secondary-container` pill** + **`on-secondary-container`** icon/label (Konsta defaults) | [Konsta Tabbar](https://konstaui.com/svelte/tabbar), [MD3 navigation bar](https://m3.material.io/components/navigation-bar/overview) |
| 6 | Filled green buttons via `!bg-[#25D366]` overrides | **`Button`** default fill = `primary` / `on-primary`; secondary actions **`tonal`** (`secondary-container`) | [Konsta Button](https://konstaui.com/svelte/button) |
| 7 | Custom filled SVG icons (`WaIcon`) | **Material Symbols** outlined (inactive) / filled (active) via Konsta `Icon` + `material` snippet | [MD3 navigation patterns](https://m3.material.io/components/navigation-drawer/accessibility) |
| 8 | Section headers uppercase green (`text-[#075E54] uppercase`) | **`title-small`** / **`label-large`** in `on-surface-variant`, sentence case | [MD3 typography](https://m3.material.io/styles/typography/overview) |
| 9 | Stats grid with WA divider color `#e9edef` | **Cards** or **`surface-container-high`** tiles with MD **outline-variant** separators | [MD3 surfaces](https://m3.material.io/blog/material-3-compose-1-2) |
| 10 | Settings rows: rainbow filled circle icons (iOS-style) | **Tonal icon containers** (`primary-container` / `secondary-container`) or single-hue MD list leading icons | [MD3 lists](https://m3.material.io/components/lists/overview) |
| 11 | Avatars: messenger-style | Keep avatars but use **MD shape** (Konsta list media: `material:rounded-full`) | [Konsta List examples](https://konstaui.com/svelte/list) |
| 12 | No scroll behavior on navbar | Optional **`medium`** navbar on dashboard; pinned bar gains **surface fill on scroll** (no shadow) | [MD3 app bar scroll](https://m3.material.io/components/top-app-bar/overview) |
| 13 | Ripples disabled/overridden by custom colors on some controls | Ensure **`materialTouchRipple={true}`** on `KonstaProvider` (default); avoid `!important` button overrides that block ripple | [Konsta App](https://konstaui.com/svelte/app) |
| 14 | Roboto listed in CSS but not loaded | **Preload Roboto** from Google Fonts (Konsta installation requirement) | [Konsta installation](https://konstaui.com/svelte/installation) |
| 15 | Product chrome says “WhatsApp clone” (green toolbar + WA tokens file) | Rename theme module to MD roles; green only on **link WhatsApp**, **badges**, **FAB**—not global chrome | [Meta WA UI update](https://www.meta.com/design-at-meta/blog/whatsapp-user-interface-update/) |

---

## Design tokens: MD3 color roles for Respondr

Konsta derives full light/dark palettes from a single `--color-brand-*` seed ([Konsta Colors](https://konstaui.com/svelte/colors)). Map **semantic roles** (MD3) to **Respondr usage**:

### Seed and generation

```css
/* web/src/app.css — replace WA brand block */
@theme {
  /* Seed: Respondr teal (between WA brand teal #128C7E and MD tertiary greens) */
  --color-brand-primary: #0d6e63;
  /* Optional semantic accents for k-color-* utilities */
  --color-brand-urgent: #ba1a1a;   /* error / need-reply */
  --color-brand-success: #1b873f;  /* done / connected — not full FAB green */
}
```

Generate exact tone values with [Material Theme Builder](https://m3.material.io/theme-builder) (export CSS or inspect roles). Below: **recommended role mapping** for Respondr (light / dark descriptions; exact hex from Theme Builder export).

| MD3 role | Respondr usage | Light intent | Dark intent |
|----------|----------------|--------------|-------------|
| **primary** | Main CTAs: “Run scan”, “Done”, link actions | Teal seed | Lighter teal |
| **on-primary** | Text/icons on primary buttons | White / near-white | Dark teal |
| **primary-container** | Selected chips, subtle brand highlights | Light teal container | Dark teal container |
| **on-primary-container** | Text on primary-container | Dark teal | Light teal |
| **secondary** | Less prominent accents | Desaturated teal/gray-green | Muted |
| **secondary-container** | **Active tab indicator**, tonal buttons | Soft green-gray pill | Elevated pill |
| **on-secondary-container** | Active tab icon/label | Dark | Light |
| **tertiary** | Stats accent, “Snoozed” | Contrast accent (amber/teal alt) | Tuned for dark |
| **surface** | Page background, navbar background | Neutral ~98% tone | ~6% tone |
| **on-surface** | Titles, row primary text | Near-black | Near-white |
| **on-surface-variant** | Subtitles, timestamps, section labels | Medium neutral | Muted neutral |
| **surface-container-lowest** | App shell behind content | Lightest | Darkest base |
| **surface-container** | Cards, grouped settings blocks | Slight lift | Slight lift |
| **surface-container-high** | Stats tiles, elevated panels | More separation | More separation |
| **outline-variant** | Dividers (replace `#e9edef`) | Low-contrast border | Low-contrast border |
| **error** / **on-error** | Disconnect states, destructive logout emphasis | MD error red | MD error red |

### Konsta token classes (use instead of hex)

Konsta exposes generated utilities such as:

- `bg-md-light-surface` / `dark:bg-md-dark-surface`
- `bg-md-light-surface-1` … `surface-2` (containers)
- `text-md-light-on-surface` / `text-md-light-on-surface-variant`
- `bg-md-light-primary` / `text-md-light-on-primary`
- `bg-md-light-secondary-container` / `text-md-light-on-secondary-container`

**Rule:** Pages and `Wa*` wrappers should prefer these tokens; only use `k-color-brand-urgent` etc. for domain-specific states.

### Typography (MD3 → Konsta)

| MD3 role | Size / weight | Respondr element |
|----------|---------------|------------------|
| **title-large** | 22sp, medium | Dashboard headline / medium navbar |
| **title-medium** | 16sp, medium | Navbar default title |
| **title-small** | 14sp, medium | Section headers (“Recent reminders”) |
| **body-large** | 16sp, regular | List subtitles |
| **body-medium** | 14sp, regular | Row secondary text |
| **label-large** | 14sp, medium | Tab labels |
| **label-medium** | 12sp, medium | Timestamps, stats captions |

Konsta Navbar defaults: `titleFontSizeMaterial: text-[22px]`, `fontSizeMaterial: text-[16px]` ([Navbar props](https://konstaui.com/svelte/navbar)).

### Shape

MD3 uses **extra-large** top app bar (0dp bottom corners), **full** list avatars, **large** (12dp) cards. Konsta Material list media already uses `rounded-full` for avatars.

---

## Component mapping: Konsta vs custom CSS

| UI area | Konsta component | Native config (props / classes) | Custom CSS still needed |
|---------|------------------|--------------------------------|-------------------------|
| App shell | `KonstaProvider` | `theme="material"`, `materialTouchRipple={true}`, `safeAreas` | Wrapper: `k-material` only; add `k-md-vibrant` only if palette feels flat after seed change |
| Top bar | `Navbar` via `WaNavbar` | **Remove** `waNavbarColors`; use defaults: `bg-md-light-surface-2`, `text-md-light-on-surface`. Add `medium` on `/` dashboard | Drop `sticky` + custom bg; use Konsta scroll + `outline` if needed |
| Bottom nav | `Tabbar` / `TabbarLink` | **Remove** `waTabbarLinkColors`; defaults use `secondary-container` active state | `fixed safe-areas`, `pb-safe-24` on `Page` per Konsta examples |
| Lists | `List`, `ListItem` | `strong` + `outline` + `inset` for settings; plain `List` for chats; `dividers` where needed | Chat row actions in `footer` snippet—keep |
| Buttons | `Button` | Default fill = primary; `tonal` for secondary; `clear` for toolbar actions | Remove all `!bg-[#25D366]` |
| Badges | `Badge` | `colors` from `error` or `primary` roles | Urgent “!” badge only |
| Blocks / cards | `Block`, `Card` | `strong inset` for stats; connection status as `Card` not flat WA panel | Stats grid → 3× `Card` or one `Block strong inset` |
| Icons | `Icon` + Material Symbols | Replace `WaIcon` for tabs; keep WA icon only in brand contexts if desired | Install Material Symbols font or SVG set |
| Settings | `ListItem` `link` | Drop per-row random `iconBg`; use `primary-container` circles | Profile header → `Block` or custom with surface tokens |
| PWA chrome | `app.html`, manifest | `theme_color` = surface; `background_color` = `surface-container-lowest` | Optional runtime `<meta name="theme-color">` on dark mode toggle |
| Touch targets | Konsta defaults | Tabbar links, list rows ≥ 48dp (MD minimum) | Verify `ChatListItem` footer buttons meet 48dp height |

### `WaNavbar` / `WaTabbar` fate

Keep as **thin adapters** (back link, tab routing) but **delete WhatsApp color objects** from `theme.ts`. Rename folder `wa/` → `chrome/` or `md/` when colors are gone to avoid misleading “WhatsApp clone” naming.

---

## `k-md-vibrant` vs `k-md-monochrome`

Introduced in Konsta v5 ([release notes](https://konstaui.com/release-notes)):

| Class | Behavior | Fit for Respondr |
|-------|----------|------------------|
| **`k-md-vibrant`** (default MD scheme) | More colorful on-container text/icons; aligns with MD3 Aug 2024 colorful containers | **Yes** — reminder dashboard needs visible urgency hierarchy |
| **`k-md-monochrome`** | Desaturated, neutral-forward scheme | Utility/settings-heavy apps; would mute “Need reply” emphasis |

**Recommendation:** Ship **vibrant** (omit class or explicitly set `k-md-vibrant` on root). Re-evaluate monochrome only for a “minimal mode” user setting later.

---

## Top app bar vs WhatsApp green toolbar

| | Green toolbar (current) | MD3 surface app bar (recommended) |
|--|-------------------------|-----------------------------------|
| **User expectation** | “This is WhatsApp” | “This is an Android app” |
| **Product honesty** | Poor — Respondr is not a messenger | Good — dashboard/settings app |
| **MD3 compliance** | Non-compliant (brand color on app bar) | Compliant |
| **WhatsApp Android 2024+** | Legacy; being removed | Matches beta/production refresh |
| **Dark mode** | Custom `#1f2c34` panel stack | Systematic surface-container tones |
| **Actions in header** | White links on green | `on-surface` icon buttons / `Link` with ripple |
| **Brand** | Green everywhere | Green on **primary buttons**, badges, WhatsApp link row, optional FAB |

**Tradeoff:** You lose instant “WhatsApp sibling” recognition. You gain credibility as a **native-feeling utility** and align with where WhatsApp itself is heading. Keep **teal/green in the product story** via primary actions and WhatsApp connection status—not the global toolbar.

---

## PWA: approximating native Android outside Konsta

| Technique | What it affects | Respondr action |
|-----------|----------------|-----------------|
| `theme_color` (manifest) | Android status bar, standalone title bar ([MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors)) | Set to **surface**, not `#075E54` |
| `<meta name="theme-color">` | Per-route override; browser + some PWA chrome | Mirror `surface`; update on dark mode |
| `background_color` | Splash screen while loading | `surface-container-lowest` |
| `viewport-fit=cover` + safe areas | Notch / gesture inset | Already in `app.html`; use Konsta `safeAreas` |
| `display: standalone` | Fullscreen app | Already in manifest |
| **Bottom system nav bar** | Android 3-button / gesture bar | **Not controllable in standard PWA**; OS uses light/dark + sometimes `background_color` ([Discourse PWA thread](https://meta.discourse.org/t/android-bottom-navigation-bar-color-issues-in-discourse-pwa/381137), [Stack Overflow](https://stackoverflow.com/questions/58254183/how-to-change-the-android-navigation-bar-color-in-a-pwa)) — design assuming OS-owned bar |
| Touch ripples | Material touch feedback | `materialTouchRipple` on provider |
| `prefers-color-scheme` | Dark/light | Wire `dark` class on `<html>` + Konsta dark tokens |
| Material Symbols + Roboto | Typography/icon parity | Load fonts in `app.html` |

**Material You dynamic color:** Android derives schemes from wallpaper via system APIs. **No stable PWA API** exists to read Material You palette in a Konsta web app. Practical approach: **static scheme from Theme Builder** + optional future `theme-color` media queries. Do not block on dynamic color.

---

## Comparison matrix

| Dimension | Current Konsta Material + WA skin | MD3 Expressive | WhatsApp Android (2024+) | Material You dynamic |
|-----------|-----------------------------------|----------------|--------------------------|----------------------|
| Top chrome | Green `#075E54` | Large flexible titles, search app bar | White/black surface bar | System-derived |
| Bottom nav | 3 tabs, green active | Edge-hugging elements | Bottom nav, filters on chats | Same structure, dynamic colors |
| Lists | WA hex backgrounds | Rich list / card hybrid | Filters + list | Dynamic surfaces |
| Buttons | Hardcoded green | Filled + tonal + FAB emphasis | Green FAB, neutral chrome | Dynamic primary |
| Konsta fit | Fighting defaults | Partial (no search app bar component) | Close to Konsta defaults | N/A in PWA |
| Effort | Sunk | Medium-high | Low if follow MD3-native | High / not viable |

---

## Effort estimate to upgrade from current UI

Assumes one developer familiar with the codebase.

| Phase | Work | Days |
|-------|------|------|
| **1. Token foundation** | Theme Builder export; update `app.css` `@theme`; manifest + `theme-color`; load Roboto + Material Symbols; remove `waNavbarColors` / `waTabbarColors` | **1–1.5** |
| **2. Chrome components** | Refactor `WaNavbar`, `WaTabbar`; surface app bar; default tab colors; optional `medium` navbar on dashboard | **1–1.5** |
| **3. Page sweep** | `/`, `/chats`, `/settings/*` — replace hex classes with MD tokens; Button/Badge/List defaults | **2–3** |
| **4. Icons & settings** | Material Symbols for tabs/settings; tonal icon containers; stats as cards | **1–2** |
| **5. PWA polish** | Dark mode meta theme-color sync; splash colors; touch target audit | **0.5–1** |
| **6. QA on Android** | Chrome PWA installed, gesture nav, dark/light, small phone | **1** |

**Total: 5–8 person-days** for a cohesive MD3-native feel.  
**+3–5 days** for MD3 Expressive touches (large flexible dashboard header, extended FAB for “Run scan”).  
**Not recommended:** full dynamic Material You (~1–2 weeks experimental with `@material/material-color-utilities` + manual mapping to Konsta tokens, still no wallpaper sync).

---

## Implementation checklist (ordered)

1. Run [Material Theme Builder](https://m3.material.io/theme-builder) with seed `#0d6e63` → export CSS variables.
2. Replace `web/src/lib/theme.ts` WA constants with exported role map (or delete file; use Konsta tokens only).
3. Change `app.html` `theme-color` and `manifest.webmanifest` `theme_color` / `background_color` to surface values.
4. Add Roboto + Material Symbols to `app.html` ([Konsta installation](https://konstaui.com/svelte/installation)).
5. Strip `colors={waNavbarColors}` from `WaNavbar`; use Konsta defaults.
6. Strip custom tab `colors` from `WaTabbar`; swap icons to Material Symbols filled/outlined by active state.
7. Replace page-level `bg-white dark:bg-[#111b21]` with `List strong` / surface classes.
8. Remove `!bg-[#25D366]` button overrides; use default `Button` + `tonal`.
9. Rename `wa-app` / `wa-page` CSS classes to `md-app` / `md-page` (optional but clarifies intent).
10. Test installed PWA on Android 13–15 light/dark.

---

## Primary source URL index

### Material Design 3

| Topic | URL |
|-------|-----|
| Color system overview (roles, dynamic color, surfaces) | https://m3.material.io/styles/color/system/overview |
| Static baseline scheme | https://m3.material.io/styles/color/static/baseline |
| Theme Builder (export tokens) | https://m3.material.io/theme-builder |
| Top app bar / app bar (scroll, no shadow) | https://m3.material.io/components/top-app-bar/overview |
| Navigation bar | https://m3.material.io/components/navigation-bar/overview |
| Lists | https://m3.material.io/components/lists/overview |
| Typography | https://m3.material.io/styles/typography/overview |
| M3 Expressive app bar update (May 2025) | https://m3.material.io/components/top-app-bar/overview |
| Surface container roles (Compose 1.2 blog) | https://m3.material.io/blog/material-3-compose-1-2 |
| Android mobile color guide | https://developer.android.com/design/ui/mobile/guides/styles/color |
| M3 theming codelab | https://developer.android.com/codelabs/m3-design-theming |

### Konsta UI

| Topic | URL |
|-------|-----|
| Installation (Roboto, theme.css) | https://konstaui.com/svelte/installation |
| Colors (`--color-brand-*`, vibrant/monochrome) | https://konstaui.com/svelte/colors |
| App / KonstaProvider (`materialTouchRipple`) | https://konstaui.com/svelte/app |
| Navbar | https://konstaui.com/svelte/navbar |
| Tabbar | https://konstaui.com/svelte/tabbar |
| List | https://konstaui.com/svelte/list |
| Button | https://konstaui.com/svelte/button |
| Release notes (v5 MD schemes, ripples) | https://konstaui.com/release-notes |

### WhatsApp Android / Meta (contrast with MD3, not UI token spec)

| Topic | URL |
|-------|-----|
| Meta Design: WA UI update (bottom nav, neutral chrome, selective green) | https://www.meta.com/design-at-meta/blog/whatsapp-user-interface-update/ |
| Android beta: white top bar, MD3 alignment | https://www.gadgets360.com/apps/news/whatsapp-new-interface-colours-rolling-out-latest-android-beta-4476784 |
| Prior Respondr WA clone research | [research/whatsapp-clone-ui-redesign.md](./whatsapp-clone-ui-redesign.md) |

### PWA / Android chrome

| Topic | URL |
|-------|-----|
| MDN: theme_color & background_color | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors |
| Chrome Lighthouse: themed omnibox | https://developer.chrome.com/docs/lighthouse/pwa/themed-omnibox |
| Chrome: theme-color on Android (legacy blog) | https://developer.chrome.com/blog/support-for-theme-color-in-chrome-39-for-android |
| Android bottom nav bar in PWA (limitations) | https://stackoverflow.com/questions/58254183/how-to-change-the-android-navigation-bar-color-in-a-pwa |

### Respondr codebase (current WA skin)

| File | Role |
|------|------|
| `web/src/app.css` | WA color `@theme` variables |
| `web/src/lib/theme.ts` | `waNavbarColors`, `waTabbarColors` overrides |
| `web/src/routes/+layout.svelte` | `KonstaProvider theme="material"` |
| `web/src/lib/components/wa/*` | Custom chrome + list rows |
| `web/static/manifest.webmanifest` | `theme_color: #075E54` |
| `web/src/app.html` | `theme-color` meta |

---

## Related research

- [framework7-konsta-svelte-rebuild.md](./framework7-konsta-svelte-rebuild.md) — stack choice (SvelteKit + Konsta retained)
- [whatsapp-clone-ui-redesign.md](./whatsapp-clone-ui-redesign.md) — WA visual spec; **superseded for chrome** by this doc’s MD3-native direction (still useful for chat row density and settings layout patterns)
