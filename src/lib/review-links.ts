import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_URL } from "./config";
import { whatsappLink } from "./customers";
import type { ReviewRef } from "./reviews";

/**
 * El enlace que se le manda a alguien para que opine.
 *
 * No se guarda en la base: es el número de la venta —o del enlace hecho a
 * mano— firmado con SESSION_SECRET. Así el panel puede mostrar el enlace sin
 * crear nada antes, y nadie puede inventarse el de otra persona cambiando el
 * número. Si algún día se cambia SESSION_SECRET, los enlaces ya mandados dejan
 * de abrir.
 *
 * Los de venta son `<número>-<firma>` y los hechos a mano llevan una `i`
 * delante. Cada tipo se firma con un texto distinto, así que un enlace de uno
 * nunca abre como el otro aunque los números coincidan.
 */
const SIGNATURE_LENGTH = 16;

function sign(ref: ReviewRef) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET no está configurado");
  // "review:" es el texto con el que se firmaron los primeros enlaces de
  // venta: cambiarlo invalidaría los que ya se mandaron.
  const subject = ref.kind === "sale" ? `review:${ref.id}` : `invite:${ref.id}`;
  return createHmac("sha256", secret)
    .update(subject)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

function signatureMatches(ref: ReviewRef, signature: string) {
  if (!Number.isSafeInteger(ref.id) || ref.id <= 0) return false;
  const expected = Buffer.from(sign(ref));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function reviewToken(ref: ReviewRef) {
  const prefix = ref.kind === "invite" ? "i" : "";
  return `${prefix}${ref.id.toString(36)}-${sign(ref)}`;
}

/** De quién es el enlace, o null si está mal copiado o es inventado. */
export function parseReviewToken(token: string): ReviewRef | null {
  const match = /^(i?)([0-9a-z]{1,10})-([\w-]{16})$/.exec(token);
  if (!match) return null;
  const [, prefix, digits, signature] = match;

  // Una venta cuyo número en base 36 empieza por "i" también encaja con la
  // forma de los hechos a mano, así que se prueban los dos: la firma decide.
  const candidates: ReviewRef[] = prefix
    ? [
        { kind: "invite", id: parseInt(digits, 36) },
        { kind: "sale", id: parseInt(`${prefix}${digits}`, 36) },
      ]
    : [{ kind: "sale", id: parseInt(digits, 36) }];

  return candidates.find((ref) => signatureMatches(ref, signature)) ?? null;
}

export interface ReviewRequestLinks {
  url: string;
  /** El mensaje completo, con el enlace: es lo que se copia si no hay WhatsApp. */
  message: string;
  /** WhatsApp con el mensaje ya escrito, o null si el teléfono no sirve para eso. */
  whatsappHref: string | null;
}

function requestLinks(
  ref: ReviewRef,
  customerName: string | null,
  customerPhone: string | null,
): ReviewRequestLinks {
  const url = `${SITE_URL}/opinar/${reviewToken(ref)}`;
  const firstName = customerName?.trim().split(/\s+/)[0];
  const message = [
    `¡Hola${firstName ? ` ${firstName}` : ""}! Gracias por comprar en Butter Love 🧈`,
    "¿Qué tal te pareció tu Butter Love? Tu opinión nos ayuda muchísimo y toma menos de un minuto:",
    url,
  ].join("\n");
  const wa = whatsappLink(customerPhone);

  return {
    url,
    message,
    whatsappHref: wa ? `${wa}?text=${encodeURIComponent(message)}` : null,
  };
}

export function reviewRequestLinks(sale: {
  id: number;
  customerName: string | null;
  customerPhone: string | null;
}): ReviewRequestLinks {
  return requestLinks({ kind: "sale", id: sale.id }, sale.customerName, sale.customerPhone);
}

export function inviteRequestLinks(invite: {
  id: number;
  customerName: string;
  customerPhone: string | null;
}): ReviewRequestLinks {
  return requestLinks(
    { kind: "invite", id: invite.id },
    invite.customerName,
    invite.customerPhone,
  );
}
