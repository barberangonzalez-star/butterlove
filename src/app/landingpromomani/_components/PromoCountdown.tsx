"use client";

import { Timer } from "lucide-react";
import { PROMO_WARNING_MS, formatClock, usePromoClock } from "./usePromoClock";

/**
 * La franja con el tiempo que le queda a la promo, pegada arriba.
 *
 * Va fija y delgada para que se vea sin bajar en el teléfono y sin quitarle
 * pantalla a la imagen de portada. En los últimos cinco minutos cambia a un
 * tono de alerta suave; al llegar a cero desaparece, y lo que pasa con la
 * promo lo dice el bloque de combos.
 */
export default function PromoCountdown() {
  const remaining = usePromoClock();
  if (remaining === null || remaining <= 0) return null;

  const urgent = remaining <= PROMO_WARNING_MS;

  return (
    <div
      role="timer"
      aria-live="off"
      className={`sticky top-0 z-30 transition-colors ${
        urgent ? "bg-almendras-bg" : "bg-mani-bg"
      }`}
    >
      <p className="mx-auto max-w-xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-semibold text-ink">
        <Timer className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>
          {urgent ? "¡Últimos minutos! " : "Tu promo termina en "}
          <span className="tabular-nums font-bold">{formatClock(remaining)}</span>
        </span>
      </p>
    </div>
  );
}
