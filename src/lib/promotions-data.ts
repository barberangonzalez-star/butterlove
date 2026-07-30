import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { promotions } from "./db/schema";

export type Promotion = typeof promotions.$inferSelect;

export async function getPromotions(): Promise<Promotion[]> {
  const db = getDb();
  return db.select().from(promotions).orderBy(desc(promotions.createdAt));
}

export interface PromotionInput {
  title: string;
  description: string;
  active: boolean;
  bundleQuantity: number;
}

export async function createPromotion(input: PromotionInput) {
  const db = getDb();
  await db.insert(promotions).values(input);
}

export async function updatePromotion(id: number, input: PromotionInput) {
  const db = getDb();
  await db.update(promotions).set(input).where(eq(promotions.id, id));
}

export async function deletePromotion(id: number) {
  const db = getDb();
  await db.delete(promotions).where(eq(promotions.id, id));
}
