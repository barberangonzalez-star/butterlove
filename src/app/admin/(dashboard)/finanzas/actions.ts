"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createExpense,
  deleteExpense,
  setReplacementRate,
  updateExpense,
  type ExpenseInput,
} from "@/lib/expenses-data";
import { expenseKind, isExpenseKind } from "@/lib/config";
import { saveRecipe, setSizeCost } from "@/lib/costs-data";

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

export interface RecipeSizeInput {
  sizeId: number;
  extraCostUsd: number;
  lines: { supplyItemId: number; quantity: number }[];
}

/**
 * Guarda las recetas de todos los tamaños de un producto de una vez. Va con un
 * argumento tipado en vez de FormData porque son listas dentro de listas, y
 * aplanarlas a campos repetidos sólo complicaría los dos lados.
 */
export async function saveRecipesAction(sizes: RecipeSizeInput[]) {
  await verifySession();

  for (const size of sizes) {
    if (!Number.isInteger(size.sizeId) || size.sizeId <= 0) continue;
    const extra = Number.isFinite(size.extraCostUsd) ? size.extraCostUsd : 0;
    const lines = size.lines.filter(
      (line) =>
        Number.isInteger(line.supplyItemId) && Number.isFinite(line.quantity),
    );
    await saveRecipe(size.sizeId, lines, Math.max(0, extra));
  }

  revalidateCosts();
}

function parseExpense(formData: FormData): ExpenseInput {
  const amount = Number(formData.get("amountUsd") ?? 0);
  const category = String(formData.get("category") ?? "").trim();
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();
  const kind = formData.get("kind");

  if (!category) throw new Error("El gasto necesita una categoría.");
  if (!expenseDate) throw new Error("El gasto necesita una fecha.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto del gasto tiene que ser mayor que cero.");
  }

  return {
    expenseDate,
    category,
    // Si el formulario no lo mandó, manda lo que propone la categoría: es lo
    // que el usuario vio marcado en pantalla.
    kind: isExpenseKind(kind) ? kind : expenseKind(category),
    amountUsd: amount,
    description: String(formData.get("description") ?? "").trim() || null,
  };
}

export async function saveExpenseAction(formData: FormData) {
  await verifySession();
  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const input = parseExpense(formData);

  if (id) await updateExpense(id, input);
  else await createExpense(input);

  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
}

export async function deleteExpenseAction(id: number) {
  await verifySession();
  await deleteExpense(id);
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
}

export async function setReplacementRateAction(month: string, rate: number | null) {
  await verifySession();
  if (!MONTH_RE.test(month)) throw new Error("Mes inválido.");
  await setReplacementRate(month, rate);
  revalidatePath("/admin/finanzas");
}
