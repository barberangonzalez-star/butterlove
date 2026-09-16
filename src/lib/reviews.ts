/**
 * Lo que comparten la tienda, el formulario de /opinar y el panel sobre las
 * reseñas: tipos, límites y cómo se muestran. Nada de aquí toca la base de
 * datos, así que corre también en el navegador.
 */

export const REVIEW_STATUSES = ["pendiente", "publicada", "oculta"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return REVIEW_STATUSES.includes(value as ReviewStatus);
}

/**
 * Desde cuántas reseñas publicadas un producto muestra estrellas. Con una o
 * dos el promedio no dice nada y la sección se ve vacía, que es peor que no
 * mostrar nada. Vale también para la franja de la página principal.
 */
export const REVIEWS_MIN_TO_SHOW = 3;

export const REVIEW_COMMENT_MAX = 600;
/**
 * Lo mínimo que tiene que decir un comentario donde es obligatorio, que es el
 * enlace general. Sin mínimo, un "ok" contaría como opinión y ocuparía en la
 * ficha del producto el mismo espacio que una que sí dice algo.
 */
export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_NAME_MAX = 40;
export const REVIEW_REPLY_MAX = 600;
/** Nombre y apellido juntos, en un enlace hecho a mano. */
export const INVITE_NAME_MAX = 60;

/**
 * De dónde sale un enlace para opinar: de una venta registrada o de uno hecho
 * a mano en el panel para alguien sin venta.
 */
export interface ReviewRef {
  kind: "sale" | "invite";
  id: number;
}

/**
 * Quién está opinando, desde el punto de vista del formulario: el enlace
 * personal de alguien —de una venta o hecho a mano— o el enlace general, que
 * es uno solo, no lleva firma y lo abre cualquiera.
 */
export type ReviewOrigin = ReviewRef | { kind: "general" };

/**
 * De dónde salió una reseña, tal como queda guardada.
 *
 * Se guarda en la fila en vez de deducirse de `sale_id` e `invite_id` porque
 * borrar una venta pone su `sale_id` en null, y esa reseña sigue siendo de
 * alguien que compró: sin esta columna pasaría a presentarse igual que una del
 * enlace general, que no respalda ninguna compra.
 */
export const REVIEW_SOURCES = ["venta", "enlace", "general"] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

/** La columna saneada. Lo que no se reconozca cuenta como venta, que es de donde salieron las primeras. */
export function reviewSource(value: unknown): ReviewSource {
  return REVIEW_SOURCES.includes(value as ReviewSource)
    ? (value as ReviewSource)
    : "venta";
}

/** Lo que dice el formulario debajo de las estrellas elegidas. */
export const RATING_LABELS: Record<number, string> = {
  1: "No me gustó",
  2: "Regular",
  3: "Está bien",
  4: "Muy buena",
  5: "¡Me encantó!",
};

export interface RatingSummary {
  average: number;
  count: number;
}

/** Una reseña publicada, tal como la ve cualquiera en la tienda. */
export interface PublicReview {
  id: number;
  rating: number;
  comment: string | null;
  authorName: string;
  reply: string | null;
  /**
   * Si salió del enlace de una venta registrada. Las de enlaces hechos a mano
   * y las del enlace general no se presentan como compra verificada: nada en
   * el sistema lo respalda.
   */
  verified: boolean;
  /** "septiembre de 2026", ya formateado en el servidor. */
  dateLabel: string;
  /** YYYY-MM-DD, para los datos estructurados. */
  datePublished: string;
  productKey: string;
  productTitle: string;
}

export interface ProductReviews {
  summary: RatingSummary;
  /** Cuántas hay de cada nota: el índice 0 es 1 estrella, el 4 son 5. */
  distribution: number[];
  reviews: PublicReview[];
}

/** Un producto de la venta en el formulario de /opinar. */
export interface ReviewableProduct {
  id: number;
  title: string;
  image: string;
  imageCutout: boolean;
  bgClass: string;
  /** Si ya dejó su reseña de este producto con este mismo enlace. */
  reviewed: boolean;
}

/** Una reseña en el panel, con la venta de la que salió. */
export interface AdminReview {
  id: number;
  rating: number;
  comment: string | null;
  authorName: string;
  reply: string | null;
  status: ReviewStatus;
  source: ReviewSource;
  /** DD/MM/YYYY, ya formateado en el servidor. */
  createdLabel: string;
  productKey: string;
  productTitle: string;
  /** Si el producto está en la vitrina: sólo entonces tiene ficha pública. */
  inStore: boolean;
  saleDate: string | null;
  customerName: string | null;
  customerId: number | null;
  /** A quién se le hizo el enlace a mano, si la reseña salió de uno. */
  inviteName: string | null;
}

/** Un enlace hecho a mano, en la lista del panel. */
export interface ReviewInviteSummary {
  id: number;
  customerName: string;
  customerPhone: string | null;
  /** DD/MM/YYYY, ya formateado en el servidor. */
  createdLabel: string;
  /** Vacío si la persona elige qué productos probó. */
  productTitles: string[];
  reviewCount: number;
}

export const formatRating = (value: number) => value.toFixed(1);

export const reviewCountLabel = (count: number) =>
  `${count} reseña${count === 1 ? "" : "s"}`;

/**
 * El nombre con el que se propone firmar: "María José González" queda
 * "María G.". Es lo que la mayoría elegiría, y nadie aparece en la tienda con
 * su nombre completo sin haberlo escrito así.
 */
export function publicAuthorName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : null;
  return last ? `${first} ${last[0].toUpperCase()}.` : first;
}
