import { after } from "next/server";
import { getProductsByKeys } from "@/lib/products-data";
import { productTitle, sizeLabel } from "@/lib/products";
import {
  createPendingOrder,
  type PendingOrderItem,
} from "@/lib/pending-orders-data";
import { sendAdminPush } from "@/lib/push";
import {
  DELIVERY_ZONES,
  NATIONAL_COURIERS,
  LANDING_FREE_DELIVERY,
  PAYMENT_METHODS,
  deliveryPriceForZone,
  hasFreeDeliveryPromo,
} from "@/lib/config";
import {
  UPSELL_MAX_QTY,
  hasLandingPack,
  upsellFor,
} from "@/app/promomani/packs";

/**
 * El pedido que entra desde el checkout de la tienda.
 *
 * Se llama al tocar "Confirmar pedido por WhatsApp": el cliente se va a la
 * conversación y su pedido queda acá, pendiente, esperando que se verifique el
 * pago. Todavía no es una venta —eso lo decide quien aprieta "Confirmar" en el
 * panel— y por eso no toca stock, ni Finanzas, ni la ficha del cliente.
 *
 * Es público, así que nada de lo que manda el navegador se cree: los precios
 * se releen del catálogo y la tarifa del delivery de la lista de zonas. Lo
 * único que se guarda tal cual es lo que sólo el cliente sabe —su nombre, su
 * teléfono, su dirección—, que es texto y va a los ojos de una persona.
 */

/** Un pedido con más de esto no es un pedido, es alguien probando. */
const MAX_LINES = 30;
const MAX_QTY_PER_LINE = 50;
const MAX_TEXT = 300;

const DELIVERY_METHODS = {
  pickup: "Pickup",
  delivery: "Delivery",
  nacional: "Envío nacional",
} as const;

type DeliveryKey = keyof typeof DELIVERY_METHODS;

function isDeliveryKey(value: unknown): value is DeliveryKey {
  return typeof value === "string" && value in DELIVERY_METHODS;
}

/** Texto de un cliente: recortado, sin espacios de sobra, vacío es null. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, MAX_TEXT) || null;
}

/**
 * Un tope por IP, por si a alguien se le ocurre llenar la bandeja.
 *
 * Vive en memoria del proceso, así que con varias instancias el tope es por
 * instancia y se reinicia con cada despliegue. Es a propósito: lo que hay que
 * frenar es el click repetido y el script tonto, no un ataque — y para eso no
 * vale la pena montar un contador en la base.
 */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // La tabla no puede crecer sin fin: cuando se llena se limpia lo vencido.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocido";
  if (rateLimited(ip)) {
    return Response.json({ error: "Demasiados pedidos seguidos." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  if (rawItems.length === 0 || rawItems.length > MAX_LINES) {
    return Response.json({ error: "El pedido no tiene líneas válidas." }, { status: 400 });
  }

  // Lo que pidió, saneado, antes de ir a buscar los productos.
  const requested = rawItems
    .map((raw) => {
      const line = raw as Record<string, unknown>;
      return {
        key: typeof line.key === "string" ? line.key : "",
        grams: Number(line.grams),
        qty: Math.floor(Number(line.qty)),
      };
    })
    .filter(
      (line) =>
        line.key &&
        Number.isFinite(line.grams) &&
        Number.isFinite(line.qty) &&
        line.qty >= 1 &&
        line.qty <= MAX_QTY_PER_LINE,
    );

  if (requested.length === 0) {
    return Response.json({ error: "El pedido no tiene líneas válidas." }, { status: 400 });
  }

  // Los productos se piden por `key` sin filtrar por vitrina: los packs de las
  // landings de promoción son productos reales que no se muestran en la tienda.
  // Junto con lo pedido se traen los frascos normales de los agregados de la
  // landing, por si hay que cobrar alguno a precio de tienda (ver abajo).
  const products = await getProductsByKeys([
    ...new Set(
      requested.flatMap((line) => {
        const upsell = upsellFor(line.key);
        return upsell ? [line.key, upsell.regularKey] : [line.key];
      }),
    ),
  ]);

  // El precio de promo de un agregado sólo vale con un pack de la landing en
  // el mismo pedido, y una vez. Lo que sobre se cobra como el frasco normal de
  // la tienda: el cliente se lleva lo que pidió, sin la rebaja que no ganó.
  // Cuenta sólo un pack que exista de verdad en el catálogo.
  const packed = hasLandingPack(
    requested
      .filter((line) =>
        products.some(
          (p) => p.key === line.key && p.sizes.some((s) => s.grams === line.grams),
        ),
      )
      .map((line) => line.key),
  );
  const promoLeft = new Map<string, number>();
  const lines: { key: string; grams: number; qty: number }[] = [];
  for (const line of requested) {
    const upsell = upsellFor(line.key);
    if (!upsell) {
      lines.push(line);
      continue;
    }
    const left = packed ? (promoLeft.get(line.key) ?? UPSELL_MAX_QTY) : 0;
    const atPromo = Math.min(line.qty, left);
    promoLeft.set(line.key, left - atPromo);
    if (atPromo > 0) lines.push({ ...line, qty: atPromo });
    if (line.qty > atPromo) {
      lines.push({ key: upsell.regularKey, grams: line.grams, qty: line.qty - atPromo });
    }
  }

  const items: PendingOrderItem[] = [];
  for (const line of lines) {
    const product = products.find((p) => p.key === line.key);
    const size = product?.sizes.find((s) => s.grams === line.grams);
    // Un producto o un tamaño que no existe se ignora en vez de tumbar el
    // pedido entero: el resto de lo que pidió sigue siendo un pedido válido.
    if (!product || !size) continue;
    // Dos líneas del mismo frasco (el normal que ya pidió y el que se pasó de
    // la promo) se juntan en una.
    const same = items.find((i) => i.key === product.key && i.grams === size.grams);
    if (same) {
      same.quantity += line.qty;
      continue;
    }
    items.push({
      key: product.key,
      name: `${productTitle(product)} ${sizeLabel(product, size)}`,
      grams: size.grams,
      quantity: line.qty,
      // El precio sale del catálogo, no del navegador.
      unitPriceUsd: size.price,
    });
  }

  if (items.length === 0) {
    return Response.json({ error: "Ningún producto del pedido existe." }, { status: 400 });
  }

  const deliveryKey = isDeliveryKey(payload.deliveryMethod)
    ? payload.deliveryMethod
    : "delivery";
  const zoneName = text(payload.zone);
  const zone =
    deliveryKey === "delivery"
      ? DELIVERY_ZONES.find((z) => z.name === zoneName)?.name ?? zoneName
      : null;
  // La tarifa es la de la lista, no la que diga el navegador. Una zona sin
  // tarifa publicada queda en null y se cobra al confirmar. La promo de la
  // landing se recalcula acá con los productos que de verdad trae el pedido.
  const freeDelivery =
    deliveryKey === "delivery" &&
    zone !== null &&
    LANDING_FREE_DELIVERY.zones.includes(zone) &&
    hasFreeDeliveryPromo(
      text(payload.promo),
      items.map((item) => item.key),
    );
  const deliveryFeeUsd = freeDelivery
    ? 0
    : deliveryKey === "delivery"
      ? deliveryPriceForZone(zone)
      : null;

  const courierRaw = text(payload.courier);
  const courier =
    deliveryKey === "nacional"
      ? NATIONAL_COURIERS.find((c) => c === courierRaw) ?? courierRaw
      : null;

  const paymentRaw = text(payload.paymentMethod);
  const paymentMethod = PAYMENT_METHODS.find((m) => m === paymentRaw) ?? null;

  const subtotalUsd = items.reduce(
    (sum, item) => sum + item.unitPriceUsd * item.quantity,
    0,
  );
  const amountUsd = subtotalUsd + (deliveryFeeUsd ?? 0);

  const order = await createPendingOrder({
    items,
    subtotalUsd,
    deliveryFeeUsd,
    amountUsd,
    customerName: text(payload.name),
    customerPhone: text(payload.phone),
    paymentMethod,
    paymentClaimed: payload.paymentClaimed === true,
    deliveryMethod: DELIVERY_METHODS[deliveryKey],
    deliveryZone: zone,
    address: deliveryKey === "nacional" ? null : text(payload.address),
    courier,
    idCard: deliveryKey === "nacional" ? text(payload.idCard) : null,
    agency: deliveryKey === "nacional" ? text(payload.agency) : null,
  });

  // El aviso sale después de responder: el cliente no tiene por qué esperar a
  // que Google y Apple contesten para que se le abra WhatsApp.
  after(async () => {
    const detail = items
      .map((item) => `${item.quantity}× ${item.name}`)
      .join(", ");
    const who = order.customerName ?? "Alguien";
    const how =
      order.deliveryMethod === "Delivery" && order.deliveryZone
        ? `Delivery ${order.deliveryZone}`
        : order.deliveryMethod ?? "";

    await sendAdminPush({
      title: `Vendiste $${amountUsd.toFixed(2)}`,
      body: [`${who} · ${detail}`, [how, order.paymentMethod].filter(Boolean).join(" · ")]
        .filter(Boolean)
        .join("\n"),
      url: "/admin/ventas",
      // Tag propio por pedido: dos pedidos seguidos son dos avisos, no uno que
      // pisa al anterior.
      tag: `pedido-${order.id}`,
    });
  });

  return Response.json({ ok: true, id: order.id }, { status: 201 });
}
