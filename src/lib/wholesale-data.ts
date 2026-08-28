import "server-only";
import { getSizeCosts } from "./costs-data";
import { getAdminProducts } from "./products-data";
import { productTitle, type ProductKind } from "./products";
import {
  WHOLESALE_GRAMS,
  wholesalePrice,
  type WholesalePrice,
} from "./wholesale";

/** Un sabor con su caja armada: la foto, el precio y las dos ganancias. */
export interface WholesaleItem extends WholesalePrice {
  key: string;
  title: string;
  image: string;
  imageCutout: boolean;
  bgClass: string;
  grams: number;
  /** El precio de la tienda, que es el PVP sugerido para revender. */
  retailPrice: number;
  unitCost: number;
}

/**
 * El catálogo al mayor.
 *
 * Deja fuera lo que no se puede cotizar en serio: los combos —que son un
 * regalo armado, no una caja de reventa— y todo tamaño sin costo cargado. Un
 * sabor sin costo no se muestra a medias ni con un precio inventado; se cae de
 * la lista y vuelve solo en cuanto se le cargue el desglose en Finanzas.
 *
 * Por eso hoy salen los cinco sabores sueltos de 230g y no los 350g: son los
 * únicos con desglose escrito.
 */
export async function getWholesaleCatalog(): Promise<WholesaleItem[]> {
  const [products, costs] = await Promise.all([
    getAdminProducts(),
    getSizeCosts(),
  ]);

  return products.flatMap((product) => {
    if (product.kind !== ("single" satisfies ProductKind)) return [];
    if (!product.inStore) return [];

    const size = product.sizes.find((s) => s.grams === WHOLESALE_GRAMS);
    if (!size) return [];

    const cost = costs.get(size.id);
    if (!cost?.known) return [];

    return [
      {
        key: product.key,
        title: productTitle(product),
        image: product.image,
        imageCutout: product.imageCutout,
        bgClass: product.bgClass,
        grams: size.grams,
        retailPrice: size.price,
        unitCost: cost.total,
        // El stock no entra: al mayor se produce contra pedido, y una caja
        // marcada "agotada" porque hay tres frascos en el estante espantaría
        // un pedido que sí se puede cumplir.
        ...wholesalePrice(size.price, cost.total),
      },
    ];
  });
}
