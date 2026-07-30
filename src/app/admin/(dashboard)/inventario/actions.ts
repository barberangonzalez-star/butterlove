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

function revalidate() {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/ventas");
}

export async function setStockAction(sizeId: number, quantity: number) {
  await verifySession();
  await setProductSizeStock(sizeId, Number.isFinite(quantity) ? quantity : 0);
  revalidate();
}

function parseSupplyForm(formData: FormData): SupplyItemInput {
  const thresholdRaw = formData.get("lowStockThreshold");
  return {
    name: String(formData.get("name") ?? "").trim(),
    quantity: Number(formData.get("quantity") ?? 0) || 0,
    unit: String(formData.get("unit") ?? "").trim() || "unidades",
    lowStockThreshold: thresholdRaw ? Number(thresholdRaw) : null,
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
  await deleteSupplyItem(id);
  revalidate();
}
