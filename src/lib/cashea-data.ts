import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
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

function initialExpenseDescription(description: string | null) {
  return description ? `Inicial Cashea · ${description}` : "Inicial Cashea";
}

function installmentExpenseDescription(
  installmentNumber: number,
  installmentCount: number,
  description: string | null,
) {
  const base = `Cuota ${installmentNumber}/${installmentCount} Cashea`;
  return description ? `${base} · ${description}` : base;
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
      description: initialExpenseDescription(input.description),
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

/** Compras con sus cuotas, la más reciente primero. */
export async function getCasheaPurchases(): Promise<CasheaPurchaseWithInstallments[]> {
  const db = getDb();
  const purchases = await db
    .select()
    .from(casheaPurchases)
    .orderBy(desc(casheaPurchases.purchaseDate), desc(casheaPurchases.id));

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
      description: installmentExpenseDescription(
        installment.installmentNumber,
        purchase.installmentCount,
        purchase.description,
      ),
    })
    .returning({ id: expenses.id });

  await db
    .update(casheaInstallments)
    .set({ expenseId: expense.id })
    .where(eq(casheaInstallments.id, installment.id));
}

/** Deshace la confirmación: borra el gasto y la cuota vuelve a pendiente. */
export async function markInstallmentUnpaid(installment: CasheaInstallment) {
  if (!installment.expenseId) return;
  const db = getDb();
  await db
    .update(casheaInstallments)
    .set({ expenseId: null })
    .where(eq(casheaInstallments.id, installment.id));
  await db.delete(expenses).where(eq(expenses.id, installment.expenseId));
}

/**
 * Corrige fecha y monto de una cuota. Si ya estaba pagada, su gasto se mueve
 * con ella para que Gastos y Finanzas no queden con el número viejo; si cambia
 * la fecha, se vuelve a avisar el día antes de la nueva.
 */
export async function updateInstallment(
  installment: CasheaInstallment,
  input: { dueDate: string; amountUsd: number },
) {
  const db = getDb();
  const amount = input.amountUsd.toFixed(2);

  await db
    .update(casheaInstallments)
    .set({
      dueDate: input.dueDate,
      amountUsd: amount,
      ...(input.dueDate !== installment.dueDate ? { notifiedAt: null } : {}),
    })
    .where(eq(casheaInstallments.id, installment.id));

  if (installment.expenseId) {
    await db
      .update(expenses)
      .set({ expenseDate: input.dueDate, amountUsd: amount })
      .where(eq(expenses.id, installment.expenseId));
  }

  await syncPurchaseTotal(installment.purchaseId);
}

/** El total de la compra es la inicial más lo que suman sus cuotas. */
async function syncPurchaseTotal(purchaseId: number) {
  const purchase = await getCasheaPurchaseById(purchaseId);
  if (!purchase) return;
  const db = getDb();
  const installments = await db
    .select({ amountUsd: casheaInstallments.amountUsd })
    .from(casheaInstallments)
    .where(eq(casheaInstallments.purchaseId, purchaseId));
  const cents =
    Math.round(Number(purchase.initialUsd) * 100) +
    installments.reduce((sum, i) => sum + Math.round(Number(i.amountUsd) * 100), 0);
  await db
    .update(casheaPurchases)
    .set({ totalUsd: (cents / 100).toFixed(2) })
    .where(eq(casheaPurchases.id, purchaseId));
}

/** Cambia el detalle de la compra y lo repite en los gastos que ya generó. */
export async function updatePurchaseDescription(
  purchase: CasheaPurchase,
  description: string | null,
) {
  const db = getDb();
  await db
    .update(casheaPurchases)
    .set({ description })
    .where(eq(casheaPurchases.id, purchase.id));

  if (purchase.initialExpenseId) {
    await db
      .update(expenses)
      .set({ description: initialExpenseDescription(description) })
      .where(eq(expenses.id, purchase.initialExpenseId));
  }

  const installments = await db
    .select()
    .from(casheaInstallments)
    .where(eq(casheaInstallments.purchaseId, purchase.id));
  for (const installment of installments) {
    if (!installment.expenseId) continue;
    await db
      .update(expenses)
      .set({
        description: installmentExpenseDescription(
          installment.installmentNumber,
          purchase.installmentCount,
          description,
        ),
      })
      .where(eq(expenses.id, installment.expenseId));
  }
}

/**
 * Borra la compra, sus cuotas y los gastos que generó (la inicial y las cuotas
 * pagadas): si la compra no existió, esos gastos tampoco.
 */
export async function deleteCasheaPurchase(purchase: CasheaPurchase) {
  const db = getDb();
  const installments = await db
    .select({ expenseId: casheaInstallments.expenseId })
    .from(casheaInstallments)
    .where(eq(casheaInstallments.purchaseId, purchase.id));

  const expenseIds = [
    purchase.initialExpenseId,
    ...installments.map((i) => i.expenseId),
  ].filter((id): id is number => id !== null);

  await db.delete(casheaPurchases).where(eq(casheaPurchases.id, purchase.id));
  if (expenseIds.length > 0) {
    await db.delete(expenses).where(inArray(expenses.id, expenseIds));
  }
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
