const CACHE = "searisk-ua-v1.2.0";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./model.js", "./coefficients.js", "./ui-runtime.js", "./guided-assignment.js", "./manifest.webmanifest", "./icons/searisk.svg", "./icons/searisk-192.png", "./icons/searisk-512.png", "./data/incidents.maib.aggregate.json", "./data/release-manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys
      .filter((key) => key.startsWith("searisk-ua-") && key !== CACHE)
      .map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (response?.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      const cached = await caches.match(event.request, { ignoreSearch: event.request.mode === "navigate" });
      if (cached) return cached;
      if (event.request.mode === "navigate") return caches.match("./index.html");
      throw error;
    }
  })());
});
