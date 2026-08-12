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

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function parseExpense(formData: FormData): ExpenseInput {
  const amount = Number(formData.get("amountUsd") ?? 0);
  const category = String(formData.get("category") ?? "").trim();
  const expenseDate = String(formData.get("expenseDate") ?? "").trim();

  if (!category) throw new Error("El gasto necesita una categoría.");
  if (!expenseDate) throw new Error("El gasto necesita una fecha.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto del gasto tiene que ser mayor que cero.");
  }

  return {
    expenseDate,
    category,
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
