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

/**
 * Cuánto se ahorra comprando el combo en vez de sus frascos por separado.
 *
 * Es el único argumento que tiene un combo, y hasta ahora la ficha no lo
 * decía: el precio de los frascos sueltos está en otra página. Se calcula con
 * los precios de hoy y no con un número escrito a mano, para que subir el
 * precio de un sabor no deje una promesa vieja colgada en la ficha del dúo.
 *
 * Devuelve 0 si falta algún componente en el catálogo o si el combo no sale
 * más barato —el dúo de pistacho y almendras hoy cuesta lo mismo que los dos
 * frascos—: en ese caso no hay nada que presumir.
 */
export function comboSavings(
  product: { key: string; kind: string; sizes: { grams: number; price: number }[] },
  catalog: { key: string; sizes: { grams: number; price: number }[] }[],
): number {
  const components = COMBO_COMPONENTS[product.key];
  const combo = product.sizes[0];
  if (!components || !combo) return 0;

  let apart = 0;
  for (const component of components) {
    const jar = catalog.find((p) => p.key === component.productKey);
    const size = jar?.sizes.find((s) => s.grams === component.grams);
    if (!size) return 0;
    apart += size.price * component.quantity;
  }

  const saved = apart - combo.price;
  return saved > 0.01 ? saved : 0;
}

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
