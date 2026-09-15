import { Star } from "lucide-react";
import { formatRating } from "@/lib/reviews";

/**
 * Cinco estrellas con relleno parcial: 4.6 pinta cuatro enteras y más de media
 * quinta. Son dos filas encimadas —las grises debajo y las doradas encima,
 * recortadas al porcentaje—, así que no hace falta dibujar medias estrellas.
 */
export default function StarRating({
  value,
  size = 16,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const row = Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={size}
      fill="currentColor"
      strokeWidth={0}
      aria-hidden="true"
      className="shrink-0"
    />
  ));
  const filled = Math.max(0, Math.min(value / 5, 1)) * 100;

  return (
    <span
      role="img"
      aria-label={`${formatRating(value)} de 5 estrellas`}
      className={`relative inline-flex shrink-0 ${className}`}
    >
      <span className="flex text-ink/15">{row}</span>
      <span
        className="absolute inset-y-0 left-0 flex overflow-hidden text-star"
        style={{ width: `${filled}%` }}
      >
        {row}
      </span>
    </span>
  );
}
