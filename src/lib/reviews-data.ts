import "server-only";
import { cache } from "react";
import { and, count, desc, eq, gte, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb } from "./db";
import { foldText } from "./customers";
import {
  products,
  reviewInvites,
  reviewRequests,
  reviews,
  saleItems,
  sales,
} from "./db/schema";
import { productTitle, type ProductKind } from "./products";
import {
  REVIEWS_MIN_TO_SHOW,
  isReviewStatus,
  type AdminReview,
  type ProductReviews,
  type PublicReview,
  type RatingSummary,
  type ReviewInviteSummary,
  type ReviewRef,
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

// El buscador del panel ignora tildes y mayúsculas en los dos lados: lo que
// se escribe pasa por `foldText`, y la columna por `lower` + `translate`, que
// hace lo mismo sin depender de la extensión `unaccent` en la base.
const ACCENTED = "áàäâãéèëêíìïîóòöôõúùüûñ";
const PLAIN = "aaaaaeeeeiiiiooooouuuun";

/** Lo escrito en el buscador como patrón LIKE, o null si no hay nada que buscar. */
function searchPattern(query: string | undefined): string | null {
  const term = foldText(query ?? "").trim().replace(/\s+/g, " ");
  if (!term) return null;
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

function nameLike(column: AnyPgColumn, pattern: string): SQL {
  return sql`translate(lower(${column}), ${ACCENTED}, ${PLAIN}) like ${pattern}`;
}

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
    verified: row.inviteId === null,
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

export interface ReviewTarget {
  ref: ReviewRef;
  customerName: string | null;
  products: ReviewableProduct[];
  /**
   * Si la persona tiene que marcar qué productos probó. Pasa con los enlaces
   * hechos a mano sin productos elegidos: no hay venta de donde sacarlos.
   */
  choose: boolean;
}

const productCardFields = {
  id: products.id,
  name: products.name,
  kind: products.kind,
  image: products.image,
  imageCutout: products.imageCutout,
  bgClass: products.bgClass,
  sortOrder: products.sortOrder,
};

function toReviewable(
  items: {
    id: number;
    name: string;
    kind: string;
    image: string;
    imageCutout: boolean;
    bgClass: string;
    sortOrder: number;
  }[],
  reviewed: Set<number>,
): ReviewableProduct[] {
  return [...items]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => ({
      id: item.id,
      title: titleOf(item),
      image: item.image,
      imageCutout: item.imageCutout,
      bgClass: item.bgClass,
      reviewed: reviewed.has(item.id),
    }));
}

/** A quién es el enlace y qué puede reseñar, marcando lo que ya reseñó. */
export async function getReviewTarget(ref: ReviewRef): Promise<ReviewTarget | null> {
  const db = getDb();

  if (ref.kind === "sale") {
    const [sale] = await db
      .select({ customerName: sales.customerName })
      .from(sales)
      .where(eq(sales.id, ref.id))
      .limit(1);
    if (!sale) return null;

    const [items, done] = await Promise.all([
      db
        .selectDistinct(productCardFields)
        .from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(eq(saleItems.saleId, ref.id)),
      db
        .select({ productId: reviews.productId })
        .from(reviews)
        .where(eq(reviews.saleId, ref.id)),
    ]);

    return {
      ref,
      customerName: sale.customerName,
      choose: false,
      products: toReviewable(items, new Set(done.map((row) => row.productId))),
    };
  }

  const [invite] = await db
    .select()
    .from(reviewInvites)
    .where(eq(reviewInvites.id, ref.id))
    .limit(1);
  if (!invite) return null;

  const chosen = invite.productIds;
  const [items, done] = await Promise.all([
    db
      .select(productCardFields)
      .from(products)
      .where(
        chosen.length > 0 ? inArray(products.id, chosen) : eq(products.inStore, true),
      ),
    db
      .select({ productId: reviews.productId })
      .from(reviews)
      .where(eq(reviews.inviteId, ref.id)),
  ]);

  return {
    ref,
    customerName: invite.customerName,
    choose: chosen.length === 0,
    products: toReviewable(items, new Set(done.map((row) => row.productId))),
  };
}

/**
 * Guarda las reseñas de un enlace. Si alguna ya existía —el mismo enlace
 * enviado dos veces, dos pestañas abiertas— se salta en silencio. Devuelve
 * cuántas entraron de verdad.
 */
export async function createReviews(
  ref: ReviewRef,
  authorName: string,
  entries: { productId: number; rating: number; comment: string | null }[],
): Promise<number> {
  if (entries.length === 0) return 0;
  const db = getDb();
  const owner = ref.kind === "sale" ? { saleId: ref.id } : { inviteId: ref.id };
  const inserted = await db
    .insert(reviews)
    .values(
      entries.map((entry) => ({
        ...owner,
        productId: entry.productId,
        rating: entry.rating,
        comment: entry.comment,
        authorName,
      })),
    )
    .onConflictDoNothing({
      target:
        ref.kind === "sale"
          ? [reviews.saleId, reviews.productId]
          : [reviews.inviteId, reviews.productId],
    })
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

/**
 * Las reseñas de un estado. Con búsqueda, las de quien firmó con ese nombre o
 * las que salieron de la venta o del enlace de alguien que se llama así: la
 * gente firma "María G." y se la busca como "María González".
 */
export async function getAdminReviews(
  status: ReviewStatus,
  query?: string,
): Promise<AdminReview[]> {
  const db = getDb();
  const pattern = searchPattern(query);
  const rows = await db
    .select({
      review: reviews,
      product: { ...productFields, inStore: products.inStore },
      saleDate: sales.saleDate,
      customerName: sales.customerName,
      customerId: sales.customerId,
      inviteName: reviewInvites.customerName,
    })
    .from(reviews)
    .innerJoin(products, eq(reviews.productId, products.id))
    .leftJoin(sales, eq(reviews.saleId, sales.id))
    .leftJoin(reviewInvites, eq(reviews.inviteId, reviewInvites.id))
    .where(
      pattern
        ? and(
            eq(reviews.status, status),
            or(
              nameLike(reviews.authorName, pattern),
              nameLike(sales.customerName, pattern),
              nameLike(reviewInvites.customerName, pattern),
            ),
          )
        : eq(reviews.status, status),
    )
    .orderBy(desc(reviews.createdAt), desc(reviews.id))
    .limit(200);

  return rows.map(({ review, product, saleDate, customerName, customerId, inviteName }) => ({
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
    inviteName,
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
 *
 * Con búsqueda no hay tope de fecha: si se busca a alguien por nombre es
 * porque se lo quiere encontrar, aunque haya comprado hace un año.
 */
export async function getReviewRequestCandidates(
  query?: string,
): Promise<ReviewRequestCandidate[]> {
  const db = getDb();
  const pattern = searchPattern(query);
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
    .where(
      and(
        eq(sales.channel, "detal"),
        pattern ? nameLike(sales.customerName, pattern) : gte(sales.saleDate, since),
      ),
    )
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

// ── Enlaces hechos a mano ───────────────────────────────────────────────────

/**
 * Crea un enlace para alguien sin venta registrada. De los productos elegidos
 * sólo quedan los que siguen en la vitrina: un id que no existe haría un
 * enlace que no deja reseñar nada.
 */
export async function createReviewInvite(input: {
  customerName: string;
  customerPhone: string | null;
  productIds: number[];
}) {
  const db = getDb();
  const productIds =
    input.productIds.length > 0
      ? (
          await db
            .select({ id: products.id })
            .from(products)
            .where(and(inArray(products.id, input.productIds), eq(products.inStore, true)))
        ).map((row) => row.id)
      : [];

  const [invite] = await db
    .insert(reviewInvites)
    .values({
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      productIds,
    })
    .returning();
  return invite;
}

/** Los enlaces hechos a mano más recientes, con si ya opinaron. */
export async function getReviewInvites(query?: string): Promise<ReviewInviteSummary[]> {
  const db = getDb();
  const pattern = searchPattern(query);
  const rows = await db
    .select()
    .from(reviewInvites)
    .where(pattern ? nameLike(reviewInvites.customerName, pattern) : undefined)
    .orderBy(desc(reviewInvites.createdAt), desc(reviewInvites.id))
    .limit(50);
  if (rows.length === 0) return [];

  const productIds = [...new Set(rows.flatMap((row) => row.productIds))];
  const productRows =
    productIds.length > 0
      ? await db
          .select({ id: products.id, name: products.name, kind: products.kind })
          .from(products)
          .where(inArray(products.id, productIds))
      : [];
  const counts = await db
    .select({ inviteId: reviews.inviteId, count: count() })
    .from(reviews)
    .where(
      inArray(
        reviews.inviteId,
        rows.map((row) => row.id),
      ),
    )
    .groupBy(reviews.inviteId);

  const titles = new Map(productRows.map((p) => [p.id, titleOf(p)]));
  const reviewCounts = new Map(counts.map((row) => [row.inviteId, row.count]));

  return rows.map((row) => ({
    id: row.id,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    createdLabel: fullDayFormat.format(row.createdAt),
    productTitles: row.productIds
      .map((id) => titles.get(id))
      .filter((title): title is string => Boolean(title)),
    reviewCount: reviewCounts.get(row.id) ?? 0,
  }));
}

/**
 * Borra un enlace hecho a mano que nadie usó. Uno con reseñas no se borra:
 * es lo que dice de dónde salió cada una, y sin él pasarían a mostrarse como
 * compra verificada.
 */
export async function deleteReviewInvite(id: number) {
  const db = getDb();
  const [row] = await db
    .select({ count: count() })
    .from(reviews)
    .where(eq(reviews.inviteId, id));
  if ((row?.count ?? 0) > 0) {
    throw new Error("Esta persona ya opinó, así que su enlace no se puede borrar.");
  }
  await db.delete(reviewInvites).where(eq(reviewInvites.id, id));
}
