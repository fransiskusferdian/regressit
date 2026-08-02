// RegressIt service worker — fully offline capable (all math runs in-browser).
// v2: renamed cache to regressit, added the optional school logo to the shell.
const CACHE = "regressit-v2";
const SHELL = [
  "./",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./school-logo.png"   // optional — cached only if present, missing file won't break install
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Cache items one by one so a single missing file (e.g. the logo not added yet)
      // never aborts the whole install.
      Promise.all(SHELL.map((url) =>
        fetch(url, { cache: "no-cache" })
          .then((res) => (res.ok && !res.redirected ? cache.put(url, res) : null))
          .catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("./").then((c) => c || new Response("<h1>Offline</h1>", { headers: { "Content-Type": "text/html; charset=utf-8" } })))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && !res.redirected) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => new Response("", { status: 504 })))
  );
});
