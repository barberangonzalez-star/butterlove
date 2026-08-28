/**
 * Qué sabores sueltos arman cada combo. Un dúo o un trío no tiene inventario
 * propio: sus frascos son los mismos que ya se cuentan como sabor suelto, así
 * que vender uno tiene que descontar de sus componentes y no del combo.
 *
 * Un combo nuevo se agrega acá a mano, igual que hoy se agrega con un script
 * en `scripts/add-combo-products.ts`.
 */

export interface ComboComponent {
  /** La `key` del producto base al que se le descuenta el frasco. */
  productKey: string;
  grams: number;
  /** Cuántos frascos de ese tamaño lleva un combo. */
  quantity: number;
}

export const COMBO_COMPONENTS: Record<string, ComboComponent[]> = {
  "duo-mani": [{ productKey: "mani", grams: 230, quantity: 2 }],
  "duo-merey-mani": [
    { productKey: "merey", grams: 230, quantity: 1 },
    { productKey: "mani", grams: 230, quantity: 1 },
  ],
  "duo-almendras-merey": [
    { productKey: "almendras", grams: 230, quantity: 1 },
    { productKey: "merey", grams: 230, quantity: 1 },
  ],
  "duo-pistacho-almendras": [
    { productKey: "pistacho", grams: 230, quantity: 1 },
    { productKey: "almendras", grams: 230, quantity: 1 },
  ],
  "trio-mani": [{ productKey: "mani", grams: 230, quantity: 3 }],
};

export interface StockTarget {
  productId: number;
  grams: number;
  /** Frascos de este tamaño por cada unidad vendida de la línea. */
  quantity: number;
}

/**
 * A qué producto y tamaño le toca en verdad el movimiento de stock de una
 * línea de venta. Si el producto vendido es un combo con receta cargada, se
 * reparte entre sus componentes; si no (sabor suelto, o combo sin mapear
 * todavía), el movimiento cae directo sobre lo vendido, como siempre.
 */
export function resolveStockTargets(
  products: { id: number; key: string; kind: string }[],
  productId: number | null,
  grams: number,
): StockTarget[] {
  if (!productId) return [];
  const product = products.find((p) => p.id === productId);
  const components = product ? COMBO_COMPONENTS[product.key] : undefined;
  if (!product || !components) {
    return [{ productId, grams, quantity: 1 }];
  }
  const targets: StockTarget[] = [];
  for (const component of components) {
    const componentProduct = products.find((p) => p.key === component.productKey);
    // Sin el producto base en catálogo no hay a quién descontarle: se ignora
    // en vez de reventar la venta.
    if (!componentProduct) continue;
    targets.push({
      productId: componentProduct.id,
      grams: component.grams,
      quantity: component.quantity,
    });
  }
  return targets;
}
