"use client";

import { useEffect } from "react";

/**
 * Registra el service worker del panel. Solo en producción: en desarrollo los
 * chunks de Next cambian sin cambiar de nombre y una caché los dejaría viejos,
 * así que ahí lo que hacemos es desregistrar cualquiera que haya quedado.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) registration.unregister();
      });
      return;
    }

    navigator.serviceWorker
      .register("/admin-sw.js", { scope: "/admin", updateViaCache: "none" })
      .catch((error) => {
        console.error("No se pudo registrar el service worker", error);
      });
  }, []);

  return null;
}
