import "server-only";
import { cache } from "react";
import { and, count, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { products, reviewRequests, reviews, saleItems, sales } from "./db/schema";
import { productTitle, type ProductKind } from "./products";
import {
  REVIEWS_MIN_TO_SHOW,
  isReviewStatus,
  type AdminReview,
  type ProductReviews,
  type PublicReview,
  type RatingSummary,
  type ReviewStatus,
  type ReviewableProduct,
} from "./reviews";

type ReviewRow = typeof reviews.$inferSelect;

// Las fechas se formatean acá y viajan como texto: formatearlas en el
// navegador daría otro día según la zona horaria de quien mire.
const TIME_ZONE = "America/Caracas";
const monthFormat = new Intl.DateTimeFormat("es-VE", {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const dayFormat = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
});
const fullDayFormat = new Intl.DateTimeFormat("es-VE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const productFields = {
  key: products.key,
  name: products.name,
  kind: products.kind,
};

const titleOf = (product: { name: string; kind: string }) =>
  productTitle({ name: product.name, kind: product.kind as ProductKind });

function toPublicReview(
  row: ReviewRow,
  product: { key: string; name: string; kind: string },
): PublicReview {
  const date = row.publishedAt ?? row.createdAt;
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    authorName: row.authorName,
    reply: row.reply,
    dateLabel: monthFormat.format(date),
    datePublished: date.toISOString().slice(0, 10),
    productKey: product.key,
    productTitle: titleOf(product),
  };
}

// ── Tienda ──────────────────────────────────────────────────────────────────

/**
 * El promedio de cada producto con reseñas suficientes, por `key`. Los que no
 * llegan al mínimo no aparecen: la tarjeta entiende "no está" como "no mostrar
 * estrellas".
 */
export const getRatingSummaries = cache(async function getRatingSummaries(): Promise<
  Record<string, RatingSummary>
> {
  const db = getDb();
  const rows = await db
    .select({
      key: products.key,
      average: sql<number>`avg(${reviews.rating})`.mapWith(Number),
      count: count(),
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.status, "publicada"))
    .groupBy(products.key);

  return Object.fromEntries(
    rows
      .filter((row) => row.count >= REVIEWS_MIN_TO_SHOW)
      .map((row) => [row.key, { average: row.average, count: row.count }]),
  );
});

/** Las reseñas publicadas de un producto, o null si todavía no llega al mínimo. */
export const getProductReviews = cache(async function getProductReviews(
  productKey: string,
): Promise<ProductReviews | null> {
  const db = getDb();
  const rows = await db
    .select({ review: reviews, product: productFields })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(and(eq(products.key, productKey), eq(reviews.status, "publicada")))
    .orderBy(desc(reviews.publishedAt), desc(reviews.id));

  if (rows.length < REVIEWS_MIN_TO_SHOW) return null;

  const distribution = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const { review } of rows) {
    distribution[review.rating - 1] += 1;
    sum += review.rating;
  }

  return {
    summary: { average: sum / rows.length, count: rows.length },
    distribution,
    reviews: rows.map(({ review, product }) => toPublicReview(review, product)),
  };
});

/**
 * Las que van en la franja de la página principal: cinco estrellas, con un
 * comentario que diga algo, de productos que están en la vitrina. Si no hay
 * suficientes la franja no sale.
 */
export const getFeaturedReviews = cache(async function getFeaturedReviews(): Promise<
  PublicReview[]
> {
  const db = getDb();
  const rows = await db
    .select({ review: reviews, product: productFields })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .where(
      and(
        eq(reviews.status, "publicada"),
        eq(reviews.rating, 5),
        isNotNull(reviews.comment),
        sql`length(${reviews.comment}) >= 20`,
        eq(products.inStore, true),
      ),
    )
    .orderBy(desc(reviews.publishedAt), desc(reviews.id))
    .limit(4);

  if (rows.length < REVIEWS_MIN_TO_SHOW) return [];
  return rows.map(({ review, product }) => toPublicReview(review, product));
});

// ── Formulario de /opinar ───────────────────────────────────────────────────

export interface ReviewableSale {
  saleId: number;
  customerName: string | null;
  products: ReviewableProduct[];
}

/** La venta del enlace con sus productos, marcando los que ya tienen reseña. */
export async function getReviewableSale(saleId: number): Promise<ReviewableSale | null> {
  const db = getDb();
  const [sale] = await db
    .select({ id: sales.id, customerName: sales.customerName })
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);
  if (!sale) return null;

  const [items, done] = await Promise.all([
    db
      .selectDistinct({
        id: products.id,
        name: products.name,
        kind: products.kind,
        image: products.image,
        imageCutout: products.imageCutout,
        bgClass: products.bgClass,
        sortOrder: products.sortOrder,
      })
      .from(saleItems)
      .innerJoin(products, eq(saleItems.productId, products.id))
      .where(eq(saleItems.saleId, saleId)),
    db
      .select({ productId: reviews.productId })
      .from(reviews)
      .where(eq(reviews.saleId, saleId)),
  ]);

  const reviewed = new Set(done.map((row) => row.productId));
  return {
    saleId: sale.id,
    customerName: sale.customerName,
    products: items
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: item.id,
        title: titleOf(item),
        image: item.image,
        imageCutout: item.imageCutout,
        bgClass: item.bgClass,
        reviewed: reviewed.has(item.id),
      })),
  };
}

/**
 * Guarda las reseñas de una venta. Si alguna ya existía —el mismo enlace
 * enviado dos veces, dos pestañas abiertas— se salta en silencio. Devuelve
 * cuántas entraron de verdad.
 */
export async function createReviews(
  saleId: number,
  authorName: string,
  entries: { productId: number; rating: number; comment: string | null }[],
): Promise<number> {
  if (entries.length === 0) return 0;
  const db = getDb();
  const inserted = await db
    .insert(reviews)
    .values(
      entries.map((entry) => ({
        saleId,
        productId: entry.productId,
        rating: entry.rating,
        comment: entry.comment,
        authorName,
      })),
    )
    .onConflictDoNothing({ target: [reviews.saleId, reviews.productId] })
    .returning({ id: reviews.id });
  return inserted.length;
}

// ── Panel ───────────────────────────────────────────────────────────────────

export async function countReviewsByStatus(): Promise<Record<ReviewStatus, number>> {
  const db = getDb();
  const rows = await db
    .select({ status: reviews.status, count: count() })
    .from(reviews)
    .groupBy(reviews.status);

  const counts: Record<ReviewStatus, number> = { pendiente: 0, publicada: 0, oculta: 0 };
  for (const row of rows) {
    if (isReviewStatus(row.status)) counts[row.status] = row.count;
  }
  return counts;
}

export async function countPendingReviews(): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: count() })
    .from(reviews)
    .where(eq(reviews.status, "pendiente"));
  return row?.count ?? 0;
}

export async function getAdminReviews(status: ReviewStatus): Promise<AdminReview[]> {
  const db = getDb();
  const rows = await db
    .select({
      review: reviews,
      product: { ...productFields, inStore: products.inStore },
      saleDate: sales.saleDate,
      customerName: sales.customerName,
      customerId: sales.customerId,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .leftJoin(sales, eq(reviews.saleId, sales.id))
    .where(eq(reviews.status, status))
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(200);

  return rows.map(({ review, product, saleDate, customerName, customerId }) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    authorName: review.authorName,
    reply: review.reply,
    status: isReviewStatus(review.status) ? review.status : "pendiente",
    createdLabel: fullDayFormat.format(review.createdAt),
    productKey: product.key,
    productTitle: titleOf(product),
    inStore: product.inStore,
    saleDate,
    customerName,
    customerId,
  }));
}

export async function setReviewStatus(id: number, status: ReviewStatus) {
  const db = getDb();
  await db
    .update(reviews)
    .set(
      status === "publicada"
        ? { status, publishedAt: sql`coalesce(${reviews.publishedAt}, now())` }
        : { status },
    )
    .where(eq(reviews.id, id));
}

export async function setReviewReply(id: number, reply: string | null) {
  const db = getDb();
  await db.update(reviews).set({ reply }).where(eq(reviews.id, id));
}

export async function deleteReview(id: number) {
  const db = getDb();
  await db.delete(reviews).where(eq(reviews.id, id));
}

export interface ReviewRequestState {
  /** DD/MM de la última vez que se le pidió, o null si nunca. */
  askedLabel: string | null;
  reviewCount: number;
}

/** Si a cada venta ya se le pidió reseña y si ya opinó. */
export async function getReviewRequestStates(
  saleIds: number[],
): Promise<Map<number, ReviewRequestState>> {
  const states = new Map<number, ReviewRequestState>();
  if (saleIds.length === 0) return states;
  for (const id of saleIds) states.set(id, { askedLabel: null, reviewCount: 0 });

  const db = getDb();
  const [asked, counts] = await Promise.all([
    db.select().from(reviewRequests).where(inArray(reviewRequests.saleId, saleIds)),
    db
      .select({ saleId: reviews.saleId, count: count() })
      .from(reviews)
      .where(inArray(reviews.saleId, saleIds))
      .groupBy(reviews.saleId),
  ]);

  for (const row of asked) {
    const state = states.get(row.saleId);
    if (state) state.askedLabel = dayFormat.format(row.askedAt);
  }
  for (const row of counts) {
    const state = row.saleId === null ? undefined : states.get(row.saleId);
    if (state) state.reviewCount = row.count;
  }
  return states;
}

export interface ReviewRequestCandidate extends ReviewRequestState {
  saleId: number;
  saleDate: string;
  customerName: string | null;
  customerPhone: string | null;
  customerId: number | null;
  productNames: string[];
}

/** Hasta cuándo atrás tiene sentido pedir una reseña. */
const REQUEST_WINDOW_DAYS = 180;

/**
 * Las ventas al detal recientes, para pedirles reseña. Al mayor no: quien
 * revende no es quien se come el frasco. Se saltan las ventas cuyos productos
 * ya no están en el catálogo, porque no habría qué reseñar.
 */
export async function getReviewRequestCandidates(): Promise<ReviewRequestCandidate[]> {
  const db = getDb();
  const since = new Date(Date.now() - REQUEST_WINDOW_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const rows = await db
    .select({
      saleId: sales.id,
      saleDate: sales.saleDate,
      customerName: sales.customerName,
      customerPhone: sales.customerPhone,
      customerId: sales.customerId,
    })
    .from(sales)
    .where(and(gte(sales.saleDate, since), eq(sales.channel, "detal")))
    .orderBy(desc(sales.saleDate), desc(sales.id))
    .limit(150);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.saleId);
  const [items, states] = await Promise.all([
    db
      .select({ saleId: saleItems.saleId, productName: saleItems.productName })
      .from(saleItems)
      .where(and(inArray(saleItems.saleId, ids), isNotNull(saleItems.productId))),
    getReviewRequestStates(ids),
  ]);

  const names = new Map<number, string[]>();
  for (const item of items) {
    const list = names.get(item.saleId) ?? [];
    if (!list.includes(item.productName)) list.push(item.productName);
    names.set(item.saleId, list);
  }

  return rows
    .filter((row) => names.has(row.saleId))
    .map((row) => ({
      ...row,
      productNames: names.get(row.saleId) ?? [],
      askedLabel: states.get(row.saleId)?.askedLabel ?? null,
      reviewCount: states.get(row.saleId)?.reviewCount ?? 0,
    }));
}

export async function markReviewRequested(saleId: number) {
  const db = getDb();
  const now = new Date();
  await db
    .insert(reviewRequests)
    .values({ saleId, askedAt: now })
    .onConflictDoUpdate({ target: reviewRequests.saleId, set: { askedAt: now } });
}
