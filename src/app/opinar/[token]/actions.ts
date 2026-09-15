"use server";

import { saleIdFromReviewToken } from "@/lib/review-links";
import { createReviews, getReviewableSale } from "@/lib/reviews-data";
import { sendAdminPush } from "@/lib/push";
import { REVIEW_COMMENT_MAX, REVIEW_NAME_MAX } from "@/lib/reviews";

export type SubmitReviewsResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): SubmitReviewsResult => ({ ok: false, error });

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/**
 * Lo que manda el formulario de /opinar.
 *
 * Es una acción pública —la usa un cliente sin sesión—, así que el enlace es
 * la única credencial: se verifica la firma, que cada producto sea de esa
 * venta y que no tenga reseña ya, y todo lo demás se trata como si viniera de
 * cualquiera. Los errores vuelven como valor y no como excepción porque en
 * producción Next oculta el mensaje de las excepciones, y el cliente vería un
 * error genérico en vez de qué corregir.
 */
export async function submitReviewsAction(
  token: unknown,
  input: unknown,
): Promise<SubmitReviewsResult> {
  try {
    const saleId = typeof token === "string" ? saleIdFromReviewToken(token) : null;
    if (!saleId) return fail("Este enlace no es válido.");

    const sale = await getReviewableSale(saleId);
    if (!sale) return fail("No encontramos esta compra.");

    const data = (input ?? {}) as { authorName?: unknown; entries?: unknown };
    const authorName =
      typeof data.authorName === "string"
        ? data.authorName.trim().replace(/\s+/g, " ")
        : "";
    if (!authorName) return fail("Escribe el nombre con el que quieres aparecer.");
    if (authorName.length > REVIEW_NAME_MAX) {
      return fail(`El nombre puede tener hasta ${REVIEW_NAME_MAX} caracteres.`);
    }
    if (!Array.isArray(data.entries) || data.entries.length === 0) {
      return fail("Elige las estrellas de al menos un producto.");
    }

    const open = new Map(
      sale.products.filter((p) => !p.reviewed).map((p) => [p.id, p]),
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
      entries.push({ productId, rating, comment: comment || null });
    }
    if (entries.length === 0) {
      return fail("Ya tenemos tu opinión de estos productos.");
    }

    const inserted = await createReviews(saleId, authorName, entries);

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
          tag: `review-${saleId}`,
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
