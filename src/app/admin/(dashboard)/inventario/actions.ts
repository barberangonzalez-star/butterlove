"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import { setProductSizeStock } from "@/lib/products-data";
import {
  createSupplyItem,
  updateSupplyItem,
  setSupplyItemQuantity,
  deleteSupplyItem,
  type SupplyItemInput,
} from "@/lib/inventory-data";
import { getSupplyUsage } from "@/lib/costs-data";

function revalidate() {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/ventas");
  // El precio de un insumo cambia el costo de todo lo que lo lleva.
  revalidatePath("/admin/productos");
  revalidatePath("/admin/finanzas");
}

export async function setStockAction(sizeId: number, quantity: number) {
  await verifySession();
  await setProductSizeStock(sizeId, Number.isFinite(quantity) ? quantity : 0);
  revalidate();
}

function parseSupplyForm(formData: FormData): SupplyItemInput {
  const thresholdRaw = formData.get("lowStockThreshold");
  const priceRaw = String(formData.get("purchasePriceUsd") ?? "").trim();
  const purchaseQtyRaw = String(formData.get("purchaseQuantity") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    quantity: Number(formData.get("quantity") ?? 0) || 0,
    unit: String(formData.get("unit") ?? "").trim() || "unidades",
    lowStockThreshold: thresholdRaw ? Number(thresholdRaw) : null,
    // Los dos van juntos o no van: con uno solo no se puede sacar el costo por
    // unidad, y guardar la mitad haría ver el insumo como si tuviera precio.
    purchasePriceUsd: priceRaw ? Number(priceRaw) : null,
    purchaseQuantity: purchaseQtyRaw ? Number(purchaseQtyRaw) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export async function saveSupplyItemAction(formData: FormData) {
  await verifySession();
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const input = parseSupplyForm(formData);

  if (id) {
    await updateSupplyItem(id, input);
  } else {
    await createSupplyItem(input);
  }
  revalidate();
}

export async function setSupplyQuantityAction(id: number, quantity: number) {
  await verifySession();
  await setSupplyItemQuantity(id, Number.isFinite(quantity) ? quantity : 0);
  revalidate();
}

export async function deleteSupplyItemAction(id: number) {
  await verifySession();

  // La base lo impediría igual, pero un error de Postgres no le dice a nadie
  // qué hacer: si el insumo está en recetas, hay que sacarlo de ellas primero.
  // Se devuelve el aviso en vez de lanzarlo porque en producción Next oculta
  // el mensaje de las excepciones de una acción.
  const usedIn = await getSupplyUsage(id);
  if (usedIn > 0) {
    return {
      error:
        `Este insumo está en ${usedIn} receta${usedIn === 1 ? "" : "s"}. ` +
        "Quítalo de ellas antes de eliminarlo.",
    };
  }

  await deleteSupplyItem(id);
  revalidate();
  return {};
}
