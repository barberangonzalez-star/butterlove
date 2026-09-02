"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { VAPID_PUBLIC_KEY } from "@/lib/config";
import { subscribeToPushAction, unsubscribeFromPushAction } from "./actions";

/**
 * La llave pública viaja en base64url y el navegador la pide en bytes.
 * Convertirla es el único paso raro de todo el proceso de suscripción.
 */
function toApplicationServerKey(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * El service worker del panel, si está registrado.
 *
 * En desarrollo no se registra a propósito (`ServiceWorkerRegistrar`), así que
 * acá devuelve null y el botón lo dice en vez de quedarse esperando para
 * siempre a `serviceWorker.ready`, que en ese caso nunca resuelve.
 */
async function adminRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration("/admin")) ?? null;
}

type State =
  | "cargando"
  | "no-soportado"
  | "sin-service-worker"
  | "bloqueado"
  | "apagado"
  | "encendido";

/**
 * Enciende los avisos de pedidos en este teléfono.
 *
 * Es por dispositivo y no por cuenta: cada teléfono que quiera enterarse tiene
 * que activarlo una vez, porque la suscripción la emite el navegador, no el
 * servidor. En iPhone además hace falta que el panel esté instalado en la
 * pantalla de inicio — Safari no deja suscribirse desde una pestaña.
 */
export default function PushToggle({ className }: { className?: string }) {
  const [state, setState] = useState<State>("cargando");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (
        typeof window === "undefined" ||
        !("Notification" in window) ||
        !("PushManager" in window) ||
        !("serviceWorker" in navigator)
      ) {
        if (!cancelled) setState("no-soportado");
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("bloqueado");
        return;
      }

      const registration = await adminRegistration();
      if (cancelled) return;
      if (!registration) {
        setState("sin-service-worker");
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) setState(subscription ? "encendido" : "apagado");
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function encender() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "bloqueado" : "apagado");
        return;
      }

      const registration = await adminRegistration();
      if (!registration) {
        setState("sin-service-worker");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        // Obligatorio en todos los navegadores: cada push tiene que mostrar
        // algo. No se puede usar para trabajar en silencio, y está bien así.
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      await subscribeToPushAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });
      setState("encendido");
    } catch (error) {
      console.error("No se pudieron activar las notificaciones", error);
      setState("apagado");
    } finally {
      setBusy(false);
    }
  }

  async function apagar() {
    setBusy(true);
    try {
      const registration = await adminRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        // Primero el servidor: si se cancela local y falla el borrado, el
        // servidor seguiría mandando avisos a un endpoint muerto.
        await unsubscribeFromPushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("apagado");
    } catch (error) {
      console.error("No se pudieron desactivar las notificaciones", error);
    } finally {
      setBusy(false);
    }
  }

  if (state === "cargando" || state === "no-soportado") return null;

  const label = {
    encendido: "Avisos activados",
    apagado: "Activar avisos",
    bloqueado: "Avisos bloqueados",
    "sin-service-worker": "Avisos no disponibles",
  }[state];

  const Icon =
    state === "encendido" ? BellRing : state === "apagado" ? Bell : BellOff;

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy || state === "bloqueado" || state === "sin-service-worker"}
        onClick={() => (state === "encendido" ? apagar() : encender())}
        className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors disabled:cursor-default ${
          state === "encendido"
            ? "text-[#37352f] hover:bg-black/5"
            : "text-[#5f5e5b] hover:bg-black/5 hover:text-[#37352f]"
        } ${busy ? "opacity-50" : ""}`}
      >
        <Icon size={16} strokeWidth={2} />
        {label}
      </button>

      {state === "bloqueado" && (
        <p className="px-3 pb-1 text-xs leading-relaxed text-[#787774]">
          Este teléfono tiene las notificaciones bloqueadas para el sitio.
          Actívalas en los ajustes del navegador.
        </p>
      )}

      {state === "sin-service-worker" && (
        <p className="px-3 pb-1 text-xs leading-relaxed text-[#787774]">
          Sólo funcionan en el sitio publicado. En iPhone, además, con el panel
          instalado en la pantalla de inicio.
        </p>
      )}
    </div>
  );
}
