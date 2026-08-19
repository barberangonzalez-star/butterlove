import type { Product } from "@/lib/products";

/**
 * Los tres packs que vende la landing, en el orden en que se muestran.
 *
 * Cada uno es un producto real del catálogo: el frasco suelto y los dos combos
 * de maní. El precio no se escribe acá —sale de la base de datos, como en la
 * tienda— para que subir un precio siga siendo un solo cambio en el panel y no
 * dos verdades distintas. Lo que sí vive acá es cómo se cuenta la oferta:
 * cuántos frascos trae, cómo se llama y qué promesa carga.
 *
 * `duo-mani` está en la vitrina; `trio-mani` no, y por eso la landing pide sus
 * productos por `key` en vez de por la lista de la tienda.
 */
export interface PackDef {
  key: string;
  jars: number;
  title: string;
  pitch: string;
  /** Distingue al pack destacado: uno solo, o deja de destacar nada. */
  featured?: boolean;
}

export const PACKS: PackDef[] = [
  {
    key: "mani",
    jars: 1,
    title: "1 frasco",
    pitch: "Para conocerla.",
  },
  {
    key: "duo-mani",
    jars: 2,
    title: "2 frascos",
    pitch: "Uno en casa, uno en la oficina.",
  },
  {
    key: "trio-mani",
    jars: 3,
    title: "3 frascos",
    pitch: "Para que no se acabe.",
    featured: true,
  },
];

export const PACK_KEYS = PACKS.map((p) => p.key);

/** El frasco suelto de 230g: la vara con la que se mide el ahorro. */
export const UNIT_KEY = "mani";
export const UNIT_GRAMS = 230;

export interface Pack extends PackDef {
  product: Product;
  grams: number;
  /** Lo que cuesta el pack completo. */
  price: number;
  /** Lo que costaría comprando frascos sueltos. */
  listPrice: number;
  perJar: number;
  saved: number;
  savedPct: number;
}

/**
 * Cruza las definiciones con los productos que vinieron de la base de datos.
 *
 * Un pack cuyo producto todavía no existe se cae de la lista en silencio: la
 * landing se puede publicar antes de correr `scripts/add-mani-promo-packs.ts`
 * y muestra los packs que sí están, en vez de romperse entera por uno.
 */
export function buildPacks(products: Product[]): Pack[] {
  const unit = products.find((p) => p.key === UNIT_KEY);
  const unitPrice =
    unit?.sizes.find((s) => s.grams === UNIT_GRAMS)?.price ?? 0;

  return PACKS.flatMap((def) => {
    const product = products.find((p) => p.key === def.key);
    if (!product) return [];
    // El combo tiene una sola presentación; el frasco suelto tiene 230g y
    // 350g, y la promo es sobre el de 230g.
    const size =
      product.sizes.find((s) => s.grams === UNIT_GRAMS * def.jars) ??
      product.sizes[0];
    if (!size) return [];

    const listPrice = unitPrice * def.jars;
    const saved = Math.max(0, listPrice - size.price);
    return [
      {
        ...def,
        product,
        grams: size.grams,
        price: size.price,
        listPrice,
        perJar: size.price / def.jars,
        saved,
        savedPct: listPrice > 0 ? Math.round((saved / listPrice) * 100) : 0,
      },
    ];
  });
}
