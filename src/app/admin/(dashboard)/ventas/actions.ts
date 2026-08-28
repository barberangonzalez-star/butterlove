"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import {
  createSale,
  deleteSale,
  getSaleById,
  updateSale,
  type SaleInput,
  type SaleItemInput,
} from "@/lib/sales-data";
import { getAdminProducts, incrementProductSizeStock } from "@/lib/products-data";
import { adjustSupplyItemQuantity } from "@/lib/inventory-data";
import { resolveStockTargets } from "@/lib/combo-components";
import { getRecipeConsumption, getSizeCosts } from "@/lib/costs-data";
import { getPromotions } from "@/lib/promotions-data";
import {
  ensureCustomer,
  getCustomer,
  setCustomerZone,
} from "@/lib/customers-data";
import { getBcvRates } from "@/lib/bcv";
import { saleChannel } from "@/lib/config";

/**
 * Acumula los movimientos de stock de una venta antes de aplicarlos.
 *
 * Al editar hay que devolver lo que la versión anterior había tomado y luego
 * tomar lo nuevo. Si ambas coinciden el delta queda en cero y no se toca la
 * base; y dos líneas del mismo producto y tamaño se suman en un solo update.
 */
/**
 * Acumula lo que la venta consume de insumos: un frasco de maní 230g se lleva
 * un frasco, una tapa, una etiqueta y 250 g de maní crudo.
 *
 * Se aplica con la receta de hoy, también al revertir una venta vieja. Si la
 * receta cambió entremedio la devolución no es exacta — igual que el stock de
 * producto, que se repone con las cantidades actuales.
 */
function supplyLedger() {
  const deltas = new Map<number, number>();

  return {
    add(supplyItemId: number, delta: number) {
      deltas.set(supplyItemId, (deltas.get(supplyItemId) ?? 0) + delta);
    },
    async apply() {
      for (const [supplyItemId, delta] of deltas) {
        // El inventario de insumos lleva enteros: los decimales se acumulan
        // primero y se redondean una sola vez, al final.
        const rounded = Math.round(delta);
        if (rounded !== 0) {
          await adjustSupplyItemQuantity(supplyItemId, rounded);
        }
      }
    },
  };
}

function stockLedger() {
  const deltas = new Map<
    string,
    { productId: number; grams: number; delta: number }
  >();

  return {
    add(productId: number | null, grams: number, delta: number) {
      // Un producto borrado del catálogo ya no tiene stock que ajustar.
      if (!productId) return;
      const key = `${productId}:${grams}`;
      const current = deltas.get(key);
      if (current) current.delta += delta;
      else deltas.set(key, { productId, grams, delta });
    },
    async apply() {
      for (const { productId, grams, delta } of deltas.values()) {
        if (delta !== 0) {
          await incrementProductSizeStock(productId, grams, delta);
        }
      }
    },
  };
}

/**
 * Anota en el ledger el movimiento de stock de una línea, repartido entre los
 * componentes si lo vendido es un combo — un dúo no tiene frascos propios que
 * descontar, así que la línea le pega a sus sabores.
 */
function addStockMovement(
  ledger: ReturnType<typeof stockLedger>,
  products: { id: number; key: string; kind: string }[],
  productId: number | null,
  grams: number,
  quantity: number,
  sign: 1 | -1,
) {
  for (const target of resolveStockTargets(products, productId, grams)) {
    ledger.add(target.productId, target.grams, sign * target.quantity * quantity);
  }
}

export async function saveSaleAction(formData: FormData) {
  await verifySession();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const amountUsd = Number(formData.get("amountUsd"));
  const saleDate = String(formData.get("saleDate") ?? "");
  // Lo que no venga reconocible cuenta como detal: es el canal por defecto y
  // el de las 40 ventas que ya estaban registradas antes de que esto existiera.
  const channel = saleChannel(formData.get("channel"));
  const paymentMethod = String(formData.get("paymentMethod") ?? "") || null;
  const notes = String(formData.get("notes") ?? "") || null;
  const customerName = String(formData.get("customerName") ?? "").trim() || null;
  const customerEmail = String(formData.get("customerEmail") ?? "").trim() || null;
  const customerPhone = String(formData.get("customerPhone") ?? "").trim() || null;
  const deliveryMethod = String(formData.get("deliveryMethod") ?? "") || null;
  // Delivery y envío nacional comparten el campo de proveedor: en un caso es
  // quien lleva el pedido en la ciudad, en el otro la empresa de encomienda.
  const deliveryProvider =
    deliveryMethod === "Delivery" || deliveryMethod === "Envío nacional"
      ? String(formData.get("deliveryProvider") ?? "") || null
      : null;
  const deliveryState =
    deliveryMethod === "Envío nacional"
      ? String(formData.get("deliveryState") ?? "") || null
      : null;
  const deliveryFeeUsd =
    deliveryMethod === "Delivery" && deliveryProvider === "Nosotros"
      ? Number(formData.get("deliveryFeeUsd") ?? 0)
      : null;
  // Lo que costó la entrega se puede anotar en cualquier modo que no sea
  // pickup: la gasolina de un delivery propio, lo que cobró Ridery, la guía
  // de MRW si la paga el negocio.
  const deliveryCostRaw = String(formData.get("deliveryCostUsd") ?? "").trim();
  const deliveryCostUsd =
    deliveryMethod !== "Pickup" && deliveryCostRaw
      ? Number(deliveryCostRaw)
      : null;

  // Las líneas llegan como campos repetidos, así que cada `getAll` devuelve una
  // columna y el índice las cruza.
  const itemProductIds = formData.getAll("itemProductId");
  const itemNames = formData.getAll("itemProductName");
  const itemGrams = formData.getAll("itemGrams");
  const itemQuantities = formData.getAll("itemQuantity");
  const itemUnitPrices = formData.getAll("itemUnitPrice");
  const itemPromotionIds = formData.getAll("itemPromotionId");

  if (itemProductIds.length === 0) {
    throw new Error("La venta necesita al menos un producto.");
  }
  const sameLength = [
    itemNames,
    itemGrams,
    itemQuantities,
    itemUnitPrices,
    itemPromotionIds,
  ].every((column) => column.length === itemProductIds.length);
  if (!sameLength) {
    throw new Error("Las líneas de la venta llegaron incompletas.");
  }

  const [products, promotions, existing, sizeCosts] = await Promise.all([
    getAdminProducts(),
    getPromotions(),
    id ? getSaleById(id) : Promise.resolve(undefined),
    getSizeCosts(),
  ]);

  if (id && !existing) throw new Error("La venta ya no existe.");

  /** El id del tamaño con el que se vendió, que es lo que ata receta y costo. */
  function sizeIdOf(productId: number | null, grams: number) {
    if (!productId) return null;
    const product = products.find((p) => p.id === productId);
    return product?.sizes.find((s) => s.grams === grams)?.id ?? null;
  }

  const items: SaleItemInput[] = itemProductIds.map((raw, i) => {
    const product = products.find((p) => p.id === Number(raw));
    const promoRaw = String(itemPromotionIds[i] ?? "");
    const promo = promoRaw
      ? promotions.find((p) => p.id === Number(promoRaw))
      : undefined;
    const grams = Number(itemGrams[i]);
    const sizeId = sizeIdOf(product?.id ?? null, grams);
    const cost = sizeId ? sizeCosts.get(sizeId) : undefined;
    return {
      productId: product?.id ?? null,
      // Una línea cuyo producto se borró del catálogo conserva el nombre con
      // el que se registró.
      productName:
        product?.name ?? (String(itemNames[i]) || "Producto eliminado"),
      grams,
      quantity: Number(itemQuantities[i]),
      unitPriceUsd: Number(itemUnitPrices[i]),
      // Se congela el costo del día, si es que hay uno cargado. Sin nada
      // escrito va en null: el reporte avisa que falta en vez de hacer ver una
      // ganancia que no existe.
      unitCostUsd: cost?.known ? cost.total : null,
      promotionId: promo?.id ?? null,
      // El título se copia: si la promo se borra o se renombra después, la
      // venta sigue diciendo con qué combo se cobró.
      promotionLabel: promo?.title ?? null,
    };
  });

  if (items.some((item) => !Number.isFinite(item.quantity) || item.quantity < 1)) {
    throw new Error("Cada línea necesita una cantidad de al menos 1.");
  }

  // Editing keeps the rate the sale was recorded at — it is historical data,
  // not today's rate. Only fall back to a fresh lookup when there isn't one.
  let bcvUsdRate: number | null;
  let bcvEurRate: number | null;
  if (existing?.bcvUsdRate) {
    bcvUsdRate = Number(existing.bcvUsdRate);
    bcvEurRate = existing.bcvEurRate ? Number(existing.bcvEurRate) : null;
  } else {
    const bcv = await getBcvRates();
    bcvUsdRate = bcv.usd?.rate ?? null;
    bcvEurRate = bcv.eur?.rate ?? null;
  }
  const amountBs = bcvUsdRate ? amountUsd * bcvUsdRate : null;

  // La ficha del cliente: la elegida en el buscador, o la que corresponda al
  // nombre y teléfono escritos a mano. Escribirlos a mano crea la ficha si es
  // la primera compra, así la libreta se llena registrando ventas y no hace
  // falta dar de alta al cliente antes de cobrarle.
  const pickedId = Number(formData.get("customerId") ?? "");
  const picked = pickedId ? await getCustomer(pickedId) : undefined;
  const customerId =
    picked?.id ??
    (await ensureCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      state: deliveryState,
    }));

  // La zona se anota mientras se cobra, que es cuando se sabe a dónde se le
  // lleva. Vale igual para una ficha vieja sin zona que para una recién creada.
  const customerZone = String(formData.get("customerZone") ?? "").trim();
  if (customerId && customerZone) {
    await setCustomerZone(customerId, customerZone);
  }

  const input: SaleInput = {
    saleDate,
    items,
    amountUsd,
    channel,
    paymentMethod,
    customerId,
    customerName,
    customerEmail,
    customerPhone,
    deliveryMethod,
    deliveryProvider,
    deliveryState,
    deliveryFeeUsd,
    deliveryCostUsd,
    bcvUsdRate,
    bcvEurRate,
    amountBs,
    notes,
  };

  const ledger = stockLedger();
  const supplies = supplyLedger();
  // Las recetas de todos los tamaños en juego, los de ahora y los de la
  // versión anterior de la venta, en una sola consulta.
  const touchedSizeIds = [
    ...new Set(
      [...items, ...(existing?.items ?? [])]
        .map((item) => sizeIdOf(item.productId, item.grams))
        .filter((sizeId): sizeId is number => sizeId !== null),
    ),
  ];
  const recipes = await getRecipeConsumption(touchedSizeIds);

  /** Suma (o devuelve, con el signo al revés) los insumos de una línea. */
  function consume(
    productId: number | null,
    grams: number,
    quantity: number,
    sign: 1 | -1,
  ) {
    const sizeId = sizeIdOf(productId, grams);
    if (!sizeId) return;
    for (const line of recipes.get(sizeId) ?? []) {
      supplies.add(line.supplyItemId, sign * line.quantity * quantity);
    }
  }

  if (existing) {
    await updateSale(existing.id, input);
    for (const item of existing.items) {
      addStockMovement(ledger, products, item.productId, item.grams, item.quantity, 1);
      consume(item.productId, item.grams, item.quantity, 1);
    }
  } else {
    await createSale(input);
  }
  for (const item of items) {
    addStockMovement(ledger, products, item.productId, item.grams, item.quantity, -1);
    consume(item.productId, item.grams, item.quantity, -1);
  }
  await ledger.apply();
  await supplies.apply();

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  // El historial y los totales de cada cliente salen de sus ventas.
  revalidatePath("/admin/clientes", "layout");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/mayoreo");
}

export async function deleteSaleAction(id: number) {
  await verifySession();

  // Las líneas se leen antes de borrar: el CASCADE se las lleva y después ya
  // no habría con qué reponer el stock.
  const existing = await getSaleById(id);
  if (!existing) return;

  // Los tamaños se resuelven contra el catálogo de hoy, igual que al guardar.
  const products = await getAdminProducts();
  const sizeIds = existing.items
    .map((item) => {
      if (!item.productId) return null;
      const product = products.find((p) => p.id === item.productId);
      return product?.sizes.find((s) => s.grams === item.grams)?.id ?? null;
    })
    .filter((sizeId): sizeId is number => sizeId !== null);
  const recipes = await getRecipeConsumption([...new Set(sizeIds)]);

  await deleteSale(id);

  const ledger = stockLedger();
  const supplies = supplyLedger();
  for (const item of existing.items) {
    addStockMovement(ledger, products, item.productId, item.grams, item.quantity, 1);

    // Los insumos vuelven al inventario con la venta: si el frasco no se
    // vendió, el frasco sigue estando.
    const product = item.productId
      ? products.find((p) => p.id === item.productId)
      : undefined;
    const sizeId = product?.sizes.find((s) => s.grams === item.grams)?.id;
    if (!sizeId) continue;
    for (const line of recipes.get(sizeId) ?? []) {
      supplies.add(line.supplyItemId, line.quantity * item.quantity);
    }
  }
  await ledger.apply();
  await supplies.apply();

  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  // El historial y los totales de cada cliente salen de sus ventas.
  revalidatePath("/admin/clientes", "layout");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/mayoreo");
}
