import StarRating from "./StarRating";
import ReviewList from "./ReviewList";
import {
  formatRating,
  reviewCountLabel,
  type ProductReviews as ProductReviewsData,
} from "@/lib/reviews";

/**
 * "Lo que dicen", al pie de la ficha. El resumen va primero —el promedio y
 * cuántas hay de cada nota— y la lista al lado en pantalla ancha, debajo en el
 * teléfono: casi nadie lee todas, pero todos miran el número.
 */
export default function ProductReviews({ data }: { data: ProductReviewsData }) {
  const { summary, distribution, reviews } = data;

  return (
    <section
      id="resenas"
      aria-labelledby="resenas-titulo"
      className="mx-auto max-w-7xl px-5 sm:px-8 pb-12 sm:pb-16 scroll-mt-24"
    >
      <div className="pt-8 border-t border-ink/10 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        <div>
          <h2
            id="resenas-titulo"
            className="font-display font-700 text-2xl text-ink"
          >
            Lo que dicen
          </h2>

          <div className="mt-4 flex items-center gap-4">
            <p className="font-display font-700 text-5xl text-ink leading-none tabular-nums">
              {formatRating(summary.average)}
            </p>
            <div>
              <StarRating value={summary.average} size={20} />
              <p className="mt-1 text-sm text-ink-soft">
                {reviewCountLabel(summary.count)}
              </p>
            </div>
          </div>

          <ul className="mt-5 max-w-sm space-y-1.5">
            {[5, 4, 3, 2, 1].map((stars) => {
              const n = distribution[stars - 1];
              return (
                <li key={stars} className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="sr-only">
                    {stars} estrella{stars === 1 ? "" : "s"}: {reviewCountLabel(n)}
                  </span>
                  <span aria-hidden="true" className="w-3 text-right tabular-nums">
                    {stars}
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-2 flex-1 rounded-full bg-ink/10 overflow-hidden"
                  >
                    <span
                      className="block h-full rounded-full bg-star"
                      style={{ width: `${(n / summary.count) * 100}%` }}
                    />
                  </span>
                  <span aria-hidden="true" className="w-6 text-right tabular-nums">
                    {n}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-xs text-ink-soft leading-relaxed">
            Sólo opinan clientes: cada reseña llega por un enlace personal que
            les mandamos, y la leemos antes de publicarla.
          </p>
        </div>

        <ReviewList reviews={reviews} />
      </div>
    </section>
  );
}
