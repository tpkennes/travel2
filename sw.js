/* ══════════════════════════════════════════
   Planning Voyage v3.0 — Service Worker
   Stratégie : Network-first avec fallback cache
   ══════════════════════════════════════════ */

const CACHE_NAME = "planning-voyage-v3.0";

/* URLs à exclure du cache (toujours en ligne) */
const BYPASS = [
  "api.github.com",
  "gist.githubusercontent.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

/* Fichiers essentiels au démarrage — précachés dès l'installation pour que
   l'app fonctionne hors ligne dès le premier lancement (React/ReactDOM/Babel
   sont hébergés localement, plus besoin du réseau pour les charger). */
const PRECACHE = [
  "./",
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "vendor/babel.min.js",
  "icon-192.png",
];

/* ── Installation : mise en cache des fichiers essentiels ── */
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

/* ── Activation : suppression des anciens caches ── */
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch : Network-first, fallback cache ── */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = e.request.url;

  /* Bypass pour les APIs externes — toujours réseau */
  if (BYPASS.some(domain => url.includes(domain))) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        /* Mettre en cache si réponse valide */
        if (response && response.status === 200 && response.type !== "opaque") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        /* Hors ligne : servir depuis le cache */
        return caches.match(e.request)
          .then(cached => cached || caches.match("./"));
      })
  );
});
