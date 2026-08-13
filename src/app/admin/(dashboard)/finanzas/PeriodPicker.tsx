import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PERIOD_KINDS, shiftPeriod, type Period } from "@/lib/period";

/**
 * Elegir con qué lente se miran las ventas: un día, una semana, un mes, un año.
 *
 * Son enlaces y no un `select` con JavaScript: el período queda en la URL, se
 * puede compartir y el botón de atrás del navegador hace lo que se espera.
 */
export default function PeriodPicker({
  period,
  month,
}: {
  period: Period;
  /** El mes del reporte, que se conserva al cambiar de período. */
  month: string;
}) {
  const href = (next: Period) =>
    `/admin/finanzas?month=${month}&vista=${next.kind}&fecha=${next.anchor}` +
    "#ventas-por-producto";

  const previous = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border border-black/15 overflow-hidden">
        {PERIOD_KINDS.map((option) => {
          const active = option.value === period.kind;
          return (
            <Link
              key={option.value}
              // El ancla se conserva al cambiar de lente: de un día se pasa a
              // la semana que lo contiene, no a la semana de hoy.
              href={href({ ...period, kind: option.value })}
              aria-current={active ? "page" : undefined}
              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-[#37352f] text-white"
                  : "text-[#5f5e5b] hover:bg-black/5"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={href(previous)}
          aria-label={`Ver ${previous.label}`}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-black/15 text-[#5f5e5b] hover:bg-black/5"
        >
          <ChevronLeft size={14} />
        </Link>
        {/* `capitalize` pondría mayúscula en cada palabra: "Agosto De 2026". */}
        <span className="text-xs text-[#5f5e5b] first-letter:uppercase min-w-[9rem] text-center">
          {period.label}
        </span>
        <Link
          href={href(next)}
          aria-label={`Ver ${next.label}`}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-black/15 text-[#5f5e5b] hover:bg-black/5"
        >
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
