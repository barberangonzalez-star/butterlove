import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { pendingOrders } from "./db/schema";
import type { PendingOrderItem } from "./db/schema";

export type { PendingOrderItem };

export type PendingOrder = typeof pendingOrders.$inferSelect;

export interface PendingOrderInput {
  items: PendingOrderItem[];
  subtotalUsd: number;
  deliveryFeeUsd: number | null;
  amountUsd: number;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: string | null;
  paymentClaimed: boolean;
  deliveryMethod: string | null;
  deliveryZone: string | null;
  address: string | null;
  courier: string | null;
  idCard: string | null;
  agency: string | null;
}

/** La bandeja, del pedido más reciente al más viejo. */
export async function getPendingOrders(): Promise<PendingOrder[]> {
  const db = getDb();
  return db.select().from(pendingOrders).orderBy(desc(pendingOrders.createdAt));
}

/** Cuántos hay esperando. Es lo que enciende el contador en el menú. */
export async function countPendingOrders(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ id: pendingOrders.id }).from(pendingOrders);
  return rows.length;
}

export async function getPendingOrder(
  id: number,
): Promise<PendingOrder | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(pendingOrders)
    .where(eq(pendingOrders.id, id))
    .limit(1);
  return row;
}

export async function createPendingOrder(
  input: PendingOrderInput,
): Promise<PendingOrder> {
  const db = getDb();
  const [row] = await db
    .insert(pendingOrders)
    .values({
      items: input.items,
      subtotalUsd: input.subtotalUsd.toFixed(2),
      deliveryFeeUsd: input.deliveryFeeUsd?.toFixed(2) ?? null,
      amountUsd: input.amountUsd.toFixed(2),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      paymentMethod: input.paymentMethod,
      paymentClaimed: input.paymentClaimed,
      deliveryMethod: input.deliveryMethod,
      deliveryZone: input.deliveryZone,
      address: input.address,
      courier: input.courier,
      idCard: input.idCard,
      agency: input.agency,
    })
    .returning();
  return row;
}

export async function deletePendingOrder(id: number) {
  const db = getDb();
  const [deleted] = await db
    .delete(pendingOrders)
    .where(eq(pendingOrders.id, id))
    .returning();
  return deleted;
}
