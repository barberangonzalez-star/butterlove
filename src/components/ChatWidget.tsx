"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

function renderFormattedText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith("**") && chunk.endsWith("**") ? (
      <strong key={i}>{chunk.slice(2, -2)}</strong>
    ) : (
      chunk
    ),
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[min(22rem,calc(100vw-2rem))] h-[28rem] max-h-[70vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-ink/10">
          <div className="bg-ink text-cream px-4 py-3 flex items-center justify-between">
            <span className="font-display font-semibold text-sm">
              Butter Love · Asistente
            </span>
            <button
              onClick={() => setOpen(false)}
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
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className="w-14 h-14 rounded-full bg-ink text-cream shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
