"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  deleteReview,
  markReviewRequested,
  setReviewReply,
  setReviewStatus,
} from "@/lib/reviews-data";
import { isReviewStatus, REVIEW_REPLY_MAX } from "@/lib/reviews";

/**
 * Publicar, ocultar, responder o borrar cambia lo que muestra la tienda —las
 * estrellas de cada tarjeta, la ficha del producto, la franja de la página
 * principal—, que son páginas estáticas. Por eso se refresca el sitio entero,
 * que de paso incluye el contador del panel.
 */
function revalidateReviews() {
  revalidatePath("/", "layout");
}

function requireId(id: number, what: string) {
  if (!Number.isInteger(id) || id <= 0) throw new Error(`${what} inválida.`);
}

export async function setReviewStatusAction(id: number, status: unknown) {
  await verifySession();
  requireId(id, "Reseña");
  if (!isReviewStatus(status)) throw new Error("Estado de reseña inválido.");
  await setReviewStatus(id, status);
  revalidateReviews();
}

export async function saveReviewReplyAction(id: number, reply: unknown) {
  await verifySession();
  requireId(id, "Reseña");
  const text = typeof reply === "string" ? reply.trim() : "";
  if (text.length > REVIEW_REPLY_MAX) {
    throw new Error(`La respuesta puede tener hasta ${REVIEW_REPLY_MAX} caracteres.`);
  }
  await setReviewReply(id, text || null);
  revalidateReviews();
}

export async function deleteReviewAction(id: number) {
  await verifySession();
  requireId(id, "Reseña");
  await deleteReview(id);
  revalidateReviews();
}

/** Anota que a esta venta ya se le mandó el enlace. */
export async function markReviewRequestedAction(saleId: number) {
  await verifySession();
  requireId(saleId, "Venta");
  await markReviewRequested(saleId);
  revalidatePath("/admin/resenas");
  revalidatePath("/admin/clientes", "layout");
}
