/* Service Worker do SM Hub.
 *
 * Conservador e seguro para uma SaaS com conteúdo privado por agência:
 *  - Ignora tudo que não seja GET same-origin.
 *  - Ignora /api, /auth e requisições RSC/Next-Router (não cacheia payloads
 *    dinâmicos nem conteúdo autenticado).
 *  - Navegações: network-first. Só cacheia as páginas PÚBLICAS (landing, login,
 *    checkout) — páginas privadas (/admin, /clientes...) nunca são cacheadas;
 *    offline, caem na página /offline.
 *  - Assets estáticos (_next/static, css, fontes, imagens): stale-while-
 *    revalidate ( hashes são content-addressed, seguro).
 */
const CACHE = "smhub-v2";
const OFFLINE_URL = "/offline";
// Navegações PÚBLICAS que podem ser cacheadas (offline fallback útil).
const SHELL_CACHEABLE = ["/", "/login", "/checkout"];

// Assets estáticos imutáveis (content-addressed por hash) que valem
// precachear no install para o segundo acesso ser instantâneo/offline.
// Lista vazia por padrão; os chunks _next/static são cacheados sob demanda
// via SWR no fetch handler.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // /offline é essencial — sempre tenta precachear.
      await cache.add(OFFLINE_URL).catch(() => {});
      // Páginas públicas prováveis (próximo destino do visitante): aquece
      // agora para funcionar offline imediatamente, sem esperar a 1ª visita.
      await Promise.all(
        SHELL_CACHEABLE.map((u) => cache.add(u).catch(() => {}))
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;
  // Não interferir em buscas RSC / prefetch do Next (payloads dinâmicos).
  if (req.headers.get("RSC") || req.headers.get("Next-Router-Prefetch")) return;

  // Navegações: network-first.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // Só cacheia páginas públicas (evita vazar conteúdo privado offline).
          if (SHELL_CACHEABLE.includes(url.pathname) && res.ok) {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return offline || Response.error();
        }
      })()
    );
    return;
  }

  // Assets estáticos: stale-while-revalidate.
  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    /\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|css|js)$/i.test(
      url.pathname
    );
  if (!isStatic) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const cache = caches.open(CACHE);
            cache.then((c) => c.put(req, res.clone()).catch(() => {}));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});