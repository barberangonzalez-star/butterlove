// Service worker del panel de administración (scope: /admin).
//
// Regla principal: los datos del panel (ventas, inventario, stock) NUNCA se
// cachean. Mostrar una venta o un stock viejo es peor que no mostrar nada, así
// que el HTML y las respuestas del servidor siempre van a la red. Solo se
// cachean los assets inmutables de Next y la pantalla de "sin conexión".
//
// Sube CACHE_VERSION para invalidar todo lo cacheado en el próximo deploy.
const CACHE_VERSION = "v2";
const CACHE_NAME = `bl-admin-${CACHE_VERSION}`;

const OFFLINE_URL = "/admin-offline.html";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/admin-192.png",
  "/icons/admin-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("bl-admin-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// Los assets de /_next/static llevan hash en el nombre, así que son inmutables
// y se pueden servir desde caché sin riesgo de quedar desactualizados.
function isImmutableAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Server Actions y cualquier mutación van directo a la red.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const offline = await cache.match(OFFLINE_URL);
          return (
            offline ??
            new Response("Sin conexión", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;

        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })()
    );
  }

  // Todo lo demás (RSC, API, imágenes de productos) pasa sin tocar la caché.
});

// El aviso de que entró un pedido por la tienda. Lo manda el servidor con
// `web-push` y llega aunque el panel esté cerrado: es la única forma de
// enterarse de una venta sin tener la app abierta.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Un payload que no es JSON no puede tumbar la notificación: se muestra
    // genérica y quien la reciba entra a ver.
  }

  const title = data.title || "Butter Love";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "Entró un pedido nuevo.",
      icon: "/icons/admin-192.png",
      badge: "/icons/admin-192.png",
      // Cada pedido trae su propio tag, así que dos seguidos son dos avisos y
      // no uno que se come al anterior.
      tag: data.tag,
      data: { url: data.url || "/admin/ventas" },
      // Que no se descarte sola: un pedido esperando es algo que hay que
      // atender, no un aviso de paso.
      requireInteraction: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/ventas";

  event.waitUntil(
    (async () => {
      // Si el panel ya está abierto se reusa esa ventana: abrir una segunda
      // deja al teléfono con dos copias de la misma app.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url.includes("/admin")) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
