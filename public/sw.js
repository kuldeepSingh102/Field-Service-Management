const CACHE = "gridline-public-shell-v2";
const PUBLIC_ASSETS = ["/offline", "/manifest.webmanifest", "/icon.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PUBLIC_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_FIELD_SHELL") {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.delete("/field")));
  }
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || ["/manifest.webmanifest", "/icon.svg"].includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      if (url.pathname === "/field" && response.ok && !response.redirected) caches.open(CACHE).then((cache) => cache.put("/field", response.clone()));
      return response;
    }).catch(async () => (await caches.match(url.pathname === "/field" ? "/field" : "/offline")) || (await caches.match("/offline")) || Response.error()));
  }
});
