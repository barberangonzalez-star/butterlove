import "server-only";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { sales } from "./db/schema";

export type Sale = typeof sales.$inferSelect;

export interface SaleFilters {
  from?: string;
  to?: string;
  productId?: number;
}

export async function getSales(filters: SaleFilters = {}): Promise<Sale[]> {
  const db = getDb();
  const conditions = [];
  if (filters.from) conditions.push(gte(sales.saleDate, filters.from));
  if (filters.to) conditions.push(lte(sales.saleDate, filters.to));
  if (filters.productId) conditions.push(eq(sales.productId, filters.productId));

  return db
    .select()
    .from(sales)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sales.saleDate), desc(sales.id));
}

/** Meses (YYYY-MM) que tienen al menos una venta, del más reciente al más viejo. */
export async function getSaleMonths(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ month: sql<string>`to_char(${sales.saleDate}, 'YYYY-MM')` })
    .from(sales)
    .orderBy(desc(sql`to_char(${sales.saleDate}, 'YYYY-MM')`));

  return rows.map((r) => r.month);
}

export interface SaleInput {
  saleDate: string;
  productId: number | null;
  productName: string;
  grams: number;
  quantity: number;
  unitPriceUsd: number;
  amountUsd: number;
  promotionId: number | null;
  promotionLabel: string | null;
  paymentMethod: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryMethod: string | null;
  deliveryProvider: string | null;
  deliveryState: string | null;
  deliveryFeeUsd: number | null;
  bcvUsdRate: number | null;
  bcvEurRate: number | null;
  amountBs: number | null;
  notes: string | null;
}

function toRow(input: SaleInput) {
  return {
    saleDate: input.saleDate,
    productId: input.productId,
    productName: input.productName,
    grams: input.grams,
    quantity: input.quantity,
    unitPriceUsd: input.unitPriceUsd.toFixed(2),
    amountUsd: input.amountUsd.toFixed(2),
    promotionId: input.promotionId,
    promotionLabel: input.promotionLabel,
    paymentMethod: input.paymentMethod,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    deliveryMethod: input.deliveryMethod,
    deliveryProvider: input.deliveryProvider,
    deliveryState: input.deliveryState,
    deliveryFeeUsd: input.deliveryFeeUsd?.toFixed(2) ?? null,
    bcvUsdRate: input.bcvUsdRate?.toFixed(4) ?? null,
    bcvEurRate: input.bcvEurRate?.toFixed(4) ?? null,
    amountBs: input.amountBs?.toFixed(2) ?? null,
    notes: input.notes,
  };
}

export async function getSaleById(id: number): Promise<Sale | undefined> {
  const db = getDb();
  const [row] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  return row;
}

export async function createSale(input: SaleInput) {
  const db = getDb();
  await db.insert(sales).values(toRow(input));
}

export async function updateSale(id: number, input: SaleInput) {
  const db = getDb();
  const [updated] = await db
    .update(sales)
    .set(toRow(input))
    .where(eq(sales.id, id))
    .returning();
  return updated;
}

export async function deleteSale(id: number) {
  const db = getDb();
  const [deleted] = await db.delete(sales).where(eq(sales.id, id)).returning();
  return deleted;
}

export async function getMonthSummary(monthStart: string, monthEnd: string) {
  const db = getDb();
  const [row] = await db
    .select({
      totalUsd: sql<string>`coalesce(sum(${sales.amountUsd}), 0)`,
      totalBs: sql<string>`coalesce(sum(${sales.amountBs}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(and(gte(sales.saleDate, monthStart), lte(sales.saleDate, monthEnd)));

  const [topProduct] = await db
    .select({
      productName: sales.productName,
      totalQty: sql<number>`sum(${sales.quantity})`,
    })
    .from(sales)
    .where(and(gte(sales.saleDate, monthStart), lte(sales.saleDate, monthEnd)))
    .groupBy(sales.productName)
    .orderBy(desc(sql`sum(${sales.quantity})`))
    .limit(1);

  return {
    totalUsd: Number(row?.totalUsd ?? 0),
    totalBs: Number(row?.totalBs ?? 0),
    count: Number(row?.count ?? 0),
    topProduct: topProduct?.productName ?? null,
  };
}
