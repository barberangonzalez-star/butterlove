import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { casheaInstallments, casheaPurchases, expenses } from "./db/schema";
import { CASHEA_INSTALLMENT_OPTIONS } from "./config";

export type CasheaPurchase = typeof casheaPurchases.$inferSelect;
export type CasheaInstallment = typeof casheaInstallments.$inferSelect;

export interface CasheaPurchaseInput {
  purchaseDate: string;
  description: string | null;
  totalUsd: number;
  initialUsd: number;
  installmentCount: (typeof CASHEA_INSTALLMENT_OPTIONS)[number];
  bcvRate: number | null;
  /** Una fecha por cuota, en orden. */
  installmentDates: string[];
}

/**
 * Reparte lo que queda después de la inicial en partes iguales, centavo a
 * centavo. La última cuota absorbe el resto del redondeo para que la suma dé
 * exacto con el total, en vez de perder o inventar un centavo.
 */
function splitInstallments(totalUsd: number, initialUsd: number, count: number) {
  const remainingCents = Math.round((totalUsd - initialUsd) * 100);
  const baseCents = Math.floor(remainingCents / count);
  const amounts: number[] = [];
  let assigned = 0;
  for (let i = 0; i < count; i++) {
    const cents = i === count - 1 ? remainingCents - assigned : baseCents;
    amounts.push(cents / 100);
    assigned += cents;
  }
  return amounts;
}

/**
 * Crea la compra, sus cuotas y el gasto de la inicial (se paga hoy, así que
 * entra de una vez en Gastos; las cuotas futuras las crea el cron cuando
 * llega su fecha).
 */
export async function createCasheaPurchase(input: CasheaPurchaseInput) {
  if (input.installmentDates.length !== input.installmentCount) {
    throw new Error("Falta la fecha de alguna cuota.");
  }
  if (input.initialUsd < 0 || input.initialUsd > input.totalUsd) {
    throw new Error("La inicial no puede ser mayor que el total.");
  }

  const amounts = splitInstallments(
    input.totalUsd,
    input.initialUsd,
    input.installmentCount,
  );

  // El driver neon-http no soporta transacciones reales: se inserta en
  // secuencia, como el resto de la app.
  const db = getDb();
  const [initialExpense] = await db
    .insert(expenses)
    .values({
      expenseDate: input.purchaseDate,
      category: "Cashea",
      kind: "operativo",
      amountUsd: input.initialUsd.toFixed(2),
      description: input.description
        ? `Inicial Cashea · ${input.description}`
        : "Inicial Cashea",
    })
    .returning({ id: expenses.id });

  const [purchase] = await db
    .insert(casheaPurchases)
    .values({
      purchaseDate: input.purchaseDate,
      description: input.description,
      totalUsd: input.totalUsd.toFixed(2),
      initialUsd: input.initialUsd.toFixed(2),
      installmentCount: input.installmentCount,
      bcvRate: input.bcvRate ? input.bcvRate.toFixed(4) : null,
      initialExpenseId: initialExpense.id,
    })
    .returning({ id: casheaPurchases.id });

  await db.insert(casheaInstallments).values(
    input.installmentDates.map((dueDate, i) => ({
      purchaseId: purchase.id,
      installmentNumber: i + 1,
      dueDate,
      amountUsd: amounts[i].toFixed(2),
    })),
  );
}

export interface CasheaPurchaseWithInstallments extends CasheaPurchase {
  installments: CasheaInstallment[];
}

/** Compras recientes con sus cuotas, para mostrar el estado de cada una. */
export async function getCasheaPurchases(): Promise<CasheaPurchaseWithInstallments[]> {
  const db = getDb();
  const purchases = await db
    .select()
    .from(casheaPurchases)
    .orderBy(asc(casheaPurchases.purchaseDate));

  const installments = await db
    .select()
    .from(casheaInstallments)
    .orderBy(asc(casheaInstallments.dueDate));

  return purchases.map((purchase) => ({
    ...purchase,
    installments: installments.filter((i) => i.purchaseId === purchase.id),
  }));
}

export async function getCasheaInstallmentById(
  id: number,
): Promise<CasheaInstallment | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(casheaInstallments)
    .where(eq(casheaInstallments.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Registra la cuota como gasto del día que vence, y la enlaza. La dispara
 * Gabriel a mano desde el panel al confirmar que ya la pagó — no corre sola
 * por fecha, porque puede pagarla un día distinto al que anotó o Cashea
 * cobrársela en otra fecha.
 */
export async function markInstallmentPaid(
  installment: CasheaInstallment,
  purchase: CasheaPurchase,
) {
  const db = getDb();
  const [expense] = await db
    .insert(expenses)
    .values({
      expenseDate: installment.dueDate,
      category: "Cashea",
      kind: "operativo",
      amountUsd: installment.amountUsd,
      description: purchase.description
        ? `Cuota ${installment.installmentNumber}/${purchase.installmentCount} Cashea · ${purchase.description}`
        : `Cuota ${installment.installmentNumber}/${purchase.installmentCount} Cashea`,
    })
    .returning({ id: expenses.id });

  await db
    .update(casheaInstallments)
    .set({ expenseId: expense.id })
    .where(eq(casheaInstallments.id, installment.id));
}

/** Cuotas que vencen justo en `date` y todavía no se avisaron. */
export async function getInstallmentsToNotify(date: string) {
  const db = getDb();
  return db
    .select()
    .from(casheaInstallments)
    .where(
      and(eq(casheaInstallments.dueDate, date), isNull(casheaInstallments.notifiedAt)),
    );
}

export async function markInstallmentNotified(id: number) {
  const db = getDb();
  await db
    .update(casheaInstallments)
    .set({ notifiedAt: new Date() })
    .where(eq(casheaInstallments.id, id));
}

export async function getCasheaPurchaseById(id: number): Promise<CasheaPurchase | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(casheaPurchases)
    .where(eq(casheaPurchases.id, id))
    .limit(1);
  return row ?? null;
}
