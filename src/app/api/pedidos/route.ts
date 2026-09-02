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
  PAYMENT_METHODS,
  deliveryPriceForZone,
} from "@/lib/config";

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
  const products = await getProductsByKeys([
    ...new Set(requested.map((line) => line.key)),
  ]);

  const items: PendingOrderItem[] = [];
  for (const line of requested) {
    const product = products.find((p) => p.key === line.key);
    const size = product?.sizes.find((s) => s.grams === line.grams);
    // Un producto o un tamaño que no existe se ignora en vez de tumbar el
    // pedido entero: el resto de lo que pidió sigue siendo un pedido válido.
    if (!product || !size) continue;
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
  // tarifa publicada queda en null y se cobra al confirmar.
  const deliveryFeeUsd =
    deliveryKey === "delivery" ? deliveryPriceForZone(zone) : null;

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
