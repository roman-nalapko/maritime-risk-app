const CACHE = "searisk-ua-v0.5.1";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./model.js", "./coefficients.js", "./manifest.webmanifest", "./icons/searisk.svg", "./icons/searisk-192.png", "./icons/searisk-512.png", "./data/incidents.maib.aggregate.json", "./data/release-manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request, { ignoreSearch: event.request.mode === "navigate" }).then(async (cached) => {
    if (cached) return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === "navigate") return caches.match("./index.html");
      throw error;
    }
  }));
});
