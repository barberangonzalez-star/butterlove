"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { ArrowUp, PanelRightClose } from "lucide-react";
import CopyButton from "./CopyButton";
import { ASSISTANT_EMOJI, ASSISTANT_NAME } from "./assistant-identity";

/**
 * Qué decir mientras corre cada consulta. Sin esto el panel se queda mudo unos
 * segundos y parece colgado: el modelo primero pide datos y sólo después
 * escribe, así que el silencio es justo la parte más lenta.
 */
const TOOL_LABELS: Record<string, string> = {
  ventasDelPeriodo: "Revisando las ventas…",
  reporteFinanciero: "Armando el reporte…",
  listarVentas: "Buscando las ventas…",
  patronPorDia: "Cruzando las ventas por día…",
  armarCotizacion: "Armando la cotización…",
  cliente: "Buscando el cliente…",
  mejoresClientes: "Revisando los clientes…",
  inventarioYPrecios: "Revisando el inventario…",
  pendientes: "Viendo qué está pendiente…",
  gastosDelPeriodo: "Revisando los gastos…",
  opinionesDeClientes: "Leyendo las reseñas…",
  promocionesActivas: "Viendo las promociones…",
};

/** Lo que se ofrece con el chat en blanco, para no arrancar de cero. */
const SUGGESTIONS = [
  "¿Cuánto vendí este mes?",
  "¿Cuál es mi sabor más vendido?",
  "¿De qué me queda poco?",
  "¿Qué tengo pendiente?",
];

/** Negrillas y saltos de línea. No hay markdown completo, y no hace falta. */
function formatted(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith("**") && chunk.endsWith("**") ? (
      <strong key={i}>{chunk.slice(2, -2)}</strong>
    ) : (
      chunk
    ),
  );
}

const textOf = (message: { parts: { type: string }[] }) =>
  message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

export default function AdminAssistant({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/chat" }),
  });
  const endRef = useRef<HTMLDivElement>(null);

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    sendMessage({ text: clean });
    setInput("");
  };

  const last = messages[messages.length - 1];
  // Sólo se avisa de la consulta en curso, la del último mensaje: las de los
  // mensajes ya respondidos no aportan nada.
  const running =
    busy && last?.role === "assistant"
      ? last.parts
          .filter(isToolUIPart)
          .filter((part) => part.state !== "output-available" && part.state !== "output-error")
          .map((part) => TOOL_LABELS[getToolName(part)] ?? "Consultando…")
          .at(-1)
      : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-black/10">
        <span className="text-lg leading-none" aria-hidden="true">
          {ASSISTANT_EMOJI}
        </span>
        <span className="font-semibold text-sm flex-1 truncate">{ASSISTANT_NAME}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Cerrar a ${ASSISTANT_NAME}`}
          className="w-9 h-9 flex items-center justify-center rounded-md text-[#5f5e5b] hover:bg-black/5"
        >
          <PanelRightClose size={18} />
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3 text-sm">
        {messages.length === 0 && (
          <div>
            <p className="text-[#787774]">
              Soy {ASSISTANT_NAME}. Pregúntame por tus ventas, clientes,
              inventario o cuentas, o pídeme una cotización. Leo los datos
              reales del panel.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-black/15 px-3 py-1.5 text-xs text-[#5f5e5b] hover:bg-black/5 text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = textOf(message);
          if (!text) return null;

          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-[#37352f] px-3 py-2 text-white break-words">
                  {text}
                </div>
              </div>
            );
          }

          return (
            <div key={message.id} className="group">
              <div className="rounded-2xl rounded-bl-sm bg-white border border-black/10 px-3 py-2 whitespace-pre-wrap break-words">
                {formatted(text)}
              </div>
              {/* Copiar es el gesto principal: la mitad de lo que se le pide son
                  mensajes para mandarle a un cliente por WhatsApp. */}
              <div className="mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <CopyButton text={text} label="Copiar" className="h-7 px-2 text-xs" />
              </div>
            </div>
          );
        })}

        {busy && (
          <p className="text-xs text-[#787774] animate-pulse">
            {running ?? "Pensando…"}
          </p>
        )}

        <div ref={endRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="shrink-0 border-t border-black/10 p-2 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            // Enter manda y Shift+Enter hace un renglón: lo que ya espera
            // cualquiera que haya escrito en un chat.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Pregunta sobre tu negocio…"
          className="flex-1 max-h-32 resize-none rounded-xl border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#37352f]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Enviar"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[#37352f] text-white disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
      </form>
    </div>
  );
}
