import "server-only";
import { incrementProductSizeStock, type AdminProduct } from "./products-data";
import { adjustSupplyItemQuantity } from "./inventory-data";
import { resolveStockTargets } from "./combo-components";
import { getRecipeConsumption } from "./costs-data";

/**
 * Lo que una venta le mueve al inventario: frascos terminados e insumos.
 *
 * Vive acá y no dentro de las acciones del panel porque hay dos caminos que
 * terminan en una venta —el formulario de Ventas y confirmar un pedido de la
 * tienda— y el stock tiene que moverse igual por los dos. Con la cuenta
 * escrita dos veces, tarde o temprano una de las dos se olvida de los insumos.
 */

/**
 * Acumula los movimientos de stock de una venta antes de aplicarlos.
 *
 * Al editar hay que devolver lo que la versión anterior había tomado y luego
 * tomar lo nuevo. Si ambas coinciden el delta queda en cero y no se toca la
 * base; y dos líneas del mismo producto y tamaño se suman en un solo update.
 */
export function stockLedger() {
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
 * Acumula lo que la venta consume de insumos: un frasco de maní 230g se lleva
 * un frasco, una tapa, una etiqueta y 250 g de maní crudo.
 *
 * Se aplica con la receta de hoy, también al revertir una venta vieja. Si la
 * receta cambió entremedio la devolución no es exacta — igual que el stock de
 * producto, que se repone con las cantidades actuales.
 */
export function supplyLedger() {
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

/**
 * Anota en el ledger el movimiento de stock de una línea, repartido entre los
 * componentes si lo vendido es un combo — un dúo no tiene frascos propios que
 * descontar, así que la línea le pega a sus sabores.
 */
export function addStockMovement(
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

/** El id del tamaño con el que se vendió, que es lo que ata receta y costo. */
export function sizeIdOf(
  products: AdminProduct[],
  productId: number | null,
  grams: number,
) {
  if (!productId) return null;
  const product = products.find((p) => p.id === productId);
  return product?.sizes.find((s) => s.grams === grams)?.id ?? null;
}

export interface InventoryLine {
  productId: number | null;
  grams: number;
  quantity: number;
}

/**
 * Descuenta del inventario lo que se llevó una venta nueva: los frascos y los
 * insumos de su receta.
 *
 * Es el caso simple —una venta que nace, sin versión anterior que revertir—,
 * que es justo lo que pasa al confirmar un pedido de la tienda.
 */
export async function consumeInventoryForSale(
  products: AdminProduct[],
  lines: InventoryLine[],
) {
  const ledger = stockLedger();
  const supplies = supplyLedger();

  const sizeIds = [
    ...new Set(
      lines
        .map((line) => sizeIdOf(products, line.productId, line.grams))
        .filter((sizeId): sizeId is number => sizeId !== null),
    ),
  ];
  const recipes = await getRecipeConsumption(sizeIds);

  for (const line of lines) {
    addStockMovement(
      ledger,
      products,
      line.productId,
      line.grams,
      line.quantity,
      -1,
    );
    const sizeId = sizeIdOf(products, line.productId, line.grams);
    if (!sizeId) continue;
    for (const recipeLine of recipes.get(sizeId) ?? []) {
      supplies.add(recipeLine.supplyItemId, -recipeLine.quantity * line.quantity);
    }
  }

  await ledger.apply();
  await supplies.apply();
}
