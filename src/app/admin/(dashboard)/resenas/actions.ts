"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createReviewInvite,
  deleteReview,
  deleteReviewInvite,
  markReviewRequested,
  setReviewReply,
  setReviewStatus,
} from "@/lib/reviews-data";
import { inviteRequestLinks, type ReviewRequestLinks } from "@/lib/review-links";
import { INVITE_NAME_MAX, isReviewStatus, REVIEW_REPLY_MAX } from "@/lib/reviews";

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

const cleanText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

export interface CreatedInvite extends ReviewRequestLinks {
  customerName: string;
}

/**
 * "Crear enlace personalizado": para alguien que compró pero no tiene venta
 * registrada. Devuelve el enlace y el mensaje listos para mandar.
 */
export async function createReviewInviteAction(input: {
  firstName: unknown;
  lastName: unknown;
  phone: unknown;
  productIds: unknown;
}): Promise<CreatedInvite> {
  await verifySession();

  const firstName = cleanText(input?.firstName);
  const lastName = cleanText(input?.lastName);
  if (!firstName) throw new Error("Escribe el nombre de la persona.");
  const customerName = [firstName, lastName].filter(Boolean).join(" ");
  if (customerName.length > INVITE_NAME_MAX) {
    throw new Error(`Nombre y apellido pueden sumar hasta ${INVITE_NAME_MAX} caracteres.`);
  }

  const phone = cleanText(input?.phone) || null;
  if (phone && phone.length > 30) throw new Error("Ese teléfono es demasiado largo.");

  const productIds = Array.isArray(input?.productIds)
    ? [
        ...new Set(
          input.productIds.map(Number).filter((id) => Number.isInteger(id) && id > 0),
        ),
      ]
    : [];

  const invite = await createReviewInvite({
    customerName,
    customerPhone: phone,
    productIds,
  });
  revalidatePath("/admin/resenas");
  return { customerName, ...inviteRequestLinks(invite) };
}

export async function deleteReviewInviteAction(id: number) {
  await verifySession();
  requireId(id, "Enlace");
  await deleteReviewInvite(id);
  revalidatePath("/admin/resenas");
}

/** Anota que a esta venta ya se le mandó el enlace. */
export async function markReviewRequestedAction(saleId: number) {
  await verifySession();
  requireId(saleId, "Venta");
  await markReviewRequested(saleId);
  revalidatePath("/admin/resenas");
  revalidatePath("/admin/clientes", "layout");
}
