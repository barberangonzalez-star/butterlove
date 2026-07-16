"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import favicon from "@/app/icon.png";

function renderFormattedText(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*|https?:\/\/\S+)/g)
    .map((chunk, i) => {
      if (chunk.startsWith("**") && chunk.endsWith("**")) {
        return <strong key={i}>{chunk.slice(2, -2)}</strong>;
      }
      if (/^https?:\/\//.test(chunk)) {
        const trailing = chunk.match(/[.,!?)]+$/)?.[0] ?? "";
        const url = trailing ? chunk.slice(0, -trailing.length) : chunk;
        return (
          <span key={i}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {url}
            </a>
            {trailing}
          </span>
        );
      }
      return chunk;
    });
}

const DRAG_THRESHOLD = 4;
const PANEL_MAX_WIDTH = 352; // w-[22rem]
const PANEL_MAX_HEIGHT = 448; // h-[28rem]
const PANEL_GAP = 12; // mb-3
const BUBBLE_SIZE = 56; // w-14 h-14

// The panel is taller/wider than the closed bubble, so dragging the bubble
// must still leave enough room for the panel to fit on-screen once opened.
function getReservedSize() {
  return {
    width: Math.min(PANEL_MAX_WIDTH, window.innerWidth - 32),
    height:
      Math.min(PANEL_MAX_HEIGHT, window.innerHeight * 0.7) +
      PANEL_GAP +
      BUBBLE_SIZE,
  };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [isMobile, setIsMobile] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    startRect: DOMRect;
    dragged: boolean;
  } | null>(null);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  // Keep the widget on-screen if the viewport is resized (e.g. orientation change).
  useEffect(() => {
    const clampToViewport = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const reserved = getReservedSize();
      // The panel is bigger than the closed bubble and grows up/left from the
      // same bottom-right anchor, so the minimum left/top must leave room for
      // it even while only the small bubble is currently on screen.
      const minLeft = Math.max(0, reserved.width - rect.width);
      const minTop = Math.max(0, reserved.height - rect.height);
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      const clampedLeft = Math.min(Math.max(rect.left, minLeft), Math.max(maxX, minLeft));
      const clampedTop = Math.min(Math.max(rect.top, minTop), Math.max(maxY, minTop));
      const dx = clampedLeft - rect.left;
      const dy = clampedTop - rect.top;
      if (dx !== 0 || dy !== 0) {
        setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      }
    };
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, []);

  // Native window listeners (rather than React's onPointerMove/onPointerUp)
  // so every move is delivered even after the pointer leaves the element.
  const startDrag = (e: React.PointerEvent) => {
    if (!isMobile) return;
    const el = containerRef.current;
    if (!el) return;

    const pointerId = e.pointerId;
    const drag = {
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
      startRect: el.getBoundingClientRect(),
      dragged: false,
    };
    dragRef.current = drag;

    const handleMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - drag.startX;
      const dy = ev.clientY - drag.startY;
      if (
        !drag.dragged &&
        Math.abs(dx) < DRAG_THRESHOLD &&
        Math.abs(dy) < DRAG_THRESHOLD
      ) {
        return;
      }
      drag.dragged = true;

      const reserved = getReservedSize();
      const minLeft = Math.max(0, reserved.width - drag.startRect.width);
      const minTop = Math.max(0, reserved.height - drag.startRect.height);
      const maxX = window.innerWidth - drag.startRect.width;
      const maxY = window.innerHeight - drag.startRect.height;
      const newLeft = Math.min(
        Math.max(drag.startRect.left + dx, minLeft),
        Math.max(maxX, minLeft),
      );
      const newTop = Math.min(
        Math.max(drag.startRect.top + dy, minTop),
        Math.max(maxY, minTop),
      );

      setOffset({
        x: drag.originX + (newLeft - drag.startRect.left),
        y: drag.originY + (newTop - drag.startRect.top),
      });
    };

    const stopDrag = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  };

  const wasDragged = () => dragRef.current?.dragged ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col items-end"
      style={{
        transform:
          offset.x || offset.y
            ? `translate(${offset.x}px, ${offset.y}px)`
            : undefined,
      }}
    >
      {open && (
        <div className="mb-3 w-[min(22rem,calc(100vw-2rem))] h-[28rem] max-h-[70vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-ink/10">
          <div
            className="bg-ink text-cream px-4 py-3 flex items-center justify-between touch-none select-none"
            style={{ cursor: isMobile ? "grab" : undefined }}
            onPointerDown={startDrag}
          >
            <span className="font-display font-semibold text-sm">
              Butter Love · Asistente
            </span>
            <button
              onClick={() => setOpen(false)}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Cerrar chat"
              className="text-cream/80 hover:text-cream text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
            {messages.length === 0 && (
              <p className="text-ink-soft">
                ¡Hola! Pregúntame sobre nuestras mantequillas de maní,
                pistacho, almendras o merey, precios o cómo hacer tu pedido.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : "flex justify-start"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "bg-ink text-cream rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%]"
                      : "bg-cream text-ink rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%]"
                  }
                >
                  {message.parts.map((part, i) =>
                    part.type === "text" ? (
                      <span key={i} className="whitespace-pre-wrap">
                        {renderFormattedText(part.text)}
                      </span>
                    ) : null,
                  )}
                </div>
              </div>
            ))}
            {(status === "submitted" || status === "streaming") &&
              messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-cream text-ink-soft rounded-2xl rounded-bl-sm px-3 py-2 text-xs">
                    Escribiendo…
                  </div>
                </div>
              )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-ink/10 px-3 py-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status !== "ready"}
              placeholder="Escribe tu pregunta…"
              className="flex-1 text-sm px-3 py-2 rounded-full bg-cream text-ink placeholder:text-ink-soft focus:outline-none"
            />
            <button
              type="submit"
              disabled={status !== "ready" || !input.trim()}
              className="bg-ink text-cream rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => {
          if (wasDragged()) return;
          setOpen((v) => !v);
        }}
        onPointerDown={startDrag}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="relative w-14 h-14 rounded-full bg-ink text-cream shadow-lg flex items-center justify-center hover:scale-105 transition-transform overflow-hidden touch-none select-none"
      >
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <Image
            src={favicon}
            alt=""
            fill
            sizes="56px"
            draggable={false}
            className="object-cover select-none [-webkit-user-drag:none]"
          />
        )}
      </button>
    </div>
  );
}
