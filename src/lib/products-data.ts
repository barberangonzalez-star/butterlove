import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { products, productSizes } from "./db/schema";
import type { Product } from "./products";

type ProductRow = typeof products.$inferSelect;
type SizeRow = typeof productSizes.$inferSelect;

function toProduct(row: ProductRow, sizes: SizeRow[]): Product {
  return {
    key: row.key,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    image: row.image,
    heroImage: row.heroImage,
    bgClass: row.bgClass,
    accentHex: row.accentHex,
    badges: row.badges,
    sizes: sizes
      .filter((s) => s.productId === row.id)
      .map((s) => ({ grams: s.grams, price: Number(s.price) })),
  };
}

async function attachSizes(rows: ProductRow[]): Promise<Product[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const sizeRows = await db
    .select()
    .from(productSizes)
    .where(inArray(productSizes.productId, ids));
  return rows.map((row) => toProduct(row, sizeRows));
}

export async function getProducts(): Promise<Product[]> {
  const db = getDb();
  const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
  return attachSizes(rows);
}

export interface AdminProduct extends Product {
  id: number;
  sortOrder: number;
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const db = getDb();
  const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
  const withSizes = await attachSizes(rows);
  return rows.map((row, i) => ({
    id: row.id,
    sortOrder: row.sortOrder,
    ...withSizes[i],
  }));
}

export async function getAdminProduct(id: number): Promise<AdminProduct | undefined> {
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id));
  if (!row) return undefined;
  const [product] = await attachSizes([row]);
  return { id: row.id, sortOrder: row.sortOrder, ...product };
}

export async function getProduct(key: string): Promise<Product | undefined> {
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.key, key));
  if (!row) return undefined;
  const [result] = await attachSizes([row]);
  return result;
}

export interface ProductInput {
  key: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  heroImage: string;
  bgClass: string;
  accentHex: string;
  badges: string[];
  sortOrder: number;
  sizes: { grams: number; price: number }[];
}

async function replaceSizes(productId: number, sizes: ProductInput["sizes"]) {
  const db = getDb();
  await db.delete(productSizes).where(eq(productSizes.productId, productId));
  if (sizes.length > 0) {
    await db.insert(productSizes).values(
      sizes.map((s) => ({
        productId,
        grams: s.grams,
        price: s.price.toFixed(2),
      }))
    );
  }
}

export async function createProduct(input: ProductInput) {
  const db = getDb();
  const [row] = await db
    .insert(products)
    .values({
      key: input.key,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      image: input.image,
      heroImage: input.heroImage,
      bgClass: input.bgClass,
      accentHex: input.accentHex,
      badges: input.badges,
      sortOrder: input.sortOrder,
    })
    .returning();
  await replaceSizes(row.id, input.sizes);
  return row.id;
}

export async function updateProduct(id: number, input: ProductInput) {
  const db = getDb();
  await db
    .update(products)
    .set({
      key: input.key,
      name: input.name,
      tagline: input.tagline,
      description: input.description,
      image: input.image,
      heroImage: input.heroImage,
      bgClass: input.bgClass,
      accentHex: input.accentHex,
      badges: input.badges,
      sortOrder: input.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id));
  await replaceSizes(id, input.sizes);
}

export async function deleteProduct(id: number) {
  const db = getDb();
  await db.delete(products).where(eq(products.id, id));
}
