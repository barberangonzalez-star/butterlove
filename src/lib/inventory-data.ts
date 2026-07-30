import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { supplyItems } from "./db/schema";

export type SupplyItem = typeof supplyItems.$inferSelect;

export async function getSupplyItems(): Promise<SupplyItem[]> {
  const db = getDb();
  return db.select().from(supplyItems).orderBy(asc(supplyItems.name));
}

export interface SupplyItemInput {
  name: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number | null;
  notes: string | null;
}

export async function createSupplyItem(input: SupplyItemInput) {
  const db = getDb();
  await db.insert(supplyItems).values(input);
}

export async function updateSupplyItem(id: number, input: SupplyItemInput) {
  const db = getDb();
  await db
    .update(supplyItems)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(supplyItems.id, id));
}

export async function setSupplyItemQuantity(id: number, quantity: number) {
  const db = getDb();
  await db
    .update(supplyItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(supplyItems.id, id));
}

export async function adjustSupplyItemQuantity(id: number, delta: number) {
  const db = getDb();
  await db
    .update(supplyItems)
    .set({ quantity: sql`${supplyItems.quantity} + ${delta}`, updatedAt: new Date() })
    .where(eq(supplyItems.id, id));
}

export async function deleteSupplyItem(id: number) {
  const db = getDb();
  await db.delete(supplyItems).where(eq(supplyItems.id, id));
}
