// Lanternroom service worker: lets the app install and open without a connection.
// The page itself is always fetched fresh when online (so updates land right away) and kept as a fallback;
// built-in sounds, icons and fonts are stored once and served from the phone after that.
// Nothing else is touched: the AI, the account (Supabase) and pictures go straight to the network.
const SHELL = "lr-shell-1", MEDIA = "lr-media-1";
const SHELL_FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png", "./icons/icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const fresh = async (req, cacheName, fallbackUrl) => {
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res.ok) (await caches.open(cacheName)).put(fallbackUrl || req, res.clone());
    return res;
  } catch {
    return (await caches.match(fallbackUrl || req)) || Response.error();
  }
};
const stored = async (req, cacheName) => {
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") (await caches.open(cacheName)).put(req, res.clone());
  return res;
};
const refreshing = async (req, cacheName) => {
  const hit = await caches.match(req);
  const net = fetch(req).then(async res => { if (res.ok) (await caches.open(cacheName)).put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
};

self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") return e.respondWith(stored(req, MEDIA));
  if (url.origin !== location.origin) return; // AI, account, pictures: untouched
  if (req.headers.has("range")) return; // audio seeking goes straight to the network
  const path = url.pathname;
  if (req.mode === "navigate" || /\/(index\.html)?$/.test(path)) return e.respondWith(fresh(req, SHELL, "./index.html"));
  if (/\/sounds\/.+\/manifest\.json$/.test(path) || /manifest\.webmanifest$/.test(path)) return e.respondWith(refreshing(req, SHELL));
  if (/\/(sounds|icons)\//.test(path)) return e.respondWith(stored(req, MEDIA));
  e.respondWith(fresh(req, SHELL));
});
