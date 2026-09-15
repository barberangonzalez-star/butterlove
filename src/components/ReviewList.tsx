"use client";

import { useState } from "react";
import StarRating from "./StarRating";
import type { PublicReview } from "@/lib/reviews";

/** Cuántas se ven de entrada: en el teléfono, más que eso es una pantalla entera de texto. */
const INITIAL_VISIBLE = 4;

export default function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? reviews : reviews.slice(0, INITIAL_VISIBLE);

  return (
    <div className="min-w-0">
      <ul className="divide-y divide-ink/10">
        {visible.map((review) => (
          <li key={review.id} className="py-5 first:pt-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StarRating value={review.rating} size={15} />
              <span className="text-sm font-semibold text-ink">{review.authorName}</span>
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              Compra verificada · {review.dateLabel}
            </p>
            {review.comment && (
              <p className="mt-2 text-base text-ink leading-relaxed whitespace-pre-line break-words">
                {review.comment}
              </p>
            )}
            {review.reply && (
              <div className="mt-3 rounded-2xl bg-surface px-4 py-3">
                <p className="text-xs font-semibold text-ink">Respuesta de Butter Love</p>
                <p className="mt-1 text-sm text-ink-soft leading-relaxed whitespace-pre-line break-words">
                  {review.reply}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>

      {reviews.length > INITIAL_VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="mt-2 h-11 w-full sm:w-auto rounded-full border border-ink/20 px-6 text-sm font-semibold text-ink hover:bg-surface transition-colors"
        >
          {expanded ? "Ver menos" : `Ver las ${reviews.length} reseñas`}
        </button>
      )}
    </div>
  );
}
