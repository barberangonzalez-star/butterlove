"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/admin-session";
import { saleFromPendingOrder } from "@/lib/sale-from-order";
import { deletePendingOrder } from "@/lib/pending-orders-data";

/**
 * Lo que hay que refrescar cuando una venta entra o sale. Es la misma lista de
 * `saveSaleAction`: una venta toca el listado, el dashboard, el stock, la
 * ficha del cliente, las finanzas y el parte de mayoreo.
 */
function revalidateSales() {
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/clientes", "layout");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/mayoreo");
}

/**
 * Verifiqué que pagó: registra el pedido como venta.
 *
 * El trabajo lo hace `saleFromPendingOrder`; acá sólo se comprueba la sesión y
 * se manda a refrescar lo que la venta cambió.
 */
export async function confirmPendingOrderAction(id: number) {
  await verifySession();
  await saleFromPendingOrder(id);
  revalidateSales();
}

/**
 * Descarta un pedido que no se concretó.
 *
 * No deja rastro a propósito: nunca fue una venta, no movió stock y no tiene
 * nada que devolver. Un pedido que el cliente abandonó no es información que
 * el negocio necesite guardar.
 */
export async function deletePendingOrderAction(id: number) {
  await verifySession();
  await deletePendingOrder(id);
  revalidateSales();
}
