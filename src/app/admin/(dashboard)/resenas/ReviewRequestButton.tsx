"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { markReviewRequestedAction } from "./actions";

/**
 * Pedirle la reseña a una venta: abre WhatsApp con el mensaje y el enlace ya
 * escritos, o los copia para mandarlos por otro lado cuando el teléfono no
 * sirve para WhatsApp. Se usa en Reseñas y en la ficha de cada cliente.
 */
export default function ReviewRequestButton({
  saleId,
  whatsappHref,
  message,
  askedLabel,
  reviewed,
}: {
  saleId: number;
  whatsappHref: string | null;
  message: string;
  /** DD/MM de la última vez que se pidió, o null si nunca. */
  askedLabel: string | null;
  reviewed: boolean;
}) {
  const [asked, setAsked] = useState(askedLabel);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const mark = () => {
    setAsked("hoy");
    // Se anota sin esperar: WhatsApp ya se abrió en otra pestaña, y si esto
    // falla lo único que se pierde es la marca de "ya se la pediste".
    markReviewRequestedAction(saleId).catch(() => {});
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setCopyFailed(false);
      mark();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {whatsappHref && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={mark}
          className="h-9 inline-flex items-center gap-1.5 rounded-md bg-[#1f7a4d] px-3 text-sm font-medium text-white hover:opacity-90"
        >
          <MessageCircle size={15} aria-hidden="true" />
          {asked ? "Volver a pedir" : "Pedir por WhatsApp"}
        </a>
      )}
      <button
        type="button"
        onClick={copy}
        className="h-9 inline-flex items-center gap-1.5 rounded-md border border-black/15 px-3 text-sm text-[#37352f] hover:bg-black/5"
      >
        {copied ? (
          <Check size={15} aria-hidden="true" />
        ) : (
          <Copy size={15} aria-hidden="true" />
        )}
        {copied ? "Copiado" : "Copiar mensaje"}
      </button>
      {reviewed ? (
        <span className="text-xs font-medium text-green-800">Ya opinó</span>
      ) : asked ? (
        <span className="text-xs text-[#787774]">
          Pedida {asked === "hoy" ? "hoy" : `el ${asked}`}
        </span>
      ) : null}
      {copyFailed && (
        <span className="text-xs text-red-600">No se pudo copiar.</span>
      )}
    </div>
  );
}
