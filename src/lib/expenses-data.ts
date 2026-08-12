import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { expenses, replacementRates } from "./db/schema";
import { expenseKind } from "./config";

export type Expense = typeof expenses.$inferSelect;

export interface ExpenseInput {
  expenseDate: string;
  category: string;
  amountUsd: number;
  description: string | null;
}

function toRow(input: ExpenseInput) {
  return {
    expenseDate: input.expenseDate,
    category: input.category,
    // Se copia de la categoría en vez de mirarse al leer: si mañana se decide
    // que una categoría cuenta distinto, los gastos ya registrados se quedan
    // como se registraron.
    kind: expenseKind(input.category),
    amountUsd: input.amountUsd.toFixed(2),
    description: input.description,
  };
}

export async function getExpenses(from: string, to: string): Promise<Expense[]> {
  const db = getDb();
  return db
    .select()
    .from(expenses)
    .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))
    .orderBy(desc(expenses.expenseDate), desc(expenses.id));
}

/** Meses (YYYY-MM) con al menos un gasto, del más reciente al más viejo. */
export async function getExpenseMonths(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({
      month: sql<string>`to_char(${expenses.expenseDate}, 'YYYY-MM')`,
    })
    .from(expenses)
    .orderBy(desc(sql`to_char(${expenses.expenseDate}, 'YYYY-MM')`));
  return rows.map((r) => r.month);
}

export async function createExpense(input: ExpenseInput) {
  const db = getDb();
  await db.insert(expenses).values(toRow(input));
}

export async function updateExpense(id: number, input: ExpenseInput) {
  const db = getDb();
  await db.update(expenses).set(toRow(input)).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = getDb();
  await db.delete(expenses).where(eq(expenses.id, id));
}

/** A qué tasa se repusieron los dólares ese mes, si se anotó. */
export async function getReplacementRate(month: string): Promise<number | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(replacementRates)
    .where(eq(replacementRates.month, month))
    .limit(1);
  return row ? Number(row.rate) : null;
}

export async function setReplacementRate(month: string, rate: number | null) {
  const db = getDb();
  if (rate === null || !Number.isFinite(rate) || rate <= 0) {
    await db.delete(replacementRates).where(eq(replacementRates.month, month));
    return;
  }
  await db
    .insert(replacementRates)
    .values({ month, rate: rate.toFixed(4) })
    .onConflictDoUpdate({
      target: replacementRates.month,
      set: { rate: rate.toFixed(4), updatedAt: new Date() },
    });
}
