/* Theme init: runs before paint to avoid FOUC. Loaded via <script src="/theme-init.js"> in app.html
   so Content-Security-Policy script-src 'self' covers it without inline hashes. */
(function () {
  try {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch {
    /* matchMedia unavailable (SSR/prerender): leave default theme */
  }
})();
