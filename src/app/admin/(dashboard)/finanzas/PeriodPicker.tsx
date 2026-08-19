import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PERIOD_KINDS, shiftPeriod, type Period } from "@/lib/period";

const dateInputClass =
  "rounded-md border border-black/15 px-2 py-1 text-xs text-[#37352f] outline-none focus:border-[#37352f]";

/**
 * Elegir con qué lente se miran las ventas: un día, una semana, un mes, un año,
 * o el rango que haga falta.
 *
 * Son enlaces y un formulario GET, sin JavaScript propio: el período queda en la
 * URL, se puede compartir y el botón de atrás del navegador hace lo que se
 * espera.
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
    (next.kind === "rango" ? `&hasta=${next.to}` : "") +
    "#ventas-por-producto";

  const previous = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const isRange = period.kind === "rango";

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-black/15 overflow-hidden">
          {PERIOD_KINDS.map((option) => {
            const active = option.value === period.kind;
            return (
              <Link
                key={option.value}
                // El ancla se conserva al cambiar de lente: de un día se pasa a
                // la semana que lo contiene, no a la semana de hoy. Y al pasar a
                // rango, el rango empieza siendo lo que se estaba mirando.
                href={href(
                  option.value === "rango"
                    ? { ...period, kind: "rango", anchor: period.from }
                    : { ...period, kind: option.value },
                )}
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

      {/* Ir a una fecha sin pasar por las flechas. En rango son las dos puntas;
          en los demás lentes, cualquier día del período que se quiere ver. */}
      <form
        action="/admin/finanzas"
        className="flex flex-wrap items-center gap-1.5"
      >
        <input type="hidden" name="month" value={month} />
        <input type="hidden" name="vista" value={period.kind} />
        <label className="text-xs text-[#787774]">
          {isRange ? "Desde" : "Ir a"}
          <input
            type="date"
            name="fecha"
            defaultValue={period.from}
            className={`${dateInputClass} ml-1.5`}
          />
        </label>
        {isRange && (
          <label className="text-xs text-[#787774]">
            hasta
            <input
              type="date"
              name="hasta"
              defaultValue={period.to}
              className={`${dateInputClass} ml-1.5`}
            />
          </label>
        )}
        <button
          type="submit"
          className="rounded-md border border-black/15 px-2.5 py-1 text-xs font-medium text-[#5f5e5b] hover:bg-black/5"
        >
          Ver
        </button>
      </form>
    </div>
  );
}
