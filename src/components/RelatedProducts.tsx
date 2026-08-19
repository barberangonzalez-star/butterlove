import Image from "next/image";
import Link from "next/link";
import { getProducts } from "@/lib/products-data";
import { isCombo, productTitle, type Product } from "@/lib/products";

/**
 * "Otros productos de la tienda", al pie de la ficha. Sin historial de compras
 * no hay nada que personalizar, así que la regla es de vitrina: los combos
 * primero —cuestan más y es lo que conviene mostrar a alguien que ya está
 * mirando un frasco suelto— y detrás el resto del catálogo en su orden.
 */
function related(products: Product[], currentKey: string): Product[] {
  return products
    .filter((p) => p.key !== currentKey)
    .sort((a, b) => Number(isCombo(b)) - Number(isCombo(a)))
    .slice(0, 8);
}

export default async function RelatedProducts({
  currentKey,
}: {
  currentKey: string;
}) {
  const products = await getProducts();
  const suggestions = related(products, currentKey);
  if (suggestions.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-12 sm:pb-16">
      <h2 className="font-display font-700 text-2xl text-ink mb-5">
        Otros productos de la tienda
      </h2>

      {/* Fila que se arrastra con el dedo en el teléfono y se ve completa en
          pantalla grande, como el carrusel de recomendados de una tienda. */}
      <ul className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
        {suggestions.map((p) => {
          const title = productTitle(p);
          const from = Math.min(...p.sizes.map((s) => s.price));
          return (
            <li
              key={p.key}
              className="snap-start shrink-0 w-40 sm:w-48"
            >
              <Link href={`/productos/${p.key}`} className="group block">
                <div
                  className={`torn-card relative aspect-square overflow-hidden ${
                    isCombo(p) ? "bg-surface" : p.bgClass
                  }`}
                >
                  <Image
                    src={p.image}
                    alt={`${title} Butter Love`}
                    fill
                    sizes="(max-width: 640px) 160px, 192px"
                    className={
                      isCombo(p)
                        ? "object-cover"
                        : "object-contain p-4 drop-shadow-lg"
                    }
                  />
                </div>
                <p className="mt-2 font-display font-700 text-sm text-ink leading-snug group-hover:underline">
                  {title}
                </p>
                <p className="text-xs text-ink-soft">
                  {p.sizes.length > 1 ? "Desde " : ""}${from.toFixed(2)}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
