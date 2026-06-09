/// <reference lib="webworker" />

const CACHE_VERSION = "ai-photo-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSET =
  /\.(?:png|jpe?g|webp|gif|svg|ico|mp4|webm|woff2?|ttf|otf|css|js|json)$/i;

/** @param {FetchEvent} event */
function isApiRequest(event) {
  const url = new URL(event.request.url);
  return url.pathname.startsWith("/api/");
}

/** @param {Request} request */
function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

/** @param {Request} request */
function isStaticAssetRequest(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/precache-manifest.json")) return false;
  return STATIC_ASSET.test(url.pathname);
}

/** @param {Request} request */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      let manifest = [];

      try {
        const response = await fetch("/precache-manifest.json", { cache: "no-store" });
        if (response.ok) {
          manifest = await response.json();
        }
      } catch {
        // Manifest optional during first deploy.
      }

      await Promise.allSettled(
        manifest.map(async (assetPath) => {
          try {
            const response = await fetch(assetPath, { cache: "reload" });
            if (response.ok) {
              await cache.put(assetPath, response);
            }
          } catch {
            // Skip missing assets silently.
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("ai-photo-") && !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!isSameOrigin(request)) return;
  if (isApiRequest(event)) return;

  if (isStaticAssetRequest(request)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
  }
});
