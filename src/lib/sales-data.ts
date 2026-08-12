import "server-only";
import { and, asc, desc, eq, exists, gte, inArray, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { sales, saleItems } from "./db/schema";

export type SaleRow = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;

/** Una venta siempre viaja con sus líneas: nunca hay una sin lo que se vendió. */
export interface Sale extends SaleRow {
  items: SaleItem[];
}

export interface SaleFilters {
  from?: string;
  to?: string;
  productId?: number;
  customerId?: number;
}

/**
 * Las líneas se traen en una sola consulta para todas las ventas de la página,
 * en vez de una por venta.
 */
async function attachItems(rows: SaleRow[]): Promise<Sale[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const items = await db
    .select()
    .from(saleItems)
    .where(
      inArray(
        saleItems.saleId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(saleItems.position), asc(saleItems.id));

  const bySale = new Map<number, SaleItem[]>();
  for (const item of items) {
    const list = bySale.get(item.saleId);
    if (list) list.push(item);
    else bySale.set(item.saleId, [item]);
  }

  return rows.map((row) => ({ ...row, items: bySale.get(row.id) ?? [] }));
}

export async function getSales(filters: SaleFilters = {}): Promise<Sale[]> {
  const db = getDb();
  const conditions = [];
  if (filters.from) conditions.push(gte(sales.saleDate, filters.from));
  if (filters.to) conditions.push(lte(sales.saleDate, filters.to));
  if (filters.customerId) {
    conditions.push(eq(sales.customerId, filters.customerId));
  }
  if (filters.productId) {
    // Filtrar por producto devuelve la venta completa, con todas sus líneas:
    // si el cliente se llevó maní y pistacho, filtrar por maní no debería
    // ocultar que también compró pistacho.
    conditions.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(saleItems)
          .where(
            and(
              eq(saleItems.saleId, sales.id),
              eq(saleItems.productId, filters.productId),
            ),
          ),
      ),
    );
  }

  const rows = await db
    .select()
    .from(sales)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sales.saleDate), desc(sales.id));

  return attachItems(rows);
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

export interface SaleItemInput {
  productId: number | null;
  productName: string;
  grams: number;
  quantity: number;
  unitPriceUsd: number;
  /** El combo con el que se vendió esta línea, si fue por promo. */
  promotionId: number | null;
  promotionLabel: string | null;
}

export interface SaleInput {
  saleDate: string;
  items: SaleItemInput[];
  amountUsd: number;
  paymentMethod: string | null;
  /** La ficha del cliente. El nombre y el contacto de abajo son los de esta venta. */
  customerId: number | null;
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
    amountUsd: input.amountUsd.toFixed(2),
    paymentMethod: input.paymentMethod,
    customerId: input.customerId,
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

function toItemRows(saleId: number, items: SaleItemInput[]) {
  return items.map((item, position) => ({
    saleId,
    productId: item.productId,
    productName: item.productName,
    grams: item.grams,
    quantity: item.quantity,
    unitPriceUsd: item.unitPriceUsd.toFixed(2),
    promotionId: item.promotionId,
    promotionLabel: item.promotionLabel,
    position,
  }));
}

export async function getSaleById(id: number): Promise<Sale | undefined> {
  const db = getDb();
  const [row] = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  if (!row) return undefined;
  const [withItems] = await attachItems([row]);
  return withItems;
}

export async function createSale(input: SaleInput) {
  const db = getDb();
  const [row] = await db
    .insert(sales)
    .values(toRow(input))
    .returning({ id: sales.id });

  try {
    await db.insert(saleItems).values(toItemRows(row.id, input.items));
  } catch (error) {
    // El driver HTTP no abre transacciones entre consultas, así que una venta
    // sin líneas se limpia a mano en vez de quedar registrada a medias.
    await db.delete(sales).where(eq(sales.id, row.id));
    throw error;
  }

  return row.id;
}

export async function updateSale(id: number, input: SaleInput) {
  const db = getDb();
  // Las líneas se reemplazan enteras: es más simple que reconciliar altas,
  // bajas y cambios, y `batch` hace que los tres pasos sean atómicos.
  await db.batch([
    db.update(sales).set(toRow(input)).where(eq(sales.id, id)),
    db.delete(saleItems).where(eq(saleItems.saleId, id)),
    db.insert(saleItems).values(toItemRows(id, input.items)),
  ]);
}

export async function deleteSale(id: number) {
  const db = getDb();
  // Las líneas se van solas: la FK es ON DELETE CASCADE.
  const [deleted] = await db.delete(sales).where(eq(sales.id, id)).returning();
  return deleted;
}

export async function getMonthSummary(monthStart: string, monthEnd: string) {
  const db = getDb();
  const inMonth = and(
    gte(sales.saleDate, monthStart),
    lte(sales.saleDate, monthEnd),
  );

  const [row] = await db
    .select({
      totalUsd: sql<string>`coalesce(sum(${sales.amountUsd}), 0)`,
      totalBs: sql<string>`coalesce(sum(${sales.amountBs}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .where(inMonth);

  // El más vendido se cuenta por frascos sobre las líneas, así que una venta
  // con tres productos aporta a los tres.
  const [topProduct] = await db
    .select({
      productName: saleItems.productName,
      totalQty: sql<number>`sum(${saleItems.quantity})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(inMonth)
    .groupBy(saleItems.productName)
    .orderBy(desc(sql`sum(${saleItems.quantity})`))
    .limit(1);

  return {
    totalUsd: Number(row?.totalUsd ?? 0),
    totalBs: Number(row?.totalBs ?? 0),
    count: Number(row?.count ?? 0),
    topProduct: topProduct?.productName ?? null,
  };
}
