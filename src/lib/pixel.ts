/**
 * Los eventos que el sitio reporta: al pixel de Meta y a Google Analytics.
 *
 * Todos pasan por `track` y `gtagEvent`, que no hacen nada si `fbq` o `gtag`
 * no existen: eso ocurre cuando `META_PIXEL_ID` está vacío, cuando el visitante
 * bloquea los scripts y en el servidor. Así los componentes llaman sin
 * preguntar si algo cargó.
 *
 * Los dos miden lo mismo pero sirven para cosas distintas. Meta necesita los
 * eventos para optimizar la campaña hacia quien agrega al carrito, que es la
 * diferencia entre pagar por visitas y pagar por clientes. GA4 es para nosotros:
 * es donde se ve en cuál paso del checkout se cae la gente, que es lo que un
 * pixel de anuncios no responde.
 */
import type { CartItem } from "./cart-context";

// Todo el sitio cotiza en dólares (el monto en bolívares del Pago Móvil se
// calcula a tasa BCV al momento de pagar, y no es lo que vale el producto).
declare global {
  interface Window {
    // La cola que crea el código base de Meta en <MetaPixel>.
    fbq?: (...args: unknown[]) => void;
    // La que crea el snippet de gtag.js en <GoogleAnalytics>.
    gtag?: (...args: unknown[]) => void;
  }
}

const CURRENCY = "USD";

type PixelParams = Record<string, unknown>;

function track(event: string, params?: PixelParams) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", event, params);
}

/**
 * Lo mismo hacia GA4. Va en una función aparte y no en un solo helper que
 * mande a los dos, porque no son el mismo evento con dos nombres: Meta dice
 * `ViewContent` donde Google dice `view_item`, cada uno espera los productos
 * con otra forma, y en el checkout Google tiene pasos que Meta no tiene.
 */
function gtagEvent(event: string, params?: PixelParams) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}

/**
 * Cómo se identifica un frasco ante Meta. Cada tamaño es un producto distinto
 * porque tiene su propio precio. Si algún día se sube el catálogo a Meta
 * (para anuncios dinámicos), los IDs de allá tienen que coincidir con estos.
 */
export function contentId(key: string, grams: number) {
  return `${key}-${grams}`;
}

/** Un frasco en el formato de artículo que espera GA4. */
function gaItem(item: {
  key: string;
  grams: number;
  price: number;
  qty?: number;
}) {
  return {
    item_id: contentId(item.key, item.grams),
    item_name: item.key,
    item_variant: `${item.grams} g`,
    price: item.price,
    quantity: item.qty ?? 1,
  };
}

/** Los frascos del pedido como los espera Meta. */
function metaContents(items: CartItem[]) {
  return items.map((i) => ({
    id: contentId(i.key, i.grams),
    quantity: i.qty,
    item_price: i.price,
  }));
}

/**
 * Sólo para Meta: su pixel no se entera de los cambios de ruta, porque moverse
 * entre páginas no recarga nada. GA4 sí los cuenta solo (la "medición mejorada"
 * escucha el historial del navegador), así que mandarle un `page_view` a mano
 * duplicaría cada vista.
 */
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
  gtagEvent("view_item", {
    currency: CURRENCY,
    value: params.price,
    items: [{ ...gaItem(params), item_name: params.name }],
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
  gtagEvent("add_to_cart", {
    currency: CURRENCY,
    value: params.price * qty,
    items: [gaItem({ ...params, qty })],
  });
}

/**
 * Los pasos del checkout, que son el embudo que de verdad importa: entre abrir
 * el carrito y escribir por WhatsApp hay tres pantallas donde la gente se cae,
 * y sin esto no hay manera de saber en cuál.
 *
 * El evento se manda al *entrar* a cada paso, o sea cuando el anterior quedó
 * completo: llegar a "payment" significa que los datos de entrega ya están
 * llenos, y llegar a "summary" que ya eligió cómo paga.
 *
 * Los nombres de GA4 no son inventados: son los del embudo estándar de
 * ecommerce, y usar esos y no unos propios es lo que hace que los informes de
 * compras de GA4 funcionen solos.
 */
export type CheckoutStep = "info" | "payment" | "summary";

const CHECKOUT_STEP_EVENTS: Record<
  CheckoutStep,
  { ga: string; meta?: string }
> = {
  info: { ga: "begin_checkout" },
  payment: { ga: "add_shipping_info" },
  // Meta sí tiene este paso y le sirve: es de los eventos con los que sabe
  // distinguir al curioso del que iba en serio.
  summary: { ga: "add_payment_info", meta: "AddPaymentInfo" },
};

export function trackCheckoutStep(
  step: CheckoutStep,
  items: CartItem[],
  total: number,
) {
  const { ga, meta } = CHECKOUT_STEP_EVENTS[step];
  gtagEvent(ga, {
    currency: CURRENCY,
    value: total,
    items: items.map(gaItem),
  });
  if (meta) {
    track(meta, {
      content_ids: items.map((i) => contentId(i.key, i.grams)),
      contents: metaContents(items),
      content_type: "product",
      value: total,
      currency: CURRENCY,
    });
  }
}

/**
 * Alguien se fue a WhatsApp con el pedido armado. Es lo último que el sitio
 * puede ver: la venta se cierra en el chat, así que Purchase no se dispara
 * nunca desde acá. Para eso haría falta mandarlo desde el panel al registrar la
 * venta, con la API de Conversiones.
 *
 * En GA4 va como evento propio (`whatsapp_checkout`) porque el catálogo
 * estándar no tiene nada para "se fue a cerrar la compra a otro lado". Es el
 * que hay que marcar como conversión clave en GA4; ninguno de los otros lo es.
 */
export function trackInitiateCheckout(items: CartItem[], total: number) {
  track("InitiateCheckout", {
    content_ids: items.map((i) => contentId(i.key, i.grams)),
    contents: metaContents(items),
    content_type: "product",
    num_items: items.reduce((sum, i) => sum + i.qty, 0),
    value: total,
    currency: CURRENCY,
  });
  gtagEvent("whatsapp_checkout", {
    currency: CURRENCY,
    value: total,
    items: items.map(gaItem),
  });
}
