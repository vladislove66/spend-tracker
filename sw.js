const CACHE_NAME = "vytraty-cache-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/icons.js",
  "./js/db.js",
  "./js/charts.js",
  "./js/entry.js",
  "./js/dashboard.js",
  "./js/categories.js",
  "./js/stats.js",
  "./js/settings.js",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Core app files (markup/code/styles) must never go stale behind a forgotten
// CACHE_NAME bump: fetch them network-first, falling back to cache offline.
// Static assets that rarely change (icons) stay cache-first for speed.
const CORE_RE = /\.(?:html|js|css|json)$/;

function isCoreRequest(request, url) {
  return request.mode === "navigate" || url.pathname.endsWith("/") || CORE_RE.test(url.pathname);
}

function putInCache(request, response) {
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  return response;
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => caches.match(request));
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => putInCache(request, response));
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  event.respondWith(isCoreRequest(event.request, url) ? networkFirst(event.request) : cacheFirst(event.request));
});
