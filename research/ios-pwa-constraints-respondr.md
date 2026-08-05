# iOS PWA install/push constraints for Respondr — Research findings

## Question

What are the iOS Safari PWA install and push notification constraints for Respondr? iOS PWAs have specific limitations around Web Push, install prompts, storage, and background sync. Document the constraints that affect design decisions for the mobile-first Respondr.

## Short answer

iOS Safari supports PWAs, but with important constraints that Respondr must design for:

- **No automatic install prompt**: users must manually tap Share → Add to Home Screen. There is no `beforeinstallprompt` event.
- **Web Push works only for Home Screen web apps**, and only on iOS/iPadOS 16.4+.
- **Push permission must be requested on a user gesture** inside the standalone PWA.
- **No Background Sync or periodic background sync** on iOS. Offline action queueing needs a fallback.
- **Storage is not shared with Safari** and is subject to quota; standalone web apps get the same quota as browser apps.
- **The `web-push` Node library already uses the VAPID protocol that iOS supports**, so the server side needs no Apple-specific changes.

## Primary-source findings

### 1. Installation is manual only on iOS

There is **no `beforeinstallprompt` event** and **no install banner** on iOS or iPadOS ([firt.dev — iOS PWA compatibility](https://firt.dev/notes/pwa-ios/)). The user must:

1. Open the site in Safari.
2. Tap the **Share** button.
3. Scroll and tap **Add to Home Screen**.
4. Confirm and tap **Add**.
5. Launch the app from the new icon; only then does it run in `standalone` mode.

This flow is different from Android, where `beforeinstallprompt` allows a one-tap install dialog ([Dev.to — FieldKit PWA install guide](https://dev.to/alex_truhniy/make-your-pwa-installable-the-manifest-the-prompt-and-the-ios-catch-fieldkit-2-2mom)).

### 2. Web Push on iOS is Home-Screen-only and requires iOS 16.4+

WebKit added standards-based Web Push for Home Screen web apps in **iOS and iPadOS 16.4** ([WebKit blog — Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)). Key points:

- Push works only for web apps that have been **added to the Home Screen**.
- `Notification.requestPermission()` and `pushManager.subscribe()` are not exposed in the Safari tab; they are only available in the **standalone** PWA.
- The permission request must be triggered by a **direct user interaction** (e.g. tapping a subscribe button).
- iOS uses the same W3C Web Push standard as other browsers, so a correctly implemented VAPID sender works without Apple Developer Program membership or APNs certificates.
- `userVisibleOnly: false` (silent push) is not available on Apple platforms ([web-push-notifications.com — Safari & iOS Web Push Integration Guide](https://www.web-push-notifications.com/core-protocols-browser-implementation/safari-ios-web-push-integration/)).

### 3. iOS push subscription can be fragile

Reports from the Apple Developer Forums indicate that iOS push subscriptions can be revoked or lost outside of user interaction, and the `pushsubscriptionchange` event is not supported, making it hard to detect and re-subscribe automatically ([Apple Developer Forums](https://developer.apple.com/forums/thread/727372), [thread 728796](https://developer.apple.com/forums/thread/728796)).

### 4. No Background Sync or periodic background sync on iOS

The Background Sync API is not supported on iOS Safari ([caniuse — Background Sync API](https://caniuse.com/background-sync)). The same is true for the `sync` event and `SyncManager` ([caniuse — ServiceWorkerGlobalScope `sync` event](https://caniuse.com/mdn-api_serviceworkerglobalscope_sync_event)). Respondr must therefore rely on the `online` event, `navigator.onLine`, and queue replay when the app is opened.

### 5. iOS storage quota and persistence

Storage for PWAs on iOS is partitioned and subject to quota. For Safari 17+ and iOS 17+, the origin quota is up to 60% of total disk space for a browser app and 80% overall; for other apps it is lower ([WebKit — Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)). Home Screen web apps get the same quota as browser apps. Safari also prompts the user to allow storage increases when an origin exceeds its quota ([web.dev — Storage for the web](https://web.dev/articles/storage-for-the-web)).

In short: small-to-moderate IndexedDB / Cache API usage is fine, but large or unbounded caches are not safe. Respondr should keep cached data small and bounded.

## Implications for Respondr

| Capability | iOS support | What Respondr should do |
|---|---|---|
| Add-to-Home-Screen install | Manual only | Build a guided helper: show the Safari → Share → Add flow for iOS users. |
| `beforeinstallprompt` / install banner | Not supported | Use custom UI; do not rely on a native prompt. |
| `display: standalone` | Supported | Set `display` to `standalone` or `fullscreen` in `manifest.json`. |
| Web Push | iOS 16.4+ only, Home Screen only | Request permission after the PWA is installed; detect `display-mode: standalone`. |
| `web-push` Node library | Works with iOS | No Apple-specific sender code needed; keep VAPID subject format valid. |
| Silent push (`userVisibleOnly: false`) | Not supported | Every push must show a visible notification. |
| Background Sync | Not supported | Use IndexedDB + `online` event for queue replay; Background Sync is Android-only. |
| Push subscription durability | Fragile | Plan for re-subscription flow; don't assume a subscription lasts forever. |

## Recommendations

1. **Add an iOS install helper** to the landing page/QR page that explains the manual Add to Home Screen steps when `navigator.userAgent` matches iOS and the app is not in `standalone` mode (`!window.navigator.standalone`).
2. **Make the web app manifest iOS-ready**: `display: standalone`, `start_url`, `name`, `short_name`, `icons`, `theme_color`, and `background_color`.
3. **Gate Web Push on iOS**: only show the subscribe button when the app is running installed (`window.navigator.standalone === true` or `display-mode: standalone` matches) and iOS 16.4+.
4. **Keep the server-side Web Push as-is**: the existing `web-push` Node library and VAPID setup already work for iOS once the client is subscribed.
5. **Design for push subscription churn on iOS**: allow re-subscription, surface if notifications stop working, and consider a fallback notification path (e.g. ntfy/Gotify already supported by Respondr).
6. **Do not rely on Background Sync on iOS**: implement the IndexedDB mutation queue with `online` / `navigator.onLine` checks as the baseline, with Background Sync as a progressive enhancement for Android only.
7. **Keep caches bounded**: iOS storage is adequate for the Respondr PWA shell and a small amount of API data, but the service worker should limit cached items and evict old entries.

## Sources

- [WebKit — Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [WebKit — Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)
- [WebKit — Workers at Your Service (Service Workers)](https://webkit.org/blog/8090/workers-at-your-service/)
- [firt.dev — iOS PWA Compatibility](https://firt.dev/notes/pwa-ios/)
- [caniuse — Background Sync API](https://caniuse.com/background-sync)
- [caniuse — ServiceWorker `sync` event](https://caniuse.com/mdn-api_serviceworkerglobalscope_sync_event)
- [caniuse — Service Workers](https://caniuse.com/serviceworkers)
- [web-push-notifications.com — Safari & iOS Web Push Integration Guide](https://www.web-push-notifications.com/core-protocols-browser-implementation/safari-ios-web-push-integration/)
- [Apple Developer Forums — iOS push subscription revocation](https://developer.apple.com/forums/thread/727372)
- [Apple Developer Forums — iOS PWA push notification issues](https://developer.apple.com/forums/thread/728796)
- [web.dev — Storage for the web](https://web.dev/articles/storage-for-the-web)
- [Dev.to — Make your PWA installable: the iOS catch](https://dev.to/alex_truhniy/make-your-pwa-installable-the-manifest-the-prompt-and-the-ios-catch-fieldkit-2-2mom)
