import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { getProducts } from "@/lib/products-data";
import { getRatingSummaries } from "@/lib/reviews-data";
import { formatRating } from "@/lib/reviews";
import { isCombo, productTitle, storeSizes, type Product } from "@/lib/products";

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
  const [products, ratings] = await Promise.all([
    getProducts(),
    getRatingSummaries(),
  ]);
  const suggestions = related(products, currentKey);
  if (suggestions.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-12 sm:pb-16">
      <h2 className="font-display font-700 text-2xl text-ink mb-5">
        También te va a encantar
      </h2>

      {/* En el teléfono, dos por fila y a lo ancho: en la fila que se
          arrastraba cabía uno y medio, y lo que no se ve no se compra. Ahí van
          seis, que son tres filas; más era una lista que no se acababa. Desde
          `sm` vuelve la fila con los ocho. */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:flex sm:gap-4 sm:overflow-x-auto sm:snap-x sm:snap-mandatory sm:pb-2 no-scrollbar">
        {suggestions.map((p) => {
          const title = productTitle(p);
          const sizes = storeSizes(p);
          const from = Math.min(...sizes.map((s) => s.price));
          const rating = ratings[p.key];
          return (
            <li
              key={p.key}
              className="max-sm:nth-[n+7]:hidden sm:snap-start sm:shrink-0 sm:w-48"
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
                    sizes="(max-width: 640px) 46vw, 192px"
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
                <p className="flex items-center gap-1 text-xs text-ink-soft">
                  <span>
                    {sizes.length > 1 ? "Desde " : ""}${from.toFixed(2)}
                  </span>
                  {rating && (
                    <>
                      <span aria-hidden="true">·</span>
                      <Star
                        size={12}
                        fill="currentColor"
                        strokeWidth={0}
                        className="text-star"
                        aria-hidden="true"
                      />
                      <span>
                        {formatRating(rating.average)}
                        <span className="sr-only"> de 5 estrellas</span>
                      </span>
                    </>
                  )}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
