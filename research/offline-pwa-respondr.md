# Offline PWA capability for Respondr — Research findings

## Question

Can Respondr support meaningful offline functionality as a PWA, and which parts should be offline?

## Short answer

Yes, but only in a limited, "read-and-resilient" sense. The PWA can cache the app shell and the most recent API responses (dashboard, chat list, history) so the UI is usable when the device loses connectivity. User actions such as "ignore" or "done" can be queued and replayed when the device is back online. However, **reminder generation and WhatsApp scanning cannot run offline** because they depend on the server-side WhatsApp Web connection. iOS support is more constrained than Android.

## Primary-source findings

### 1. Service workers and the Cache API make offline reads possible

Service workers act as a network proxy. They can intercept requests and serve responses from the browser's Cache Storage API, allowing an app to load even when the device is offline ([web.dev — Service workers](https://web.dev/learn/pwa/service-workers)).

Caching strategies used in production PWAs include:

- **Cache-first, falling back to network**: ideal for static assets (JS, CSS, icons) that do not change often.
- **Network-first, falling back to cache**: ideal for HTML and API responses. When online, the latest version is fetched and cached; when offline, the most recently cached response is served.
- **Stale-while-revalidate**: serve the cached response immediately and refresh the cache from the network in the background ([web.dev — Caching](https://web.dev/learn/pwa/caching), [Chrome for Developers — Workbox strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview)).

### 2. Background Sync is not universally available

The Background Sync API lets a service worker replay failed requests automatically when connectivity returns, even after the tab is closed. It is supported on Chromium-based browsers but **not on iOS Safari** ([Chrome for Developers — workbox-background-sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync), [error-recovery.com](https://www.error-recovery.com/pwa-offline-recovery-service-worker-resilience/background-sync-and-request-replay-queues/)).

A cross-browser queue pattern is:

1. Write the mutation to IndexedDB from the page.
2. Use `registration.sync.register(...)` if `SyncManager` is available (Chromium).
3. Fall back to the `online` event and `navigator.onLine` for browsers without Background Sync ([OpenReplay blog](https://blog.openreplay.com/offline-form-submission-background-sync/)).

### 3. iOS PWA limitations are significant

- Web Push on iOS works only for PWAs added to the Home Screen, and only since iOS 16.4 ([Apple Developer Forums — Web Push in Home Screen web apps](https://developer.apple.com/forums/thread/732594), [firt.dev — PWA iOS compatibility](https://firt.dev/notes/pwa-ios/)).
- There is **no install prompt/banner** and no `beforeinstallprompt` event. Installation requires the user to tap Share → Add to Home Screen ([firt.dev](https://firt.dev/notes/pwa-ios/), [web-push-notifications.com — Safari & iOS Web Push Integration Guide](https://www.web-push-notifications.com/core-protocols-browser-implementation/safari-ios-web-push-integration/)).
- Persistent storage and some PWA features are only available in the "standalone" (Home Screen) context ([firt.dev](https://firt.dev/notes/pwa-ios/)).
- iOS is stricter about cache storage; the service worker cache can be cleared after periods of no use, and storage is not shared with Safari ([hashhackers.com — PWA on iOS limitations](https://blog.hashhackers.com/blog/pwa-ios-limitations/)).

### 4. WhatsApp Web runs on the server, not in the PWA

Respondr's `src/whatsapp/client.js` uses `whatsapp-web.js` and `puppeteer` to drive WhatsApp Web **inside the Node.js server**. The mobile PWA is only the dashboard/viewer. Therefore:

- Scanning for forgotten chats, generating reminders, and linking a new WhatsApp device require the server to be online and connected to WhatsApp.
- The PWA cannot trigger a scan or receive a fresh chat list without the server.
- Any "offline" features must be confined to the PWA shell and cached data.

## Feasibility for Respondr

| Capability | Feasible? | Notes |
|---|---|---|
| Cache app shell, CSS, JS, icons | Yes | Precache at install; use stale-while-revalidate for updates. |
| Offline viewing of dashboard/history/settings | Yes | Cache API responses with a network-first strategy. |
| Queue actions like ignore/done/undone | Yes | Use IndexedDB queue; retry on `online` event; Background Sync as enhancement on Android. |
| Push reminders to the PWA | Partial | Android supports Web Push well. iOS 16.4+ requires Home Screen install and has limited reliability. |
| Generate reminders offline | No | Requires the server-side WhatsApp client. |
| Refresh chats offline | No | Requires live server connection to WhatsApp. |

## Recommendation

Adopt a **read-oriented offline resilience** layer for the PWA, not a fully offline mode:

1. **Precache the app shell** so the PWA loads instantly and works when the device is offline.
2. **Runtime-cache API endpoints** (`/api/status`, `/chats`, `/history`, `/settings`) with a network-first strategy so users see the last-known data offline.
3. **Queue mutating actions** (ignore, done, settings changes) in IndexedDB and replay them when online. Add Background Sync on Android as a progressive enhancement; rely on the `online` event for iOS.
4. **Do not attempt offline scans or reminder generation**; explain clearly that the phone and server must be online for those.
5. **Document iOS PWA limitations** and guide users through Add to Home Screen.

## Sources

- [Service workers | web.dev](https://web.dev/learn/pwa/service-workers)
- [Caching | web.dev](https://web.dev/learn/pwa/caching)
- [The Offline Cookbook | web.dev](https://web.dev/articles/offline-cookbook)
- [Workbox caching strategies overview | Chrome for Developers](https://developer.chrome.com/docs/workbox/caching-strategies-overview)
- [workbox-background-sync | Chrome for Developers](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync)
- [Background Sync and Request Replay Queues](https://www.error-recovery.com/pwa-offline-recovery-service-worker-resilience/background-sync-and-request-replay-queues/)
- [Offline Form Submission with Background Sync](https://blog.openreplay.com/offline-form-submission-background-sync/)
- [PWA on iOS: Limitations, Workarounds, and Safari Quirks](https://blog.hashhackers.com/blog/pwa-ios-limitations/)
- [iOS PWA Compatibility — firt.dev](https://firt.dev/notes/pwa-ios/)
- [Safari & iOS Web Push Integration Guide](https://www.web-push-notifications.com/core-protocols-browser-implementation/safari-ios-web-push-integration/)
- [Apple Developer Forums — PWA push notifications on iOS](https://developer.apple.com/forums/thread/732594)
