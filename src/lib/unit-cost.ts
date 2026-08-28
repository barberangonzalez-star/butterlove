import { COMBO_COMPONENTS } from "./combo-components";
import type { SizeCost } from "./costs-data";

/** Lo mínimo que hace falta de un producto para ubicarle un costo. */
export interface CostableProduct {
  id: number;
  key: string;
  name: string;
  sizes: { id: number; grams: number }[];
}

export interface ResolvedUnitCost {
  total: number;
  known: boolean;
}

export type UnitCostResolver = (
  productId: number | null,
  grams: number,
  productName?: string,
) => ResolvedUnitCost;

const UNKNOWN: ResolvedUnitCost = { total: 0, known: false };

/**
 * Cuánto cuesta hoy un envase, resuelto desde el catálogo y no desde la venta.
 *
 * Sirve de respaldo para las ventas que se registraron antes de que hubiera un
 * costo cargado: esas líneas guardaron `null` y dejaban la ganancia en blanco
 * para siempre, aunque el costo ya se sepa. El costo congelado de la venta
 * sigue mandando cuando existe — esto sólo rellena lo que quedó vacío.
 *
 * Un combo no tiene costo propio: cuesta lo que cuestan los frascos que lleva,
 * los mismos que ya declara `COMBO_COMPONENTS` para descontar inventario. Si a
 * uno de sus componentes le falta el costo, el combo entero queda sin saber:
 * media cuenta miente más que ninguna.
 */
export function makeUnitCostResolver(
  products: CostableProduct[],
  sizeCosts: Map<number, SizeCost>,
): UnitCostResolver {
  const byId = new Map(products.map((p) => [p.id, p]));
  const byKey = new Map(products.map((p) => [p.key, p]));
  const byName = new Map(products.map((p) => [p.name.toLowerCase(), p]));

  /** El costo cargado en el tamaño mismo, sin mirar combos. */
  function own(product: CostableProduct, grams: number) {
    const size = product.sizes.find((s) => s.grams === grams);
    if (!size) return undefined;
    const cost = sizeCosts.get(size.id);
    return cost?.known ? cost.total : undefined;
  }

  function resolve(
    productId: number | null,
    grams: number,
    productName?: string,
    depth = 0,
  ): ResolvedUnitCost {
    // El id es lo firme; el nombre rescata las líneas cuyo producto se borró
    // del catálogo y se volvió a crear con otro id.
    const product =
      (productId === null ? undefined : byId.get(productId)) ??
      (productName ? byName.get(productName.toLowerCase()) : undefined);
    if (!product) return UNKNOWN;

    const direct = own(product, grams);
    if (direct !== undefined) return { total: direct, known: true };

    // `depth` es seguro contra un combo que algún día se arme con otro combo y
    // termine apuntándose a sí mismo.
    const components = COMBO_COMPONENTS[product.key];
    if (!components || components.length === 0 || depth > 2) return UNKNOWN;

    let total = 0;
    for (const component of components) {
      const base = byKey.get(component.productKey);
      if (!base) return UNKNOWN;
      const part = resolve(base.id, component.grams, undefined, depth + 1);
      if (!part.known) return UNKNOWN;
      total += part.total * component.quantity;
    }
    return { total, known: true };
  }

  return (productId, grams, productName) =>
    resolve(productId, grams, productName);
}
