"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createExpense,
  deleteExpense,
  setExpenseKind,
  updateExpense,
  type ExpenseInput,
} from "@/lib/expenses-data";
import { createCasheaPurchase, type CasheaPurchaseInput } from "@/lib/cashea-data";
import { expenseKind, isExpenseKind, CASHEA_INSTALLMENT_OPTIONS } from "@/lib/config";

/**
 * Los gastos se anotan en su propia sección, pero los lee Finanzas: cada uno
 * entra en la ganancia del mes (o sólo en la caja, si no resta) y en el resumen
 * del panel de inicio. Por eso cualquier cambio refresca las tres pantallas.
 */
function revalidateExpenses() {
  revalidatePath("/admin/gastos");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin");
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

  revalidateExpenses();
}

export async function deleteExpenseAction(id: number) {
  await verifySession();
  await deleteExpense(id);
  revalidateExpenses();
}

export async function createCasheaPurchaseAction(input: CasheaPurchaseInput) {
  await verifySession();

  if (!input.purchaseDate) throw new Error("La compra necesita una fecha.");
  if (!Number.isFinite(input.totalUsd) || input.totalUsd <= 0) {
    throw new Error("El total de la compra tiene que ser mayor que cero.");
  }
  if (!Number.isFinite(input.initialUsd) || input.initialUsd < 0) {
    throw new Error("La inicial no puede ser negativa.");
  }
  if (!CASHEA_INSTALLMENT_OPTIONS.includes(input.installmentCount)) {
    throw new Error("Número de cuotas inválido.");
  }
  if (input.installmentDates.some((d) => !d)) {
    throw new Error("Falta la fecha de alguna cuota.");
  }

  await createCasheaPurchase({
    ...input,
    description: input.description?.trim() || null,
  });
  revalidateExpenses();
}

/** El botón de "resta / no resta" de la tabla. */
export async function setExpenseKindAction(id: number, kind: unknown) {
  await verifySession();
  if (!Number.isInteger(id) || id <= 0) throw new Error("Gasto inválido.");
  if (!isExpenseKind(kind)) throw new Error("Tipo de gasto inválido.");
  await setExpenseKind(id, kind);
  revalidateExpenses();
}
