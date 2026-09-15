import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "./config";
import { whatsappLink } from "./customers";

/**
 * El enlace que se le manda a quien compró para que opine.
 *
 * No se guarda en la base: es el número de la venta firmado con
 * SESSION_SECRET. Así el panel puede mostrar el enlace de cualquier venta sin
 * crear nada antes, y nadie puede inventarse el de otra venta cambiando el
 * número. Si algún día se cambia SESSION_SECRET, los enlaces ya mandados dejan
 * de abrir.
 */
const SIGNATURE_LENGTH = 16;

function sign(saleId: number) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurado");
  return createHmac("sha256", secret)
    .update(`review:${saleId}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function reviewToken(saleId: number) {
  return `${saleId.toString(36)}-${sign(saleId)}`;
}

/** La venta del enlace, o null si el enlace está mal copiado o es inventado. */
export function saleIdFromReviewToken(token: string): number | null {
  const match = /^([0-9a-z]{1,10})-([\w-]{16})$/.exec(token);
  if (!match) return null;
  const saleId = parseInt(match[1], 36);
  if (!Number.isSafeInteger(saleId) || saleId <= 0) return null;

  const expected = Buffer.from(sign(saleId));
  const received = Buffer.from(match[2]);
  return expected.length === received.length && timingSafeEqual(expected, received)
    ? saleId
    : null;
}

export interface ReviewRequestLinks {
  url: string;
  /** El mensaje completo, con el enlace: es lo que se copia si no hay WhatsApp. */
  message: string;
  /** WhatsApp con el mensaje ya escrito, o null si el teléfono no sirve para eso. */
  whatsappHref: string | null;
}

export function reviewRequestLinks(sale: {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
}): ReviewRequestLinks {
  const url = `${SITE_URL}/opinar/${reviewToken(sale.id)}`;
  const firstName = sale.customerName?.trim().split(/\s+/)[0];
  const message = [
    `¡Hola${firstName ? ` ${firstName}` : ""}! Gracias por comprar en Butter Love 🧈`,
    "¿Qué tal te pareció tu pedido? Tu opinión nos ayuda muchísimo y toma menos de un minuto:",
    url,
  ].join("\n");
  const wa = whatsappLink(sale.customerPhone);

  return {
    url,
    message,
    whatsappHref: wa ? `${wa}?text=${encodeURIComponent(message)}` : null,
  };
}
