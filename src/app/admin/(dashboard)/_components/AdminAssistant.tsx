"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
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
  prepararVenta: "Armando la venta…",
  registrarVenta: "Registrando la venta…",
  cliente: "Buscando el cliente…",
  mejoresClientes: "Revisando los clientes…",
  inventarioYPrecios: "Revisando el inventario…",
  pendientes: "Viendo qué está pendiente…",
  gastosDelPeriodo: "Revisando los gastos…",
  opinionesDeClientes: "Leyendo las reseñas…",
  promocionesActivas: "Viendo las promociones…",
  tasaBcv: "Consultando la tasa…",
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

/** Lo que `registrarVenta` recibe: el borrador que armó `prepararVenta`. */
interface SaleDraftView {
  fecha: string;
  canal: "detal" | "mayor";
  cliente?: string;
  telefono?: string;
  metodoPago: string;
  entrega?: string;
  proveedorEntrega?: string;
  cobroEntregaUsd?: number;
  lineas: { producto: string; cantidad: number; precioUnitarioUsd: number }[];
  totalUsd: number;
  notas?: string;
}

interface SaleResultView {
  registrada: boolean;
  numero?: number | null;
  numeroDelMes?: number | null;
  error?: string;
}

type SalePart = {
  toolCallId: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string; approved?: boolean };
};

/** Las ventas que Bruno propuso en este mensaje. */
const saleParts = (message: UIMessage): SalePart[] =>
  message.parts
    .filter(isToolUIPart)
    .filter((part) => getToolName(part) === "registrarVenta") as SalePart[];

const money = (n: number) => `$${n.toFixed(2)}`;

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-VE", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/**
 * La venta que Bruno quiere registrar, tal como se va a guardar.
 *
 * Es el único punto donde el asistente escribe en la base, así que no alcanza
 * con que el modelo diga "¿la registro?": la tarjeta pinta el mismo borrador
 * que recibe el servidor, y nada se guarda hasta tocar "Registrar".
 */
function SaleApprovalCard({
  part,
  onRespond,
}: {
  part: SalePart;
  onRespond: (approved: boolean) => void;
}) {
  const draft = part.input as SaleDraftView | undefined;
  if (!draft?.lineas) return null;

  const result = part.output as SaleResultView | undefined;
  const status =
    part.state === "approval-requested"
      ? null
      : part.state === "output-available"
        ? result?.registrada
          ? `Registrada${result.numero ? ` · #${result.numero}` : ""}${result.numeroDelMes ? ` · ${result.numeroDelMes}.ª del mes` : ""}`
          : `No se registró: ${result?.error ?? "error desconocido"}`
        : part.state === "output-error"
          ? `No se registró: ${part.errorText ?? "error desconocido"}`
          : part.state === "output-denied" || part.approval?.approved === false
            ? "Cancelada: no se guardó."
            : "Registrando…";

  const delivery = [draft.entrega, draft.proveedorEntrega].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-black/15 bg-[#fbfaf8] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-[#787774]">
        Registrar venta{draft.canal === "mayor" ? " al mayor" : ""}
      </p>
      <p className="mt-0.5 font-medium first-letter:uppercase">{longDate(draft.fecha)}</p>
      {(draft.cliente || draft.telefono) && (
        <p className="text-[#5f5e5b]">
          {[draft.cliente, draft.telefono].filter(Boolean).join(" · ")}
        </p>
      )}
      <ul className="mt-2 space-y-0.5">
        {draft.lineas.map((line, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {line.cantidad}× {line.producto}
            </span>
            <span className="text-[#5f5e5b] tabular-nums">
              {money(line.cantidad * line.precioUnitarioUsd)}
            </span>
          </li>
        ))}
        {typeof draft.cobroEntregaUsd === "number" && draft.cobroEntregaUsd > 0 && (
          <li className="flex justify-between gap-3">
            <span>Delivery</span>
            <span className="text-[#5f5e5b] tabular-nums">{money(draft.cobroEntregaUsd)}</span>
          </li>
        )}
      </ul>
      <div className="mt-2 pt-2 border-t border-black/10 flex justify-between gap-3">
        <span className="text-[#5f5e5b]">
          {draft.metodoPago}
          {delivery && ` · ${delivery}`}
        </span>
        <span className="font-semibold tabular-nums">{money(draft.totalUsd)}</span>
      </div>
      {draft.notas && <p className="mt-1 text-xs text-[#787774]">{draft.notas}</p>}

      {status === null ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onRespond(true)}
            className="flex-1 h-9 rounded-full bg-[#37352f] text-white text-sm font-medium"
          >
            Registrar
          </button>
          <button
            type="button"
            onClick={() => onRespond(false)}
            className="flex-1 h-9 rounded-full border border-black/15 text-sm text-[#5f5e5b] hover:bg-black/5"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-[#5f5e5b]">{status}</p>
      )}
    </div>
  );
}

export default function AdminAssistant({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, addToolApprovalResponse } = useChat({
    transport: new DefaultChatTransport({ api: "/api/admin/chat" }),
    // Al aprobar o rechazar una venta, la conversación sigue sola: el servidor
    // la guarda (o no) y Bruno contesta, sin que haya que escribir nada.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
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
              inventario o cuentas, pídeme una cotización o dime una venta
              para registrarla. Leo los datos reales del panel.
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
          const sales = message.role === "assistant" ? saleParts(message) : [];
          if (!text && sales.length === 0) return null;

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
            <div key={message.id} className="group space-y-2">
              {sales.map((part) => (
                <SaleApprovalCard
                  key={part.toolCallId}
                  part={part}
                  onRespond={(approved) =>
                    part.approval &&
                    addToolApprovalResponse({ id: part.approval.id, approved })
                  }
                />
              ))}
              {text && (
              <div className="rounded-2xl rounded-bl-sm bg-white border border-black/10 px-3 py-2 whitespace-pre-wrap break-words">
                {formatted(text)}
              </div>
              )}
              {/* Copiar es el gesto principal: la mitad de lo que se le pide son
                  mensajes para mandarle a un cliente por WhatsApp. */}
              {text && (
                <div className="mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <CopyButton text={text} label="Copiar" className="h-7 px-2 text-xs" />
                </div>
              )}
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
