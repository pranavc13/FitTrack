/* FitTrack AI service worker.
 * - App shell + static assets: cache-first with versioned cache (old caches purged on activate).
 * - API GETs: network-first, falling back to the last cached response so dashboards, diaries,
 *   recent foods and recipes stay viewable offline. Responses are marked with X-From-Cache.
 * - Mutations are NOT cached here; the page queues them in IndexedDB and replays on reconnect.
 *   This worker triggers that replay via Background Sync where the browser supports it.
 * - AI scanning and other cloud features require connectivity; offline requests fail fast.
 */
const VERSION = "v3";
const SHELL = `fittrack-shell-${VERSION}`;
const RUNTIME = `fittrack-runtime-${VERSION}`;
const API = `fittrack-api-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

// API reads worth keeping for offline viewing (others are network-only).
const CACHEABLE_API = [/^\/api\/v1\/(dashboard|diary|foods\/recent|foods\/search|foods\/\d+|recipes|insights|body\/weight|wellness|activities|workouts\/next|goals|auth\/me|profile|exercises)/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME, API].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstApi(request) {
  const cache = await caches.open(API);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-From-Cache", "1");
      return new Response(await cached.blob(), { status: 200, headers });
    }
    return new Response(JSON.stringify({ error: "You're offline and this data hasn't been loaded before." }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
}

async function pageNetworkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const res = await fetch(request);
    if (res.ok && res.type === "basic") cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request)) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    if (url.pathname.startsWith("/api/v1/files/")) return; // private images: browser HTTP cache only
    if (CACHEABLE_API.some((re) => re.test(url.pathname))) event.respondWith(networkFirstApi(request));
    return;
  }
  // Only content-hashed build files are safe to serve from cache; dev-server chunks keep the same URL.
  if (url.pathname.startsWith("/_next/static/") && !/[-.][0-9a-f]{8,}\.(js|css)$|\/media\//.test(url.pathname)) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|png|svg|ico)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  if (request.mode === "navigate") event.respondWith(pageNetworkFirst(request));
});

// Background Sync: ask open pages to flush their IndexedDB queue.
self.addEventListener("sync", (event) => {
  if (event.tag === "fittrack-sync") {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => clients.forEach((c) => c.postMessage({ type: "flush-queue" }))),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "FitTrack AI", body: "", url: "/home" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png", tag: data.tag, data: { url: data.url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/home";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => new URL(c.url).origin === self.location.origin);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-api-cache") event.waitUntil(caches.delete(API));
});
