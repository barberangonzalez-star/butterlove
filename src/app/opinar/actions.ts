"use server";

import { parseReviewToken } from "@/lib/review-links";
import {
  countRecentGeneralReviews,
  createReviews,
  getReviewTarget,
} from "@/lib/reviews-data";
import { sendAdminPush } from "@/lib/push";
import {
  publicAuthorName,
  REVIEW_COMMENT_MAX,
  REVIEW_COMMENT_MIN,
  REVIEW_NAME_MAX,
  type ReviewOrigin,
} from "@/lib/reviews";

export type SubmitReviewsResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): SubmitReviewsResult => ({ ok: false, error });

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/**
 * Cuántas reseñas del enlace general se aceptan por hora.
 *
 * Es el único enlace que abre cualquiera, así que es el único por el que se
 * pueden meter mil reseñas inventadas en un rato. No protege la tienda —nada
 * se publica sin aprobarlo— sino el panel y el teléfono, que se llenarían de
 * avisos. El tope es alto a propósito: mandar el enlace a una lista de difusión
 * y que contesten veinte personas seguidas es exactamente para lo que es.
 */
const GENERAL_PER_HOUR = 40;

/**
 * Lo que manda el formulario de /opinar, con enlace personal o sin él.
 *
 * Es una acción pública —la usa un cliente sin sesión—, así que el enlace es
 * la única credencial: se verifica la firma, que cada producto sea de los que
 * ese enlace deja reseñar y que no tenga reseña ya, y todo lo demás se trata
 * como si viniera de cualquiera. Sin token es el enlace general, donde no hay
 * nada que verificar y por eso el comentario es obligatorio: es lo único que
 * respalda la reseña. Los errores vuelven como valor y no como excepción porque en
 * producción Next oculta el mensaje de las excepciones, y el cliente vería un
 * error genérico en vez de qué corregir.
 */
export async function submitReviewsAction(
  token: unknown,
  input: unknown,
): Promise<SubmitReviewsResult> {
  try {
    const origin: ReviewOrigin | null =
      token === null || token === undefined
        ? { kind: "general" }
        : typeof token === "string"
          ? parseReviewToken(token)
          : null;
    if (!origin) return fail("Este enlace no es válido.");
    const general = origin.kind === "general";

    if (general && (await countRecentGeneralReviews(1)) >= GENERAL_PER_HOUR) {
      return fail(
        "Estamos recibiendo muchas opiniones ahora mismo. Intenta de nuevo en un rato, ¡gracias!",
      );
    }

    const target = await getReviewTarget(origin);
    if (!target) return fail("Este enlace ya no existe.");

    const data = (input ?? {}) as { authorName?: unknown; entries?: unknown };
    const typedName =
      typeof data.authorName === "string"
        ? data.authorName.trim().replace(/\s+/g, " ")
        : "";
    if (!typedName) return fail("Escribe el nombre con el que quieres aparecer.");
    if (typedName.length > REVIEW_NAME_MAX) {
      return fail(`El nombre puede tener hasta ${REVIEW_NAME_MAX} caracteres.`);
    }
    // El enlace general pide sólo el primer nombre, pero nadie está obligado a
    // leer: si escriben el apellido entero se publica como inicial, que es lo
    // mismo que proponen los enlaces personales.
    const authorName = general ? publicAuthorName(typedName) : typedName;

    if (!Array.isArray(data.entries) || data.entries.length === 0) {
      return fail("Elige las estrellas de al menos un producto.");
    }

    const open = new Map(
      target.products.filter((p) => !p.reviewed).map((p) => [p.id, p]),
    );
    const entries: { productId: number; rating: number; comment: string | null }[] = [];
    for (const raw of data.entries) {
      const entry = (raw ?? {}) as {
        productId?: unknown;
        rating?: unknown;
        comment?: unknown;
      };
      const productId = Number(entry.productId);
      if (!open.has(productId) || entries.some((e) => e.productId === productId)) {
        continue;
      }
      const rating = Number(entry.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return fail("Las estrellas van de 1 a 5.");
      }
      const comment = typeof entry.comment === "string" ? entry.comment.trim() : "";
      if (comment.length > REVIEW_COMMENT_MAX) {
        return fail(`El comentario puede tener hasta ${REVIEW_COMMENT_MAX} caracteres.`);
      }
      if (general && comment.length < REVIEW_COMMENT_MIN) {
        return fail(
          `Cuéntanos qué te pareció ${open.get(productId)?.title ?? "el producto"}, aunque sea en una frase.`,
        );
      }
      entries.push({ productId, rating, comment: comment || null });
    }
    if (entries.length === 0) {
      return fail(
        general
          ? "Elige las estrellas de al menos un producto."
          : "Ya tenemos tu opinión de estos productos.",
      );
    }

    const inserted = await createReviews(origin, authorName, entries);

    if (inserted > 0) {
      const first = entries[0];
      const product = open.get(first.productId);
      // Un aviso que no sale no puede hacer fallar la reseña que ya se guardó.
      try {
        await sendAdminPush({
          title:
            inserted === 1
              ? `Nueva reseña ${"★".repeat(first.rating)}`
              : `${inserted} reseñas nuevas`,
          body: `${authorName} · ${product?.title ?? "Producto"}${
            first.comment ? `: “${truncate(first.comment, 90)}”` : ""
          }`,
          url: "/admin/resenas",
          // Las del enlace general comparten etiqueta: si entran varias
          // seguidas queda un aviso y no veinte. Cuántas hay por aprobar lo
          // dice el panel.
          tag:
            origin.kind === "general"
              ? "review-general"
              : `review-${origin.kind}-${origin.id}`,
        });
      } catch (error) {
        console.error("No se pudo avisar de la reseña nueva", error);
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("No se pudo guardar la reseña", error);
    return fail("No pudimos guardar tu reseña. Intenta de nuevo en un momento.");
  }
}
