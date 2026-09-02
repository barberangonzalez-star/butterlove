import "server-only";
import { createSale, type SaleItemInput } from "./sales-data";
import { deletePendingOrder, getPendingOrder } from "./pending-orders-data";
import { getAdminProducts } from "./products-data";
import { getSizeCosts } from "./costs-data";
import { consumeInventoryForSale, sizeIdOf } from "./sale-inventory";
import { ensureCustomer, setCustomerZone } from "./customers-data";
import { getBcvRates } from "./bcv";
import { stateForZone } from "./config";
import { today } from "./period";

/**
 * Convierte un pedido pendiente en una venta de verdad.
 *
 * Es el momento en que el pedido pasa a existir para el negocio: recién aquí
 * se descuenta el stock, se consumen los insumos, se congela el costo del día
 * y se le abre o actualiza la ficha al cliente. Antes de esto no era más que
 * alguien que llenó un formulario.
 *
 * La fecha es la de hoy y no la del pedido: la venta ocurre cuando se verifica
 * el pago. Un pedido de anoche que se confirma en la mañana es venta de hoy.
 *
 * Devuelve el id de la venta, o null si el pedido ya no estaba —lo confirmó o
 * lo borró alguien más, que con el panel abierto en dos teléfonos pasa más de
 * lo que parece—.
 */
export async function saleFromPendingOrder(id: number): Promise<number | null> {
  const order = await getPendingOrder(id);
  if (!order) return null;

  const [products, sizeCosts] = await Promise.all([
    getAdminProducts(),
    getSizeCosts(),
  ]);

  const items: SaleItemInput[] = order.items.map((item) => {
    // El producto se busca por `key` contra el catálogo de hoy: si lo borraron
    // entre el pedido y la confirmación, la línea se registra igual con el
    // nombre y el precio con los que se cotizó, sin stock que mover.
    const product = products.find((p) => p.key === item.key);
    const sizeId = sizeIdOf(products, product?.id ?? null, item.grams);
    const cost = sizeId ? sizeCosts.get(sizeId) : undefined;
    return {
      productId: product?.id ?? null,
      productName: product?.name ?? item.name,
      grams: item.grams,
      quantity: item.quantity,
      unitPriceUsd: item.unitPriceUsd,
      // Igual que en el formulario: sin costo cargado va null, que es más
      // honesto que inventar una ganancia.
      unitCostUsd: cost?.known ? cost.total : null,
      // La tienda no vende por promo: los combos son productos con su precio.
      promotionId: null,
      promotionLabel: null,
    };
  });

  const amountUsd = Number(order.amountUsd);
  const bcv = await getBcvRates();
  const bcvUsdRate = bcv.usd?.rate ?? null;

  const isNacional = order.deliveryMethod === "Envío nacional";
  const isDelivery = order.deliveryMethod === "Delivery";
  // Fuera de Caracas sólo sabemos la agencia, no el estado: la encomienda se
  // retira donde el cliente eligió, y eso se anota en las notas.
  const deliveryState = isNacional ? null : stateForZone(order.deliveryZone);

  const customerId = await ensureCustomer({
    name: order.customerName,
    phone: order.customerPhone,
    email: null,
    state: deliveryState,
  });

  if (customerId && order.deliveryZone) {
    await setCustomerZone(customerId, order.deliveryZone);
  }

  // Lo que el pedido trae y la venta no tiene dónde guardar —la dirección, la
  // agencia, la cédula— va a las notas. Es lo que hace falta para despachar, y
  // perderlo obligaría a volver a preguntárselo al cliente.
  const notes = [
    "Pedido de la tienda.",
    order.address ? `Dirección: ${order.address}` : null,
    isNacional && order.agency ? `Agencia: ${order.agency}` : null,
    isNacional && order.idCard ? `Cédula: ${order.idCard}` : null,
    order.paymentClaimed ? "El cliente dijo que ya pagó." : null,
  ]
    .filter(Boolean)
    .join(" ");

  const saleId = await createSale({
    saleDate: today(),
    items,
    amountUsd,
    // La tienda es venta al detal: al mayor se cotiza aparte y no pasa por acá.
    channel: "detal",
    paymentMethod: order.paymentMethod,
    customerId,
    customerName: order.customerName,
    customerEmail: null,
    customerPhone: order.customerPhone,
    deliveryMethod: order.deliveryMethod,
    // En delivery lo llevamos nosotros, que es lo que hace que el monto
    // cobrado por el envío cuente; en encomienda el proveedor es la empresa.
    deliveryProvider: isNacional ? order.courier : isDelivery ? "Nosotros" : null,
    deliveryState,
    deliveryFeeUsd: order.deliveryFeeUsd ? Number(order.deliveryFeeUsd) : null,
    // Lo que costó llevarlo todavía no se sabe: la gasolina o lo que cobre el
    // repartidor se anota después, editando la venta.
    deliveryCostUsd: null,
    bcvUsdRate,
    bcvEurRate: bcv.eur?.rate ?? null,
    amountBs: bcvUsdRate ? amountUsd * bcvUsdRate : null,
    notes,
  });

  await consumeInventoryForSale(products, items);
  // El pendiente desaparece recién cuando la venta ya está escrita: si algo
  // falla antes, el pedido sigue en la bandeja y se puede volver a intentar.
  await deletePendingOrder(id);

  return saleId;
}
