"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// `beforeinstallprompt` se dispara una sola vez en window. El botón vive en dos
// sitios (barra lateral y menú móvil) y el del menú se monta al abrirlo, o sea
// después del evento, así que el evento se guarda aquí y no en cada instancia.
// Sin esto el botón nunca aparecería en el teléfono, que es justo donde importa.
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const subscribers = new Set<() => void>();

function notify() {
  for (const subscriber of subscribers) subscriber();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  // La app instalada se abre en su propia ventana, así que esta pestaña sigue
  // en el navegador: hay que ocultar el botón a mano.
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installed = true;
    notify();
  });
}

function subscribe(onChange: () => void) {
  subscribers.add(onChange);
  return () => {
    subscribers.delete(onChange);
  };
}

const getPrompt = () => deferredPrompt;
const getInstalled = () => installed;

const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeToDisplayMode(onChange: () => void) {
  const query = window.matchMedia(STANDALONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isStandalone() {
  return (
    window.matchMedia(STANDALONE_QUERY).matches ||
    // Safari en iOS no reporta display-mode; usa esta bandera propia.
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function neverChanges() {
  return () => {};
}

function isIosDevice() {
  const ua = navigator.userAgent;
  // El iPad se identifica como Mac desde iPadOS 13, se delata por el táctil.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

// En el servidor no sabemos nada del dispositivo: devolvemos lo que hace que el
// botón no se renderice, y así no parpadea al hidratar.
const alreadyInstalled = () => true;
const noPrompt = () => null;
const notIos = () => false;

/**
 * Botón para instalar el panel en el teléfono. En Android/Chrome dispara el
 * prompt nativo; en iOS ese prompt no existe, así que explicamos el camino
 * manual por el menú Compartir.
 */
export default function InstallPrompt({ className }: { className?: string }) {
  const standalone = useSyncExternalStore(
    subscribeToDisplayMode,
    isStandalone,
    alreadyInstalled
  );
  const wasInstalled = useSyncExternalStore(
    subscribe,
    getInstalled,
    alreadyInstalled
  );
  const prompt = useSyncExternalStore(subscribe, getPrompt, noPrompt);
  const ios = useSyncExternalStore(neverChanges, isIosDevice, notIos);

  const [showIosSteps, setShowIosSteps] = useState(false);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Un prompt nativo solo se puede usar una vez.
    deferredPrompt = null;
    notify();
  }

  if (standalone || wasInstalled) return null;
  if (!prompt && !ios) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (ios ? setShowIosSteps((open) => !open) : install())}
        aria-expanded={ios ? showIosSteps : undefined}
        className="w-full flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-[#5f5e5b] hover:bg-black/5 hover:text-[#37352f] transition-colors"
      >
        <Download size={16} strokeWidth={2} />
        Instalar app
      </button>

      {ios && showIosSteps && (
        <p className="px-3 pb-1 text-xs leading-relaxed text-[#787774]">
          Toca <Share size={12} className="inline align-[-1px]" aria-hidden />{" "}
          Compartir en la barra de Safari y luego{" "}
          <span className="font-medium text-[#37352f]">
            Agregar a pantalla de inicio
          </span>
          .
        </p>
      )}
    </div>
  );
}
