/**
 * Los eventos que el sitio le reporta al pixel de Meta.
 *
 * Todos pasan por `track`, que no hace nada si `fbq` no existe: eso ocurre
 * cuando `META_PIXEL_ID` está vacío, cuando el visitante bloquea el script y en
 * el servidor. Así los componentes llaman sin preguntar si el pixel cargó.
 *
 * Lo que Meta hace con esto: con PageView sólo puede armar públicos de "gente
 * que entró". Con estos eventos puede optimizar la campaña hacia quien agrega
 * al carrito, que es la diferencia entre pagar por visitas y pagar por
 * clientes.
 */
import type { CartItem } from "./cart-context";

// Todo el sitio cotiza en dólares (el monto en bolívares del Pago Móvil se
// calcula a tasa BCV al momento de pagar, y no es lo que vale el producto).
declare global {
  interface Window {
    // La cola que crea el código base de Meta en <MetaPixel>.
    fbq?: (...args: unknown[]) => void;
  }
}

const CURRENCY = "USD";

type PixelParams = Record<string, unknown>;

function track(event: string, params?: PixelParams) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", event, params);
}

/**
 * Cómo se identifica un frasco ante Meta. Cada tamaño es un producto distinto
 * porque tiene su propio precio. Si algún día se sube el catálogo a Meta
 * (para anuncios dinámicos), los IDs de allá tienen que coincidir con estos.
 */
export function contentId(key: string, grams: number) {
  return `${key}-${grams}`;
}

export function trackPageView() {
  track("PageView");
}

/** Alguien abrió la página de un producto. */
export function trackViewContent(params: {
  key: string;
  grams: number;
  name: string;
  price: number;
}) {
  track("ViewContent", {
    content_ids: [contentId(params.key, params.grams)],
    content_type: "product",
    content_name: params.name,
    value: params.price,
    currency: CURRENCY,
  });
}

/** Alguien agregó frascos al pedido. */
export function trackAddToCart(params: {
  key: string;
  grams: number;
  price: number;
  qty?: number;
}) {
  const qty = params.qty ?? 1;
  const id = contentId(params.key, params.grams);
  track("AddToCart", {
    content_ids: [id],
    // La cantidad viaja en `contents`; `content_ids` sólo puede decir cuál
    // frasco fue. Sin esto, agregar tres frascos le llega a Meta como el valor
    // de uno, y la campaña optimiza contra un ticket más bajo que el real.
    contents: [{ id, quantity: qty, item_price: params.price }],
    content_type: "product",
    value: params.price * qty,
    currency: CURRENCY,
  });
}

/**
 * Alguien se fue a WhatsApp con el pedido armado. Es lo último que el sitio
 * puede ver: la venta se cierra en el chat, así que Purchase no se dispara
 * nunca desde acá. Para eso haría falta mandarlo desde el panel al registrar la
 * venta, con la API de Conversiones.
 */
export function trackInitiateCheckout(items: CartItem[], total: number) {
  track("InitiateCheckout", {
    content_ids: items.map((i) => contentId(i.key, i.grams)),
    contents: items.map((i) => ({
      id: contentId(i.key, i.grams),
      quantity: i.qty,
      item_price: i.price,
    })),
    content_type: "product",
    num_items: items.reduce((sum, i) => sum + i.qty, 0),
    value: total,
    currency: CURRENCY,
  });
}
