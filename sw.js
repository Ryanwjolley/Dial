/* Dial — offline shell.
   Cache-first for the app itself so it cold-starts with no signal.
   Bump VERSION on every deploy; old caches are cleared on activate. */
const VERSION = "dial-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // a missing icon must not block install
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // never touch cross-origin

  // Navigations: cache-first, so a canyon cold start works.
  if (req.mode === "navigate") {
    e.respondWith(
      caches.match("./index.html").then(hit =>
        hit || fetch(req).catch(() => caches.match("./"))
      )
    );
    return;
  }

  // Everything else: cache-first, refresh in the background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

// Lets the page trigger an immediate update after a deploy.
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});
