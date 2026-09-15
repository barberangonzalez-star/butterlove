import Link from "next/link";
import StarRating from "./StarRating";
import { getFeaturedReviews } from "@/lib/reviews-data";

/**
 * Tres o cuatro reseñas de cinco estrellas justo debajo del catálogo, para
 * quien entra por primera vez y todavía no sabe si confiar. En el teléfono es
 * una fila que se corre con el dedo, como "Otros productos": apiladas serían
 * cuatro pantallas de texto antes de llegar a la historia de la marca.
 */
export default async function FeaturedReviews() {
  const reviews = await getFeaturedReviews();
  if (reviews.length === 0) return null;

  return (
    <section
      aria-labelledby="resenas-home-titulo"
      className="px-3 sm:px-5 pb-12 sm:pb-16"
    >
      <h2
        id="resenas-home-titulo"
        className="font-display font-700 text-3xl sm:text-4xl text-ink"
      >
        Lo que dicen de Butter Love
      </h2>
      <p className="mt-2 text-base text-ink-soft">
        Reseñas de clientes que ya la probaron.
      </p>

      <ul className="mt-6 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-pl-3 sm:scroll-pl-5 pb-2 -mx-3 px-3 sm:-mx-5 sm:px-5 no-scrollbar lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="snap-start shrink-0 w-[85%] sm:w-[46%] lg:w-auto"
          >
            <figure className="torn-card h-full bg-surface p-6 flex flex-col">
              <StarRating value={review.rating} size={18} />
              <blockquote className="mt-3 flex-1 text-base text-ink leading-relaxed line-clamp-6 break-words">
                “{review.comment}”
              </blockquote>
              <figcaption className="mt-4 text-sm">
                <span className="font-semibold text-ink">{review.authorName}</span>
                <span className="text-ink-soft"> · </span>
                <Link
                  href={`/productos/${review.productKey}`}
                  className="text-ink-soft underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                >
                  {review.productTitle}
                </Link>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
