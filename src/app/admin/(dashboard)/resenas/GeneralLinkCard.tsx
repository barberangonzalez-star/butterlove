"use client";

import { ExternalLink, Globe, MessageCircle } from "lucide-react";
import CopyButton from "../_components/CopyButton";
import type { ReviewRequestLinks } from "@/lib/review-links";

/**
 * El enlace general, siempre a la vista. Es uno solo y no cambia nunca, así
 * que la tarjeta no crea nada: sólo lo muestra listo para copiar, mandar por
 * WhatsApp o pegar en la bio de Instagram.
 *
 * Lo que llega por acá no se marca como compra verificada, y el aviso lo dice
 * para que no sorprenda al ver la reseña en el panel.
 */
export default function GeneralLinkCard({ links }: { links: ReviewRequestLinks }) {
  return (
    <div className="mb-4 rounded-lg border border-black/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-[#37352f] text-white">
          <Globe size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">Enlace general</p>
          <p className="text-xs text-[#787774]">
            Para quien sea: historias, la bio de Instagram, un grupo. Pide el
            primer nombre, las estrellas y el comentario.
          </p>
        </div>
      </div>

      <input
        readOnly
        value={links.url}
        onFocus={(e) => e.target.select()}
        aria-label="Enlace general para opinar"
        className="mt-3 w-full rounded-md border border-black/15 bg-black/[0.02] px-2.5 py-2 text-sm text-[#5f5e5b] outline-none focus:border-[#37352f]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {links.whatsappHref && (
          <a
            href={links.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 inline-flex items-center gap-1.5 rounded-md bg-[#1f7a4d] px-3 text-sm font-medium text-white hover:opacity-90"
          >
            <MessageCircle size={15} aria-hidden="true" />
            Enviar por WhatsApp
          </a>
        )}
        <CopyButton text={links.message} label="Copiar mensaje" />
        <CopyButton text={links.url} label="Copiar enlace" />
        <a
          href={links.url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 inline-flex items-center justify-center gap-1.5 rounded-md border border-black/15 px-3 text-sm text-[#37352f] hover:bg-black/5 sm:ml-auto"
        >
          <ExternalLink size={15} aria-hidden="true" />
          Ver cómo se ve
        </a>
      </div>

      <p className="mt-3 text-xs text-[#787774]">
        Cualquiera puede abrirlo, así que estas reseñas no salen como “compra
        verificada”. Como todas, esperan tu aprobación.
      </p>
    </div>
  );
}
