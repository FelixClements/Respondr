# Why Respondr stopped being installable as a PWA

**Date:** 2026-08-22  
**Question:** Why is the app no longer a PWA (no install prompt, not installable on Android via ngrok)?

## Short answer

**The manifest is still there, but the service worker is never registered.** Chrome requires a registered service worker (among other criteria) before it fires `beforeinstallprompt` and treats the site as installable ([web.dev install criteria](https://web.dev/articles/install-criteria)).

This broke when we migrated from `generateSW` to `injectManifest` + `kit.serviceWorker.register: false` without adding the **required SvelteKit PWA registration** (`virtual:pwa-register` in `+layout.svelte`). The build still emits `registerSW.js`, but nothing loads it in `index.html`.

**ngrok is a separate issue:** if the tunnel process is stopped, the public URL returns `ERR_NGROK_3200` and nothing works from your phone — that is not a PWA problem, the app is simply unreachable.

---

## Evidence from this repo (2026-08-22)

| Check | Local `localhost:9595` | Finding |
|-------|------------------------|---------|
| `/manifest.webmanifest` | HTTP 200 | Valid manifest (`standalone`, 192/512 icons) |
| `/service-worker.js` | HTTP 200 | SW file exists |
| `/registerSW.js` | HTTP 200 | Registration script exists |
| `index.html` references `registerSW` | **0 matches** | **Script never loaded** |
| DevTools → Application → Service Workers | (expected) | No active registration |

`registerSW.js` content (built):

```js
navigator.serviceWorker.register('./service-worker.js', { scope: './' })
```

Without a `<script src="/registerSW.js">` tag or `virtual:pwa-register` import, this never runs.

---

## What changed (architecture deepening Phase 1b)

Before:

- `@vite-pwa/sveltekit` with **`generateSW`** — Workbox generated the SW and registration was handled automatically.

After ([implementation plan](../research/architecture-deepening-implementation-plan.md)):

- **`strategies: 'injectManifest'`** + custom `web/src/service-worker.ts`
- **`kit.serviceWorker.register: false`** in `web/svelte.config.js` (correct per vite-pwa docs — disables SvelteKit's own SW so vite-pwa owns it)
- **Missing:** the replacement registration step documented for SvelteKit

---

## How @vite-pwa/sveltekit expects registration to work

Per [vite-pwa SvelteKit framework docs](https://vite-pwa-org.netlify.app/frameworks/sveltekit):

> Since SvelteKit uses SSR/SSG, we need to call the vite-plugin-pwa virtual module using a **dynamic import**. The best place … will be in main layout …

Required pattern in `src/routes/+layout.svelte`:

```svelte
<script>
  import { onMount } from 'svelte'
  import { pwaInfo } from 'virtual:pwa-info'

  onMount(async () => {
    if (pwaInfo) {
      const { registerSW } = await import('virtual:pwa-register')
      registerSW({ immediate: true })
    }
  })

  $: webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : ''
</script>

<svelte:head>
  {@html webManifest}
</svelte:head>
```

Also from the same docs:

> You will need to exclude the service worker registration from the SvelteKit configuration if you're using any pwa virtual module … `kit.serviceWorker.register: false`

We set `register: false` but **never added `virtual:pwa-register`**.

For generic Vite apps, [vite-pwa register docs](https://vite-pwa-org.netlify.app/guide/register-service-worker.html) describe `injectRegister: 'auto' | 'script' | 'inline'`. With SvelteKit's static adapter, HTML injection into `index.html` does not happen the same way — **`registerSW.js` is emitted to `build/` but not linked** (verified: 0 occurrences in `build/index.html`).

---

## Chrome PWA installability checklist

From [web.dev — What does it take to be installable?](https://web.dev/articles/install-criteria):

| Requirement | Respondr status |
|-------------|-----------------|
| HTTPS (or localhost) | OK on localhost; OK on ngrok when tunnel is up |
| Web app manifest with `name`, `icons` (192+512), `start_url`, `display` | OK |
| Registered service worker | **FAIL — not registered** |
| User engagement (click + ~30s on site) | N/A until SW works |
| `beforeinstallprompt` | Won't fire without SW |

`InstallBanner.svelte` listens for `beforeinstallprompt` — it will never show the native install path on Android until installability criteria are met.

---

## ngrok-specific notes

| Topic | Finding |
|-------|---------|
| Tunnel offline | `ERR_NGROK_3200` — entire site 404; not PWA-specific |
| HTTPS | ngrok provides HTTPS; satisfies secure-context requirement for push/install |
| Free-tier interstitial | ngrok may show a browser warning page on first visit; use `ngrok-skip-browser-warning` header for API curls; installed PWA may behave differently |
| `BETTER_AUTH_URL` | Must match the public origin for auth cookies; separate from installability |

When the tunnel was tested offline, `https://splashing-broiler-diploma.ngrok-free.dev` returned HTTP 404 with `ngrok-error-code: ERR_NGROK_3200` — the laptop app was fine on `localhost:9595`.

---

## What to verify in DevTools (Chrome)

1. **Application → Manifest** — should show Respondr manifest (likely OK today)
2. **Application → Service Workers** — should show `service-worker.js` **activated**; currently empty
3. **Console** — no `SW Registered` log (would appear after fix)
4. **Lighthouse → PWA** — will flag missing service worker

---

## Fix (applied 2026-08-22)

1. Added `virtual:pwa-register` + `virtual:pwa-info` to `web/src/routes/+layout.svelte`.
2. Removed static manifest link from `app.html` (manifest now via `pwaInfo`).
3. Set `kit.files.serviceWorker: 'src/service-worker.ts'` in `svelte.config.js`.
4. Fixed `injectManifest.globPatterns` to use `client/**` prefix.
5. Added `skipWaiting()` / `clientsClaim()` to `service-worker.ts`.

**Verify:** rebuild (`npm run build`), check DevTools → Application → Service Workers, then test install. For Android via ngrok, restart tunnel and expect free-tier interstitial on first visit.

---

## Sources

- [vite-pwa — SvelteKit framework guide](https://vite-pwa-org.netlify.app/frameworks/sveltekit)
- [vite-pwa — Register service worker](https://vite-pwa-org.netlify.app/guide/register-service-worker.html)
- [web.dev — Install criteria](https://web.dev/articles/install-criteria)
- [MDN — beforeinstallprompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event)
- [WebKit — Web Push for Home Screen web apps (iOS)](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- Repo: `web/vite.config.ts`, `web/svelte.config.js`, `web/src/app.html`, `web/src/routes/+layout.svelte`, `research/architecture-deepening-implementation-plan.md`
