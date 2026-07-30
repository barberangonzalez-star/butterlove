"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import { createSale, deleteSale } from "@/lib/sales-data";
import { getAdminProducts } from "@/lib/products-data";
import { getPromotions } from "@/lib/promotions-data";
import { getBcvRates } from "@/lib/bcv";

export async function createSaleAction(formData: FormData) {
  await verifySession();

  const productId = Number(formData.get("productId"));
  const grams = Number(formData.get("grams"));
  const quantity = Number(formData.get("quantity"));
  const unitPriceUsd = Number(formData.get("unitPriceUsd"));
  const amountUsd = Number(formData.get("amountUsd"));
  const saleDate = String(formData.get("saleDate") ?? "");
  const paymentMethod = String(formData.get("paymentMethod") ?? "") || null;
  const promotionIdRaw = formData.get("promotionId");
  const promotionId = promotionIdRaw ? Number(promotionIdRaw) : null;
  const notes = String(formData.get("notes") ?? "") || null;
  const customerName = String(formData.get("customerName") ?? "").trim() || null;
  const customerEmail = String(formData.get("customerEmail") ?? "").trim() || null;
  const customerPhone = String(formData.get("customerPhone") ?? "").trim() || null;
  const deliveryMethod = String(formData.get("deliveryMethod") ?? "") || null;
  const deliveryProvider =
    deliveryMethod === "Delivery"
      ? String(formData.get("deliveryProvider") ?? "") || null
      : null;
  const deliveryFeeUsd =
    deliveryProvider === "Nosotros"
      ? Number(formData.get("deliveryFeeUsd") ?? 0)
      : null;

  const [products, promotions, bcv] = await Promise.all([
    getAdminProducts(),
    getPromotions(),
    getBcvRates(),
  ]);

  const product = products.find((p) => p.id === productId);
  const promotion = promotionId
    ? promotions.find((p) => p.id === promotionId)
    : null;

  const bcvUsdRate = bcv.usd?.rate ?? null;
  const amountBs = bcvUsdRate ? amountUsd * bcvUsdRate : null;

  await createSale({
    saleDate,
    productId: product?.id ?? null,
    productName: product?.name ?? "Producto eliminado",
    grams,
    quantity,
    unitPriceUsd,
    amountUsd,
    promotionId: promotion?.id ?? null,
    promotionLabel: promotion?.title ?? null,
    paymentMethod,
    customerName,
    customerEmail,
    customerPhone,
    deliveryMethod,
    deliveryProvider,
    deliveryFeeUsd,
    bcvUsdRate,
    bcvEurRate: bcv.eur?.rate ?? null,
    amountBs,
    notes,
  });

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}

export async function deleteSaleAction(id: number) {
  await verifySession();
  await deleteSale(id);
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}
