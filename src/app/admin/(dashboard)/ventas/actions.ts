"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createSale,
  deleteSale,
  getSaleById,
  updateSale,
  type SaleInput,
} from "@/lib/sales-data";
import { getAdminProducts, incrementProductSizeStock } from "@/lib/products-data";
import { getPromotions } from "@/lib/promotions-data";
import { getBcvRates } from "@/lib/bcv";

export async function saveSaleAction(formData: FormData) {
  await verifySession();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
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

  const [products, promotions, existing] = await Promise.all([
    getAdminProducts(),
    getPromotions(),
    id ? getSaleById(id) : Promise.resolve(undefined),
  ]);

  if (id && !existing) throw new Error("La venta ya no existe.");

  const product = products.find((p) => p.id === productId);
  const promotion = promotionId
    ? promotions.find((p) => p.id === promotionId)
    : null;

  // Editing keeps the rate the sale was recorded at — it is historical data,
  // not today's rate. Only fall back to a fresh lookup when there isn't one.
  let bcvUsdRate: number | null;
  let bcvEurRate: number | null;
  if (existing?.bcvUsdRate) {
    bcvUsdRate = Number(existing.bcvUsdRate);
    bcvEurRate = existing.bcvEurRate ? Number(existing.bcvEurRate) : null;
  } else {
    const bcv = await getBcvRates();
    bcvUsdRate = bcv.usd?.rate ?? null;
    bcvEurRate = bcv.eur?.rate ?? null;
  }
  const amountBs = bcvUsdRate ? amountUsd * bcvUsdRate : null;

  const input: SaleInput = {
    saleDate,
    productId: product?.id ?? null,
    // A sale whose product was deleted keeps the name it was recorded under.
    productName: product?.name ?? existing?.productName ?? "Producto eliminado",
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
    bcvEurRate,
    amountBs,
    notes,
  };

  if (existing) {
    await updateSale(existing.id, input);
    // Give back what the old version of the sale had taken, then take the new
    // amount — this covers changes of product, size and quantity alike.
    if (existing.productId) {
      await incrementProductSizeStock(
        existing.productId,
        existing.grams,
        existing.quantity
      );
    }
  } else {
    await createSale(input);
  }

  if (product) {
    await incrementProductSizeStock(product.id, grams, -quantity);
  }

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
}

export async function deleteSaleAction(id: number) {
  await verifySession();
  const deleted = await deleteSale(id);
  if (deleted?.productId) {
    await incrementProductSizeStock(deleted.productId, deleted.grams, deleted.quantity);
  }
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
}
