export type FlavorKey = string;

/** Un sabor suelto ("single") o un dúo de frascos con precio de combo. */
export type ProductKind = "single" | "combo";

export interface SizeOption {
  grams: number;
  price: number;
}

export interface Product {
  key: FlavorKey;
  name: string;
  kind: ProductKind;
  tagline: string;
  description: string;
  image: string;
  heroImage: string;
  bgClass: string;
  accentHex: string;
  badges: string[];
  sizes: SizeOption[];
}

export function isCombo(product: { kind: ProductKind }) {
  return product.kind === "combo";
}

/**
 * El nombre de cara al cliente. Los sabores sueltos guardan sólo el sabor
 * ("Maní") y el prefijo se arma aquí; los combos ya traen su nombre completo
 * ("Dúo Merey + Maní") y no lo llevan.
 */
export function productTitle(product: { name: string; kind: ProductKind }) {
  return isCombo(product) ? product.name : `Mantequilla de ${product.name}`;
}

/** Etiqueta de tamaño: los combos se miden en frascos, no en gramos totales. */
export function sizeLabel(
  product: { kind: ProductKind },
  size: { grams: number },
) {
  return isCombo(product) ? "2 × 230g" : `${size.grams}g`;
}
