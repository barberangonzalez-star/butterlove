import { COMBO_COMPONENTS } from "./combo-components";
import { productVideo, productVideoPoster } from "./product-videos";
import { isCombo, productTitle, type Product } from "./products";

/**
 * Todo lo que se puede mirar de un producto, en el orden en que se muestra:
 * fotos y video, en una sola lista.
 *
 * Va en una lista y no en campos sueltos —foto, foto de ambiente, video—
 * porque la ficha ya no los trata distinto: son diapositivas de la misma
 * galería, y quien la dibuja no debería saber cuántas hay ni de dónde salieron.
 * Agregar una foto es agregar un elemento acá, no otra caja en la página.
 */
export type ProductShot =
  | {
      kind: "photo";
      src: string;
      /** Recorte sin fondo: se dibuja con aire y el color del sabor detrás. */
      cutout: boolean;
      bgClass: string;
      alt: string;
      /** Renglón bajo la foto. Sólo lo llevan los frascos de un combo. */
      caption?: string;
    }
  | {
      kind: "video";
      src: string;
      poster: string;
      alt: string;
      caption?: string;
    };

/**
 * Fotos extra de un producto, además de las dos que guarda la base de datos
 * (`image` y `heroImage`).
 *
 * Vive en código por la misma razón que los videos: hoy son archivos sueltos
 * que se agregan de vez en cuando, y sumarlos son dos pasos —dejar el archivo
 * en `public/products/` y escribir una línea acá—. Se muestran después de las
 * dos de la base, en este orden.
 *
 * Se dibujan llenando el marco cuadrado, así que conviene que sean fotos con
 * su propio fondo (1080x1080), no recortes del frasco sobre transparente.
 *
 *     mani: ["/products/mani-cuchara.jpg", "/products/mani-tostada.jpg"],
 */
export const EXTRA_PHOTOS: Record<string, string[]> = {};

/** Cuántas diapositivas se muestran como máximo. Un combo con dos sabores
 *  llega a cinco; de ahí para arriba la galería deja de leerse de un vistazo. */
const MAX_SHOTS = 8;

const fileName = (src: string) => src.split("/").pop();

function photosOf(product: Product, caption?: string): ProductShot[] {
  const title = productTitle(product);
  // Un sabor suelto tiene dos fotos distintas: el recorte del frasco en
  // `/products/` y la de ambiente en `/hero/`. Los combos, en cambio, tienen
  // una sola guardada en las dos carpetas con el mismo nombre, y la galería
  // mostraba dos veces la misma imagen.
  const twin =
    isCombo(product) && fileName(product.heroImage) === fileName(product.image);

  const srcs = [
    product.image,
    ...(twin ? [] : [product.heroImage]),
    ...(EXTRA_PHOTOS[product.key] ?? []),
  ];

  const shots: ProductShot[] = [];

  for (const [i, src] of srcs.entries()) {
    // Sólo la foto principal puede ser un recorte sin fondo; la de ambiente y
    // las extra traen el suyo y llenan el marco.
    const cutout = i === 0 ? product.imageCutout : false;

    if (shots.some((s) => s.src === src)) continue;

    shots.push({
      kind: "photo",
      src,
      cutout,
      bgClass: product.bgClass,
      alt: caption
        ? `${title} Butter Love, uno de los frascos del combo`
        : `${title} Butter Love`,
      caption,
    });
  }

  return shots;
}

function videoOf(product: Product, caption?: string): ProductShot | null {
  const src = productVideo(product.key);
  if (!src) return null;
  return {
    kind: "video",
    src,
    poster: productVideoPoster(product.key) ?? product.heroImage,
    alt: `Video de ${productTitle(product)} Butter Love`,
    caption,
  };
}

/**
 * Las diapositivas de la ficha. Primero lo del producto —sus fotos y su
 * video— y, si es un combo, los frascos que trae adentro.
 *
 * Lo de los combos no es relleno: un dúo tiene una sola foto propia, la de la
 * caja con los dos frascos, y quien la mira no ve de cerca ninguno de los dos
 * sabores que está comprando. Los frascos sueltos ya están fotografiados y
 * filmados en su propia ficha; acá se piden prestados con el renglón que dice
 * cuál es cuál.
 *
 * `catalog` es la vitrina completa, que la página ya tiene a mano. Si algún
 * componente no está en ella, se salta: un combo con una foto menos se muestra
 * igual.
 */
export function productShots(
  product: Product,
  catalog: Product[] = [],
): ProductShot[] {
  const shots: ProductShot[] = [...photosOf(product)];

  const own = videoOf(product);
  if (own) shots.push(own);

  if (isCombo(product)) {
    const components = COMBO_COMPONENTS[product.key] ?? [];
    const seen = new Set<string>();

    for (const component of components) {
      if (seen.has(component.productKey)) continue;
      seen.add(component.productKey);

      const jar = catalog.find((p) => p.key === component.productKey);
      if (!jar) continue;

      const caption = `Incluye · ${productTitle(jar)}`;
      // Del frasco suelto se toma sólo su foto principal: la de ambiente es de
      // otra sesión y en la galería del combo se lee como otro producto.
      const [main] = photosOf(jar, caption);
      if (main) shots.push(main);

      const video = videoOf(jar, caption);
      if (video) shots.push(video);
    }
  }

  // Un combo puede repetir una foto que ya es suya —el trío usa la foto del
  // frasco de maní, que además es su componente—: se muestra una sola vez.
  return shots
    .filter((shot, i, all) => all.findIndex((s) => s.src === shot.src) === i)
    .slice(0, MAX_SHOTS);
}

/**
 * Los frascos de un combo, con su nombre de cara al cliente. La ficha lo dice
 * bajo el título: "Dúo Merey + Maní" no aclara qué tamaño trae cada uno.
 */
export function comboContents(
  product: Product,
  catalog: Product[],
): { key: string; label: string }[] {
  if (!isCombo(product)) return [];
  return (COMBO_COMPONENTS[product.key] ?? []).flatMap((component) => {
    const jar = catalog.find((p) => p.key === component.productKey);
    if (!jar) return [];
    const count = component.quantity > 1 ? `${component.quantity} × ` : "";
    return [
      {
        key: component.productKey,
        label: `${count}${productTitle(jar)} ${component.grams}g`,
      },
    ];
  });
}
