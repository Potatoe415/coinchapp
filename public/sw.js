// Offline support for the local (solo) game mode. Keeps the app shell available
// without network so a reload mid-flight doesn't break anything.
//
// Strategy (deliberately simple, no build step - this file is served as-is):
// - Navigations (the HTML document): network-first, falling back to the last
//   cached version when offline. This means online users always get the
//   current deploy's HTML (which points at that deploy's hashed JS/CSS), so
//   there is no "stuck on an old version" problem to manage.
// - Next.js static assets (/_next/static/...): cache-first. Their filenames
//   are content-hashed and immutable, so caching them forever is safe; a new
//   deploy just produces new hashes instead of invalidating old ones.
// - Everything else (Server Actions, Supabase calls, cross-origin requests,
//   non-GET requests): left untouched, never intercepted. Online-mode data
//   must never be served from a cache.

const CACHE_NAME = "coinchapp-shell-v1";
const SHELL_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

function isImmutableStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match("/");
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isImmutableStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});
