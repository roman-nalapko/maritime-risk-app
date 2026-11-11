import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (file) => path.join(root, "src", file);

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function pngSize(buffer) {
  assert.equal(buffer.subarray(1, 4).toString("ascii"), "PNG", "icon must be a PNG file");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const html = await readFile(source("index.html"), "utf8");
const css = await readFile(source("styles.css"), "utf8");
const app = await readFile(source("app.js"), "utf8");
const serviceWorker = await readFile(source("sw.js"), "utf8");
const manifest = JSON.parse(await readFile(source("manifest.webmanifest"), "utf8"));

assert.match(html, /<html lang="uk">/, "document language must be Ukrainian");
assert.match(html, /class="skip-link" href="#main-content"/, "skip link must target main content");
assert.match(html, /<main id="main-content" tabindex="-1">/, "main landmark must accept programmatic focus");
assert.match(html, /id="result-announcement" role="status" aria-live="polite" aria-atomic="true"/, "calculation updates need a concise live region");
assert.doesNotMatch(html, /id="result-panel"[^>]*aria-live/, "interactive result card must not be one large live region");
assert.equal((html.match(/role="switch"/g) ?? []).length, 5, "all five custom toggles must expose switch semantics");
assert.match(css, /:focus-visible/, "interactive controls need a visible keyboard focus rule");
assert.match(css, /prefers-reduced-motion: reduce/, "motion must respect the user preference");
assert.match(css, /max-width: 900px/, "tablet layout breakpoint is required");
assert.match(css, /max-width: 620px/, "mobile layout breakpoint is required");
assert.match(app, /location\.protocol === "https:"/, "service worker registration must require HTTPS outside local development");
assert.match(app, /"localhost", "127\.0\.0\.1"/, "local PWA testing must be enabled");

const contrastPairs = [
  ["607483", "f4f7f8", "muted text on paper"],
  ["087a72", "ffffff", "accent text on white"],
  ["adbec7", "06131e", "hero body text"],
  ["aabcc5", "06131e", "navigation text"],
  ["819da9", "102d40", "small chart text"],
  ["6f8b98", "071b29", "chart metadata label"]
];
for (const [foreground, background, label] of contrastPairs) {
  assert.ok(css.includes(`#${foreground}`) && css.includes(`#${background}`), `${label} audit colors must exist in the stylesheet`);
  assert.ok(contrast(foreground, background) >= 4.5, `${label} must meet WCAG AA 4.5:1`);
}

assert.ok(manifest.name && manifest.short_name && manifest.start_url && manifest.display, "manifest lacks install metadata");
assert.equal(manifest.id, "./");
assert.equal(manifest.scope, "./");
for (const size of [192, 512]) {
  const icon = manifest.icons.find((item) => item.sizes === `${size}x${size}` && item.type === "image/png");
  assert.ok(icon, `manifest needs a ${size}x${size} PNG icon`);
  const buffer = await readFile(source(icon.src));
  assert.deepEqual(pngSize(buffer), { width: size, height: size }, `${icon.src} has incorrect dimensions`);
}

const listeners = {};
const cachedShell = [];
const deletedCaches = [];
const cachedResponses = [];
const cacheName = serviceWorker.match(/const CACHE = "([^"]+)"/)?.[1];
assert.ok(cacheName, "service worker cache must be explicitly versioned");
assert.notEqual(cacheName, "searisk-ua-v0.8.1", "assignment release must use a fresh cache identity");
let skippedWaiting = false;
let claimedClients = false;
const offlineDocument = { source: "offline-shell" };
const networkDocument = { source: "network", ok: true, clone() { return this; } };
let networkAvailable = true;
const context = {
  self: {
    addEventListener: (type, listener) => { listeners[type] = listener; },
    skipWaiting: async () => { skippedWaiting = true; },
    clients: { claim: async () => { claimedClients = true; } }
  },
  caches: {
    open: async () => ({
      addAll: async (files) => cachedShell.push(...files),
      put: async (request, response) => cachedResponses.push({ request, response })
    }),
    keys: async () => ["unrelated-app-cache", "searisk-ua-v0.8.1", cacheName],
    delete: async (key) => { deletedCaches.push(key); return true; },
    match: async (request) => typeof request === "string" ? offlineDocument : null
  },
  fetch: async () => {
    if (networkAvailable) return networkDocument;
    throw new Error("offline");
  },
  Promise
};
vm.runInNewContext(serviceWorker, context);
assert.deepEqual(Object.keys(listeners).sort(), ["activate", "fetch", "install"]);

let installPromise;
listeners.install({ waitUntil: (promise) => { installPromise = promise; } });
await installPromise;
assert.equal(skippedWaiting, true, "new service worker must activate without an extra visit");
for (const asset of [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./model.js",
  "./coefficients.js",
  "./ui-runtime.js",
  "./guided-assignment.js",
  "./manifest.webmanifest",
  "./icons/searisk.svg",
  "./icons/searisk-192.png",
  "./icons/searisk-512.png",
  "./data/incidents.maib.aggregate.json",
  "./data/release-manifest.json"
]) {
  assert.ok(cachedShell.includes(asset), `offline shell must precache ${asset}`);
}
for (const item of cachedShell.filter((entry) => entry !== "./")) await access(source(item.replace(/^\.\//, "")));

let activatePromise;
listeners.activate({ waitUntil: (promise) => { activatePromise = promise; } });
await activatePromise;
assert.deepEqual(deletedCaches, ["searisk-ua-v0.8.1"], "activation must remove only older SeaRisk caches");
assert.equal(claimedClients, true, "active service worker must claim open clients");

let responsePromise;
listeners.fetch({
  request: { method: "GET", mode: "navigate", url: "https://example.invalid/" },
  respondWith: (promise) => { responsePromise = promise; }
});
assert.equal(await responsePromise, networkDocument, "online navigation must prefer the current network release over stale cache");
assert.equal(cachedResponses.length, 1, "fresh online responses must refresh the offline cache");

networkAvailable = false;
listeners.fetch({
  request: { method: "GET", mode: "navigate", url: "https://example.invalid/?offline" },
  respondWith: (promise) => { responsePromise = promise; }
});
assert.equal(await responsePromise, offlineDocument, "offline navigation must return the cached application shell");

console.log("Accessibility and PWA audit checks passed.");
