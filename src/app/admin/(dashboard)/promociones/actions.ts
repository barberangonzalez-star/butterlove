"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotions,
  type PromotionInput,
} from "@/lib/promotions-data";

function revalidate() {
  revalidatePath("/admin/promociones");
  revalidatePath("/admin/ventas");
}

export async function savePromotionAction(formData: FormData) {
  await verifySession();
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;

  // Producto, tamaño y precio van juntos: una promo a medio definir no puede
  // ofrecerse como línea de venta, así que o están los tres o ninguno.
  const productIdRaw = formData.get("productId");
  const productId = productIdRaw ? Number(productIdRaw) : null;
  const gramsRaw = formData.get("grams");
  const grams = productId && gramsRaw ? Number(gramsRaw) : null;
  const bundlePriceRaw = formData.get("bundlePrice");
  const bundlePrice =
    productId && bundlePriceRaw !== null && String(bundlePriceRaw) !== ""
      ? Number(bundlePriceRaw)
      : null;

  const input: PromotionInput = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    active: formData.get("active") === "on",
    bundleQuantity: Number(formData.get("bundleQuantity") ?? 1) || 1,
    productId,
    grams,
    bundlePrice,
  };

  if (id) {
    await updatePromotion(id, input);
  } else {
    await createPromotion(input);
  }
  revalidate();
}

export async function togglePromotionAction(id: number, active: boolean) {
  await verifySession();
  const promos = await getPromotions();
  const promo = promos.find((p) => p.id === id);
  if (!promo) return;
  await updatePromotion(id, {
    title: promo.title,
    description: promo.description,
    active,
    bundleQuantity: promo.bundleQuantity,
    productId: promo.productId,
    grams: promo.grams,
    bundlePrice: promo.bundlePrice === null ? null : Number(promo.bundlePrice),
  });
  revalidate();
}

export async function deletePromotionAction(id: number) {
  await verifySession();
  await deletePromotion(id);
  revalidate();
}
