/**
 * Cuentas de costo que corren en los dos lados: los editores son componentes de
 * cliente y necesitan calcular igual que el servidor para mostrar el número
 * mientras se escribe.
 */

export interface SupplyCostLike {
  /** Lo que se pagó por la compra. Los `numeric` llegan como texto. */
  purchasePriceUsd: string | null;
  /** Cuánto rindió esa compra, en la unidad del insumo. */
  purchaseQuantity: number | null;
}

/**
 * Lo que cuesta una unidad del insumo: un frasco, un gramo de maní. Null si
 * todavía no se sabe cómo se compra — que es distinto de que sea gratis, y por
 * eso se muestra vacío en vez de cero.
 *
 * Es para mirar el inventario, no para costear el producto: el costo del frasco
 * se escribe a mano en el desglose (`costItems`).
 */
export function supplyUnitCost(item: SupplyCostLike): number | null {
  if (item.purchasePriceUsd === null || !item.purchaseQuantity) return null;
  const price = Number(item.purchasePriceUsd);
  if (!Number.isFinite(price) || item.purchaseQuantity <= 0) return null;
  return price / item.purchaseQuantity;
}

/** Margen sobre el precio de venta, en porcentaje. Null si no hay precio. */
export function marginPercent(price: number, cost: number): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  return ((price - cost) / price) * 100;
}

/**
 * Los costos unitarios son centavos partidos: un gramo de maní puede costar
 * $0.0132. Redondear a dos decimales antes de multiplicar por 250 borraría el
 * costo entero, así que se muestran con los decimales que hagan falta.
 */
export function fmtUnitCost(value: number): string {
  if (value === 0) return "$0";
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  if (value >= 0.0001) return `$${value.toFixed(4)}`;
  return `$${value.toExponential(1)}`;
}
