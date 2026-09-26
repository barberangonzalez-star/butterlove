import "server-only";
import { revalidatePath } from "next/cache";
import { createSale, getSaleById, type SaleItemInput } from "./sales-data";
import { getAdminProducts, type AdminProduct } from "./products-data";
import { getSizeCosts } from "./costs-data";
import { getWholesaleUnitPrices } from "./wholesale-data";
import { consumeInventoryForSale, sizeIdOf } from "./sale-inventory";
import { ensureCustomer, setCustomerZone } from "./customers-data";
import { getBcvRates } from "./bcv";
import { foldText } from "./customers";
import { isIsoDate, today } from "./period";
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  stateForZone,
  type SaleChannel,
} from "./config";
import { matchProduct } from "./product-match";
import { productTitle, sizeLabel } from "./products";
import { fmtUsd } from "./quote";

/**
 * Registrar una venta desde el chat de Bruno.
 *
 * Va en dos pasos a propósito. `draftSale` sólo lee: entiende lo que se dijo
 * en el chat —el sabor como se habla, "ayer", "el lunes"— y lo convierte en un
 * borrador con los productos del catálogo, los precios y el total ya
 * calculados. `recordSale` recibe ese borrador y escribe, y el chat no lo deja
 * correr hasta que el dueño toca "Registrar" en la tarjeta que lo muestra.
 *
 * Así lo que se aprueba es exactamente lo que se guarda: la tarjeta pinta el
 * mismo borrador que llega a `recordSale`, no un resumen que el modelo
 * redactó aparte y que podría no cuadrar.
 */

/** Dos decimales, que es como se habla de dólares. */
const usd = (n: number) => Math.round(n * 100) / 100;

const WEEKDAYS = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
  "domingo",
];

const parseDay = (iso: string) => new Date(`${iso}T00:00:00Z`);
const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const daysBefore = (iso: string, days: number) =>
  isoDay(new Date(parseDay(iso).getTime() - days * 86_400_000));

export interface SaleDateInput {
  fecha?: string;
  haceDias?: number;
  diaDeLaSemana?: string;
}

/**
 * La fecha de la venta, resuelta en código.
 *
 * El modelo no calcula fechas: dice "hace 1 día" o "el lunes" y la cuenta se
 * hace acá, contra el mismo `today()` que usa el formulario. "El lunes" es el
 * último lunes que ya pasó, hoy incluido: nadie registra una venta que todavía
 * no ocurrió.
 */
export function resolveSaleDate(
  input: SaleDateInput,
): { fecha: string } | { error: string } {
  const hoy = today();

  if (input.fecha !== undefined) {
    if (!isIsoDate(input.fecha)) {
      return { error: `"${input.fecha}" no es una fecha YYYY-MM-DD.` };
    }
    if (input.fecha > hoy) {
      return { error: `${input.fecha} es una fecha futura; hoy es ${hoy}.` };
    }
    return { fecha: input.fecha };
  }

  if (input.diaDeLaSemana !== undefined) {
    const wanted = WEEKDAYS.indexOf(foldText(input.diaDeLaSemana).trim());
    if (wanted < 0) {
      return { error: `"${input.diaDeLaSemana}" no es un día de la semana.` };
    }
    // getUTCDay da 0 el domingo; se corre para que 0 sea el lunes.
    const current = (parseDay(hoy).getUTCDay() + 6) % 7;
    return { fecha: daysBefore(hoy, (current - wanted + 7) % 7) };
  }

  const back = Number.isInteger(input.haceDias) ? Math.abs(input.haceDias as number) : 0;
  return { fecha: daysBefore(hoy, back) };
}

/** Una línea del borrador: ya atada a un producto y un tamaño del catálogo. */
export interface DraftLine {
  productoId: number;
  producto: string;
  gramos: number;
  cantidad: number;
  precioUnitarioUsd: number;
}

/** Lo que `registrarVenta` recibe y la tarjeta de aprobación muestra. */
export interface SaleDraft {
  fecha: string;
  canal: SaleChannel;
  cliente?: string;
  telefono?: string;
  metodoPago: string;
  entrega?: string;
  proveedorEntrega?: string;
  zona?: string;
  estado?: string;
  cobroEntregaUsd?: number;
  lineas: DraftLine[];
  totalUsd: number;
  notas?: string;
}

export interface DraftRequest extends SaleDateInput {
  canal?: SaleChannel;
  cliente?: string;
  telefono?: string;
  metodoPago?: string;
  entrega?: string;
  proveedorEntrega?: string;
  zona?: string;
  estado?: string;
  cobroEntregaUsd?: number;
  productos: {
    producto: string;
    gramos?: number;
    cantidad: number;
    precioUnitario?: number;
  }[];
  totalUsd?: number;
  notas?: string;
}

/** El valor de una lista cerrada que se parece a lo escrito, o undefined. */
function pickFrom(list: readonly string[], value: string | undefined) {
  const term = foldText(value ?? "").trim();
  if (!term) return undefined;
  return (
    list.find((option) => foldText(option) === term) ??
    list.find((option) => foldText(option).includes(term) || term.includes(foldText(option)))
  );
}

/** Si el cobro del delivery entra al total: sólo cuando lo llevamos nosotros. */
const chargesDelivery = (entrega?: string, proveedor?: string) =>
  entrega === "Delivery" && proveedor === "Nosotros";

/**
 * Convierte lo que se dijo en el chat en un borrador listo para aprobar.
 *
 * Los precios salen del catálogo —el de detal, o la lista de cajas si es al
 * mayor—, igual que en el formulario. Sólo se usa otro precio si se acordó uno
 * distinto, y eso se avisa.
 */
export async function draftSale(request: DraftRequest) {
  const date = resolveSaleDate(request);
  if ("error" in date) return { venta: null, error: date.error };

  const canal: SaleChannel = request.canal === "mayor" ? "mayor" : "detal";
  const [catalog, wholesalePrices] = await Promise.all([
    getAdminProducts(),
    canal === "mayor" ? getWholesaleUnitPrices() : Promise.resolve({} as Record<string, number>),
  ]);

  const lineas: DraftLine[] = [];
  const noEncontrados: string[] = [];
  const avisos: string[] = [];

  for (const item of request.productos ?? []) {
    const product = matchProduct(item.producto, catalog);
    const size =
      product &&
      ((item.gramos ? product.sizes.find((s) => s.grams === item.gramos) : undefined) ??
        product.sizes[0]);
    if (!product || !size) {
      noEncontrados.push(item.producto);
      continue;
    }
    if (item.gramos && size.grams !== item.gramos) {
      avisos.push(`${productTitle(product)} no viene en ${item.gramos}g; va en ${size.grams}g.`);
    }

    const catalogPrice =
      canal === "mayor"
        ? (wholesalePrices[`${product.id}·${size.grams}`] ?? size.price)
        : size.price;
    if (canal === "mayor" && wholesalePrices[`${product.id}·${size.grams}`] === undefined) {
      avisos.push(
        `${productTitle(product)} ${sizeLabel(product, size)} no tiene precio al mayor (le falta el costo); va a precio de detal.`,
      );
    }

    const price =
      typeof item.precioUnitario === "number" && item.precioUnitario >= 0
        ? item.precioUnitario
        : catalogPrice;
    if (price !== catalogPrice) {
      avisos.push(
        `${productTitle(product)} ${sizeLabel(product, size)} va a ${fmtUsd(price)} en vez de ${fmtUsd(catalogPrice)}.`,
      );
    }

    lineas.push({
      productoId: product.id,
      producto: `${productTitle(product)} ${sizeLabel(product, size)}`,
      gramos: size.grams,
      cantidad: Math.max(1, Math.round(item.cantidad ?? 1)),
      precioUnitarioUsd: usd(price),
    });
  }

  if (noEncontrados.length > 0) {
    return {
      venta: null,
      noEncontrados,
      error:
        "No reconocí algunos productos. Pregunta cuáles son antes de armar la venta.",
    };
  }
  if (lineas.length === 0) {
    return { venta: null, error: "La venta necesita al menos un producto." };
  }

  const metodoPago = pickFrom(PAYMENT_METHODS, request.metodoPago);
  if (!metodoPago) {
    return {
      venta: null,
      error: `Falta el método de pago. Tiene que ser uno de: ${PAYMENT_METHODS.join(", ")}.`,
    };
  }

  const entrega = pickFrom(DELIVERY_METHODS, request.entrega);
  const proveedorEntrega = request.proveedorEntrega?.trim() || undefined;
  const cobroEntregaUsd =
    chargesDelivery(entrega, proveedorEntrega) && typeof request.cobroEntregaUsd === "number"
      ? usd(request.cobroEntregaUsd)
      : undefined;

  const computed = usd(
    lineas.reduce((sum, line) => sum + line.cantidad * line.precioUnitarioUsd, 0) +
      (cobroEntregaUsd ?? 0),
  );
  const totalUsd =
    typeof request.totalUsd === "number" && request.totalUsd >= 0 ? usd(request.totalUsd) : computed;
  if (totalUsd !== computed) {
    avisos.push(`El total va en ${fmtUsd(totalUsd)}; por catálogo daba ${fmtUsd(computed)}.`);
  }

  if (date.fecha.slice(0, 7) !== today().slice(0, 7)) {
    avisos.push(`La fecha ${date.fecha} es de otro mes: la venta cuenta en ese mes, no en el actual.`);
  }

  const venta: SaleDraft = {
    fecha: date.fecha,
    canal,
    cliente: request.cliente?.trim() || undefined,
    telefono: request.telefono?.trim() || undefined,
    metodoPago,
    entrega,
    proveedorEntrega: entrega && entrega !== "Pickup" ? proveedorEntrega : undefined,
    zona: request.zona?.trim() || undefined,
    estado: entrega === "Envío nacional" ? request.estado?.trim() || undefined : undefined,
    cobroEntregaUsd,
    lineas,
    totalUsd,
    notas: request.notas?.trim() || undefined,
  };

  return { venta, avisos };
}

/**
 * Escribe la venta aprobada.
 *
 * Todo se vuelve a comprobar contra el catálogo: el borrador pasó por el
 * modelo, y un id o un tamaño que no existe se rechaza en vez de guardar una
 * línea que no mueve stock. Después sigue el mismo camino que una venta del
 * formulario: costo congelado del día, tasa BCV, ficha del cliente, stock e
 * insumos.
 */
export async function recordSale(draft: SaleDraft) {
  if (!isIsoDate(draft.fecha) || draft.fecha > today()) {
    throw new Error("La fecha de la venta no es válida.");
  }
  if (!PAYMENT_METHODS.includes(draft.metodoPago)) {
    throw new Error("El método de pago no es válido.");
  }
  if (!Number.isFinite(draft.totalUsd) || draft.totalUsd < 0) {
    throw new Error("El total no es válido.");
  }
  if (!draft.lineas?.length) {
    throw new Error("La venta necesita al menos un producto.");
  }

  const [products, sizeCosts] = await Promise.all([getAdminProducts(), getSizeCosts()]);

  const items: SaleItemInput[] = draft.lineas.map((line) => {
    const product: AdminProduct | undefined = products.find((p) => p.id === line.productoId);
    const sizeId = sizeIdOf(products, product?.id ?? null, line.gramos);
    if (!product || !sizeId) {
      throw new Error(`${line.producto} no está en el catálogo.`);
    }
    if (!Number.isInteger(line.cantidad) || line.cantidad < 1) {
      throw new Error(`${line.producto} necesita una cantidad de al menos 1.`);
    }
    if (!Number.isFinite(line.precioUnitarioUsd) || line.precioUnitarioUsd < 0) {
      throw new Error(`${line.producto} no tiene un precio válido.`);
    }
    const cost = sizeCosts.get(sizeId);
    return {
      productId: product.id,
      productName: product.name,
      grams: line.gramos,
      quantity: line.cantidad,
      unitPriceUsd: line.precioUnitarioUsd,
      unitCostUsd: cost?.known ? cost.total : null,
      promotionId: null,
      promotionLabel: null,
    };
  });

  const entrega = DELIVERY_METHODS.includes(draft.entrega ?? "") ? draft.entrega! : null;
  const deliveryProvider = entrega && entrega !== "Pickup" ? draft.proveedorEntrega ?? null : null;
  const deliveryState =
    entrega === "Envío nacional" ? draft.estado ?? null : stateForZone(draft.zona) ?? null;

  const customerName = draft.cliente ?? null;
  const customerPhone = draft.telefono ?? null;
  const customerId = await ensureCustomer({
    name: customerName,
    phone: customerPhone,
    email: null,
    state: deliveryState,
  });
  if (customerId && draft.zona) {
    await setCustomerZone(customerId, draft.zona);
  }

  const bcv = await getBcvRates();
  const bcvUsdRate = bcv.usd?.rate ?? null;

  const saleId = await createSale({
    saleDate: draft.fecha,
    items,
    amountUsd: draft.totalUsd,
    channel: draft.canal === "mayor" ? "mayor" : "detal",
    paymentMethod: draft.metodoPago,
    customerId,
    customerName,
    customerEmail: null,
    customerPhone,
    deliveryMethod: entrega,
    deliveryProvider,
    deliveryState,
    deliveryFeeUsd: chargesDelivery(entrega ?? undefined, deliveryProvider ?? undefined)
      ? (draft.cobroEntregaUsd ?? null)
      : null,
    deliveryCostUsd: null,
    bcvUsdRate,
    bcvEurRate: bcv.eur?.rate ?? null,
    amountBs: bcvUsdRate ? draft.totalUsd * bcvUsdRate : null,
    notes: draft.notas ?? null,
  });

  await consumeInventoryForSale(products, items);

  // Las mismas pantallas que refresca el formulario al guardar.
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/clientes", "layout");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/mayoreo");

  const sale = await getSaleById(saleId);
  return {
    numero: sale?.saleNumber ?? null,
    numeroDelMes: sale?.monthlyNumber ?? null,
    fecha: draft.fecha,
    totalUsd: draft.totalUsd,
  };
}
