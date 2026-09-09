import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PERIOD_KINDS, shiftPeriod, type Period } from "@/lib/period";

const dateInputClass =
  "rounded-md border border-black/15 px-2 py-1 text-xs text-[#37352f] outline-none focus:border-[#37352f]";

/**
 * Elegir con qué lente se miran los números: un día, una semana, un mes, un
 * trimestre, un semestre, un año, o el rango que haga falta.
 *
 * Son enlaces y un formulario GET, sin JavaScript propio: el período queda en la
 * URL, se puede compartir y el botón de atrás del navegador hace lo que se
 * espera.
 *
 * Lo usan el dashboard y finanzas, que guardan cosas distintas en la URL: `base`
 * dice a qué página vuelve y `params` lo que hay que arrastrar sin tocar —el mes
 * del reporte, en finanzas—.
 */
export default function PeriodPicker({
  period,
  base,
  params = {},
  hash = "",
}: {
  period: Period;
  /** La ruta a la que apuntan los enlaces, sin query. */
  base: string;
  /** Lo demás que vive en la URL de esa página y no debe perderse. */
  params?: Record<string, string>;
  /** Ancla opcional, para volver a la sección que se estaba mirando. */
  hash?: string;
}) {
  const href = (next: Period) => {
    const query = new URLSearchParams(params);
    query.set("vista", next.kind);
    query.set("fecha", next.anchor);
    if (next.kind === "rango") query.set("hasta", next.to);
    return `${base}?${query}${hash}`;
  };

  const previous = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);
  const isRange = period.kind === "rango";

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap rounded-md border border-black/15 overflow-hidden">
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
      <form action={base} className="flex flex-wrap items-center gap-1.5">
        {Object.entries(params).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
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
