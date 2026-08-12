import "server-only";
import { cache } from "react";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { products, productSizes } from "./db/schema";
import type { Product, ProductKind } from "./products";

type ProductRow = typeof products.$inferSelect;
type SizeRow = typeof productSizes.$inferSelect;

function toProduct(row: ProductRow, sizes: SizeRow[]): Product {
  return {
    key: row.key,
    name: row.name,
    kind: row.kind as ProductKind,
    tagline: row.tagline,
    description: row.description,
    image: row.image,
    heroImage: row.heroImage,
    bgClass: row.bgClass,
    accentHex: row.accentHex,
    badges: row.badges,
    sizes: sizes
      .filter((s) => s.productId === row.id)
      .sort((a, b) => a.grams - b.grams)
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

// Memoizado por request: el layout, la página y `generateMetadata` piden los
// mismos productos, y así se consulta la base de datos una sola vez. Sólo lo
// que va en la vitrina: el catálogo también guarda productos de sólo encargo.
export const getProducts = cache(async function getProducts(): Promise<
  Product[]
> {
  const db = getDb();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.inStore, true))
    .orderBy(asc(products.sortOrder));
  return attachSizes(rows);
});

/**
 * Solo lo que el sitemap necesita. Consulta ligera aparte para no arrastrar
 * los tamaños, y para poder exponer `updatedAt` sin meterlo en el tipo
 * `Product` que viaja al cliente. La imagen va porque el sitemap declara las
 * fotos de cada URL: es lo que las hace elegibles para Google Imágenes.
 */
export async function getProductSitemapEntries(): Promise<
  { key: string; image: string; heroImage: string; updatedAt: Date }[]
> {
  const db = getDb();
  return db
    .select({
      key: products.key,
      image: products.image,
      heroImage: products.heroImage,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .where(eq(products.inStore, true))
    .orderBy(asc(products.sortOrder));
}

export interface AdminSizeOption {
  id: number;
  grams: number;
  price: number;
  stockQuantity: number;
}

export interface AdminProduct extends Omit<Product, "sizes"> {
  id: number;
  sortOrder: number;
  inStore: boolean;
  sizes: AdminSizeOption[];
}

function toAdminProduct(row: ProductRow, sizeRows: SizeRow[]): AdminProduct {
  return {
    id: row.id,
    sortOrder: row.sortOrder,
    inStore: row.inStore,
    key: row.key,
    name: row.name,
    kind: row.kind as ProductKind,
    tagline: row.tagline,
    description: row.description,
    image: row.image,
    heroImage: row.heroImage,
    bgClass: row.bgClass,
    accentHex: row.accentHex,
    badges: row.badges,
    sizes: sizeRows
      .filter((s) => s.productId === row.id)
      .sort((a, b) => a.grams - b.grams)
      .map((s) => ({
        id: s.id,
        grams: s.grams,
        price: Number(s.price),
        stockQuantity: s.stockQuantity,
      })),
  };
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const db = getDb();
  const rows = await db.select().from(products).orderBy(asc(products.sortOrder));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const sizeRows = await db
    .select()
    .from(productSizes)
    .where(inArray(productSizes.productId, ids));
  return rows.map((row) => toAdminProduct(row, sizeRows));
}

export async function getAdminProduct(id: number): Promise<AdminProduct | undefined> {
  const db = getDb();
  const [row] = await db.select().from(products).where(eq(products.id, id));
  if (!row) return undefined;
  const sizeRows = await db
    .select()
    .from(productSizes)
    .where(eq(productSizes.productId, id));
  return toAdminProduct(row, sizeRows);
}

// También memoizado: `generateMetadata`, el JSON-LD y la página piden el mismo
// producto en un mismo request. Un producto fuera de la vitrina no se resuelve
// aquí: su URL pública tiene que dar 404 como cualquier sabor inexistente.
export const getProduct = cache(async function getProduct(
  key: string,
): Promise<Product | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.key, key), eq(products.inStore, true)));
  if (!row) return undefined;
  const [result] = await attachSizes([row]);
  return result;
});

export interface ProductInput {
  key: string;
  name: string;
  kind: ProductKind;
  tagline: string;
  description: string;
  image: string;
  heroImage: string;
  bgClass: string;
  accentHex: string;
  badges: string[];
  inStore: boolean;
  sortOrder: number;
  sizes: { grams: number; price: number }[];
}

// Diffs against existing sizes (matched by grams) instead of delete-then-reinsert,
// so editing a product's name/tagline/etc. doesn't reset stockQuantity to 0.
async function replaceSizes(productId: number, sizes: ProductInput["sizes"]) {
  const db = getDb();
  const existing = await db
    .select()
    .from(productSizes)
    .where(eq(productSizes.productId, productId));

  const incomingGrams = new Set(sizes.map((s) => s.grams));
  const toRemove = existing.filter((row) => !incomingGrams.has(row.grams));
  if (toRemove.length > 0) {
    await db.delete(productSizes).where(
      inArray(productSizes.id, toRemove.map((r) => r.id))
    );
  }

  for (const size of sizes) {
    const match = existing.find((row) => row.grams === size.grams);
    if (match) {
      await db
        .update(productSizes)
        .set({ price: size.price.toFixed(2) })
        .where(eq(productSizes.id, match.id));
    } else {
      await db.insert(productSizes).values({
        productId,
        grams: size.grams,
        price: size.price.toFixed(2),
      });
    }
  }
}

export async function createProduct(input: ProductInput) {
  const db = getDb();
  const [row] = await db
    .insert(products)
    .values({
      key: input.key,
      name: input.name,
      kind: input.kind,
      tagline: input.tagline,
      description: input.description,
      image: input.image,
      heroImage: input.heroImage,
      bgClass: input.bgClass,
      accentHex: input.accentHex,
      badges: input.badges,
      inStore: input.inStore,
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
      kind: input.kind,
      tagline: input.tagline,
      description: input.description,
      image: input.image,
      heroImage: input.heroImage,
      bgClass: input.bgClass,
      accentHex: input.accentHex,
      badges: input.badges,
      inStore: input.inStore,
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

export async function setProductSizeStock(sizeId: number, quantity: number) {
  const db = getDb();
  await db
    .update(productSizes)
    .set({ stockQuantity: quantity })
    .where(eq(productSizes.id, sizeId));
}

// Atomic increment/decrement (delta can be negative) so concurrent sales
// can't race each other into an inconsistent stock count.
export async function incrementProductSizeStock(
  productId: number,
  grams: number,
  delta: number
) {
  const db = getDb();
  await db
    .update(productSizes)
    .set({ stockQuantity: sql`${productSizes.stockQuantity} + ${delta}` })
    .where(
      sql`${productSizes.productId} = ${productId} and ${productSizes.grams} = ${grams}`
    );
}
