"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createSale,
  deleteSale,
  getSaleById,
  updateSale,
  type SaleInput,
  type SaleItemInput,
} from "@/lib/sales-data";
import { getAdminProducts, incrementProductSizeStock } from "@/lib/products-data";
import { getPromotions } from "@/lib/promotions-data";
import { ensureCustomer, getCustomer } from "@/lib/customers-data";
import { getBcvRates } from "@/lib/bcv";

/**
 * Acumula los movimientos de stock de una venta antes de aplicarlos.
 *
 * Al editar hay que devolver lo que la versión anterior había tomado y luego
 * tomar lo nuevo. Si ambas coinciden el delta queda en cero y no se toca la
 * base; y dos líneas del mismo producto y tamaño se suman en un solo update.
 */
function stockLedger() {
  const deltas = new Map<
    string,
    { productId: number; grams: number; delta: number }
  >();

  return {
    add(productId: number | null, grams: number, delta: number) {
      // Un producto borrado del catálogo ya no tiene stock que ajustar.
      if (!productId) return;
      const key = `${productId}:${grams}`;
      const current = deltas.get(key);
      if (current) current.delta += delta;
      else deltas.set(key, { productId, grams, delta });
    },
    async apply() {
      for (const { productId, grams, delta } of deltas.values()) {
        if (delta !== 0) {
          await incrementProductSizeStock(productId, grams, delta);
        }
      }
    },
  };
}

export async function saveSaleAction(formData: FormData) {
  await verifySession();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const amountUsd = Number(formData.get("amountUsd"));
  const saleDate = String(formData.get("saleDate") ?? "");
  const paymentMethod = String(formData.get("paymentMethod") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  const customerName = String(formData.get("customerName") ?? "").trim() || null;
  const customerEmail = String(formData.get("customerEmail") ?? "").trim() || null;
  const customerPhone = String(formData.get("customerPhone") ?? "").trim() || null;
  const deliveryMethod = String(formData.get("deliveryMethod") ?? "") || null;
  // Delivery y envío nacional comparten el campo de proveedor: en un caso es
  // quien lleva el pedido en la ciudad, en el otro la empresa de encomienda.
  const deliveryProvider =
    deliveryMethod === "Delivery" || deliveryMethod === "Envío nacional"
      ? String(formData.get("deliveryProvider") ?? "") || null
      : null;
  const deliveryState =
    deliveryMethod === "Envío nacional"
      ? String(formData.get("deliveryState") ?? "") || null
      : null;
  const deliveryFeeUsd =
    deliveryMethod === "Delivery" && deliveryProvider === "Nosotros"
      ? Number(formData.get("deliveryFeeUsd") ?? 0)
      : null;

  // Las líneas llegan como campos repetidos, así que cada `getAll` devuelve una
  // columna y el índice las cruza.
  const itemProductIds = formData.getAll("itemProductId");
  const itemNames = formData.getAll("itemProductName");
  const itemGrams = formData.getAll("itemGrams");
  const itemQuantities = formData.getAll("itemQuantity");
  const itemUnitPrices = formData.getAll("itemUnitPrice");
  const itemPromotionIds = formData.getAll("itemPromotionId");

  if (itemProductIds.length === 0) {
    throw new Error("La venta necesita al menos un producto.");
  }
  const sameLength = [
    itemNames,
    itemGrams,
    itemQuantities,
    itemUnitPrices,
    itemPromotionIds,
  ].every((column) => column.length === itemProductIds.length);
  if (!sameLength) {
    throw new Error("Las líneas de la venta llegaron incompletas.");
  }

  const [products, promotions, existing] = await Promise.all([
    getAdminProducts(),
    getPromotions(),
    id ? getSaleById(id) : Promise.resolve(undefined),
  ]);

  if (id && !existing) throw new Error("La venta ya no existe.");

  const items: SaleItemInput[] = itemProductIds.map((raw, i) => {
    const product = products.find((p) => p.id === Number(raw));
    const promoRaw = String(itemPromotionIds[i] ?? "");
    const promo = promoRaw
      ? promotions.find((p) => p.id === Number(promoRaw))
      : undefined;
    return {
      productId: product?.id ?? null,
      // Una línea cuyo producto se borró del catálogo conserva el nombre con
      // el que se registró.
      productName:
        product?.name ?? (String(itemNames[i]) || "Producto eliminado"),
      grams: Number(itemGrams[i]),
      quantity: Number(itemQuantities[i]),
      unitPriceUsd: Number(itemUnitPrices[i]),
      promotionId: promo?.id ?? null,
      // El título se copia: si la promo se borra o se renombra después, la
      // venta sigue diciendo con qué combo se cobró.
      promotionLabel: promo?.title ?? null,
    };
  });

  if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity < 1)) {
    throw new Error("Cada línea necesita una cantidad de al menos 1.");
  }

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

  // La ficha del cliente: la elegida en el buscador, o la que corresponda al
  // nombre y teléfono escritos a mano. Escribirlos a mano crea la ficha si es
  // la primera compra, así la libreta se llena registrando ventas y no hace
  // falta dar de alta al cliente antes de cobrarle.
  const pickedId = Number(formData.get("customerId") ?? "");
  const picked = pickedId ? await getCustomer(pickedId) : undefined;
  const customerId =
    picked?.id ??
    (await ensureCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      state: deliveryState,
    }));

  const input: SaleInput = {
    saleDate,
    items,
    amountUsd,
    paymentMethod,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    deliveryMethod,
    deliveryProvider,
    deliveryState,
    deliveryFeeUsd,
    bcvUsdRate,
    bcvEurRate,
    amountBs,
    notes,
  };

  const ledger = stockLedger();
  if (existing) {
    await updateSale(existing.id, input);
    for (const item of existing.items) {
      ledger.add(item.productId, item.grams, item.quantity);
    }
  } else {
    await createSale(input);
  }
  for (const item of items) {
    ledger.add(item.productId, item.grams, -item.quantity);
  }
  await ledger.apply();

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  // El historial y los totales de cada cliente salen de sus ventas.
  revalidatePath("/admin/clientes", "layout");
}

export async function deleteSaleAction(id: number) {
  await verifySession();

  // Las líneas se leen antes de borrar: el CASCADE se las lleva y después ya
  // no habría con qué reponer el stock.
  const existing = await getSaleById(id);
  if (!existing) return;

  await deleteSale(id);

  const ledger = stockLedger();
  for (const item of existing.items) {
    ledger.add(item.productId, item.grams, item.quantity);
  }
  await ledger.apply();

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  // El historial y los totales de cada cliente salen de sus ventas.
  revalidatePath("/admin/clientes", "layout");
}
