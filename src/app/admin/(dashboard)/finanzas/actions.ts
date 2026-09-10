"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import { setReplacementRate } from "@/lib/expenses-data";
import { saveCostItems, saveRecipe, setSizeCost } from "@/lib/costs-data";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * El costo y la ganancia se leen y se editan acá, junto a las ventas. El
 * catálogo sólo se ocupa de la cara pública del producto.
 */
function revalidateCosts() {
  revalidatePath("/admin/finanzas");
  // El panel de inicio muestra el resumen del mes, que sale de estos costos.
  revalidatePath("/admin");
}

/** Lo que cuesta un envase, escrito a mano. */
export async function setSizeCostAction(sizeId: number, costUsd: number) {
  await verifySession();
  if (!Number.isInteger(sizeId) || sizeId <= 0) {
    throw new Error("Tamaño inválido.");
  }
  await setSizeCost(sizeId, costUsd);
  revalidateCosts();
}

export interface CostSizeInput {
  sizeId: number;
  /** Lo que no está desglosado. Es el mismo número de la columna "Costo". */
  extraUsd: number;
  lines: { name: string; amount: number }[];
}

/**
 * Guarda el costo de todos los tamaños de un producto de una vez: el desglose y
 * el número suelto, que se editan en la misma pantalla. Va con un argumento
 * tipado en vez de FormData porque son listas dentro de listas, y aplanarlas a
 * campos repetidos sólo complicaría los dos lados.
 */
export async function saveCostItemsAction(sizes: CostSizeInput[]) {
  await verifySession();

  for (const size of sizes) {
    if (!Number.isInteger(size.sizeId) || size.sizeId <= 0) continue;
    const lines = size.lines
      .filter((line) => Number.isFinite(line.amount))
      .map((line) => ({
        name: String(line.name ?? ""),
        amount: Math.max(0, line.amount),
      }));
    await saveCostItems(size.sizeId, lines);
    await setSizeCost(size.sizeId, size.extraUsd);
  }

  revalidateCosts();
}

export interface RecipeSizeInput {
  sizeId: number;
  lines: { supplyItemId: number; quantity: number }[];
}

/**
 * Guarda las recetas de todos los tamaños de un producto. La receta ya no
 * decide el costo: es lo que se descuenta del inventario al vender.
 */
export async function saveRecipesAction(sizes: RecipeSizeInput[]) {
  await verifySession();

  for (const size of sizes) {
    if (!Number.isInteger(size.sizeId) || size.sizeId <= 0) continue;
    const lines = size.lines.filter(
      (line) =>
        Number.isInteger(line.supplyItemId) && Number.isFinite(line.quantity),
    );
    await saveRecipe(size.sizeId, lines);
  }

  // El inventario cambia de sentido cuando cambia la receta, y el aviso de
  // stock del panel sale de ahí.
  revalidatePath("/admin/inventario");
  revalidateCosts();
}

/* Los gastos se guardan desde su propia sección: ver `../gastos/actions`. */

export async function setReplacementRateAction(month: string, rate: number | null) {
  await verifySession();
  if (!MONTH_RE.test(month)) throw new Error("Mes inválido.");
  await setReplacementRate(month, rate);
  revalidatePath("/admin/finanzas");
}
