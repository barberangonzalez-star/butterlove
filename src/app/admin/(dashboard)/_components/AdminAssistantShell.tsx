"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { Sparkles } from "lucide-react";
import AdminAssistant from "./AdminAssistant";

const STORAGE_KEY = "butterlove:asistente-abierto";

/**
 * Si el asistente quedó abierto, guardado en el navegador.
 *
 * Vive en `localStorage` y no en un estado normal porque tiene que sobrevivir a
 * cada navegación del panel: entrar a Ventas no debería cerrarlo. Y se lee con
 * `useSyncExternalStore` porque eso es exactamente lo que es —un almacén de
 * fuera de React—: así el servidor renderiza "cerrado" y el navegador corrige
 * al montar, sin efectos que disparen renders en cascada.
 *
 * Todo va en try/catch: en una ventana privada o con el almacenamiento
 * bloqueado, leer o escribir lanza.
 */
let listeners: (() => void)[] = [];

function readOpen() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function writeOpen(open: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  } catch {
    // Que no se recuerde no es razón para no abrirlo ahora.
  }
  for (const listener of listeners) listener();
}

interface AssistantState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AssistantContext = createContext<AssistantState | null>(null);

/**
 * Para que el menú lateral pueda abrir el asistente. Devuelve null fuera del
 * shell en vez de reventar: así un componente del panel puede preguntar sin
 * tener que saber si está dentro.
 */
export function useAdminAssistant() {
  return useContext(AssistantContext);
}

/**
 * El marco del panel con el asistente al lado.
 *
 * El estado vive acá porque lo comparten tres cosas: la entrada del menú, el
 * botón flotante del teléfono y el panel mismo.
 *
 * El panel se esconde con CSS en vez de desmontarse, y por eso la conversación
 * sigue ahí al contraerlo y volverlo a abrir. Perder el hilo por cerrar un
 * momento para ver una tabla sería el peor detalle posible en algo que se usa
 * justo mientras se mira el panel.
 *
 * `nav` llega como prop en vez de como hijo porque el ancho del contenido
 * depende de si el asistente está abierto, y ese cálculo es de acá.
 */
export default function AdminAssistantShell({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  // En el servidor siempre cerrado: allá no hay dónde haberlo guardado.
  const open = useSyncExternalStore(subscribe, readOpen, () => false);

  return (
    <AssistantContext.Provider value={{ open, setOpen: writeOpen }}>
      <div className="min-h-dvh bg-[#fbfaf8] text-[#37352f]">
        {nav}

        {/* En PC el asistente corre el contenido en vez de taparlo, igual que
            el menú de la izquierda. Sobre una tabla de ventas, un panel encima
            esconde justo lo que se está preguntando. */}
        <div
          className={`lg:pl-60 transition-[padding] duration-200 ${
            open ? "lg:pr-[26rem]" : ""
          }`}
        >
          <main className="min-w-0 px-4 pt-[4.5rem] pb-12 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>

        {/* En el teléfono el asistente se abre a pantalla completa: 26rem de
            panel no dejarían nada del panel debajo. */}
        <div
          className={`${
            open ? "flex" : "hidden"
          } fixed inset-0 z-50 flex-col bg-[#fbfaf8] lg:inset-y-0 lg:left-auto lg:right-0 lg:z-30 lg:w-[26rem] lg:border-l lg:border-black/10 lg:bg-[#f7f6f4]`}
        >
          <AdminAssistant onClose={() => writeOpen(false)} />
        </div>

        {!open && (
          <button
            type="button"
            onClick={() => writeOpen(true)}
            aria-label="Abrir asistente"
            className="lg:hidden fixed bottom-5 right-5 z-40 w-14 h-14 flex items-center justify-center rounded-full bg-[#37352f] text-white shadow-lg active:scale-95 transition-transform"
          >
            <Sparkles size={22} />
          </button>
        )}

        {/* En PC, con el panel contraído, queda una pestaña discreta al borde:
            sin ella el asistente sólo se abriría desde el menú. */}
        {!open && (
          <button
            type="button"
            onClick={() => writeOpen(true)}
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 items-center gap-1.5 rounded-l-lg border border-r-0 border-black/10 bg-white py-3 pl-3 pr-2 text-xs font-medium text-[#5f5e5b] shadow-sm hover:bg-black/[0.03]"
          >
            <Sparkles size={14} className="text-[#b4700a]" aria-hidden="true" />
            <span className="[writing-mode:vertical-rl] rotate-180">Asistente</span>
          </button>
        )}
      </div>
    </AssistantContext.Provider>
  );
}
