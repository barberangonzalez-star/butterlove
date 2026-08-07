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
  /** A qué producto y tamaño aplica el combo. Null si es una promo genérica. */
  productId: number | null;
  grams: number | null;
  /** Precio total del combo, no por envase. */
  bundlePrice: number | null;
}

function toRow(input: PromotionInput) {
  return {
    title: input.title,
    description: input.description,
    active: input.active,
    bundleQuantity: input.bundleQuantity,
    productId: input.productId,
    grams: input.grams,
    bundlePrice: input.bundlePrice?.toFixed(2) ?? null,
  };
}

export async function createPromotion(input: PromotionInput) {
  const db = getDb();
  await db.insert(promotions).values(toRow(input));
}

export async function updatePromotion(id: number, input: PromotionInput) {
  const db = getDb();
  await db.update(promotions).set(toRow(input)).where(eq(promotions.id, id));
}

export async function deletePromotion(id: number) {
  const db = getDb();
  await db.delete(promotions).where(eq(promotions.id, id));
}
