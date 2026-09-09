import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { getRangeSummary } from "@/lib/sales-data";
import { getRangeReport } from "@/lib/finance-data";
import { getBcvRates } from "@/lib/bcv";
import {
  comparisonPeriod,
  isIsoDate,
  isPeriodKind,
  resolvePeriod,
  today,
  type PeriodKind,
} from "@/lib/period";
import BcvConverterWidget from "./_components/BcvConverterWidget";
import PeriodPicker from "./_components/PeriodPicker";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;
const fmtCount = (n: number) => String(n);

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string; hasta?: string }>;
}) {
  const { vista, fecha, hasta } = await searchParams;

  // Sin nada en la URL el dashboard abre en el mes en curso, que es lo que
  // mostraba antes de poder elegir.
  const kind: PeriodKind = isPeriodKind(vista) ? vista : "mes";
  const period = resolvePeriod(
    kind,
    isIsoDate(fecha) ? fecha : today(),
    isIsoDate(hasta) ? hasta : undefined,
  );
  const before = comparisonPeriod(period);

  const [summary, bcv, report, prevSummary, prevReport] = await Promise.all([
    getRangeSummary(period.from, period.to),
    getBcvRates(),
    getRangeReport(period.from, period.to),
    getRangeSummary(before.from, before.to),
    getRangeReport(before.from, before.to),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Dashboard</h1>
      <div className="mb-2">
        <PeriodPicker period={period} base="/admin" />
      </div>
      {/* El período de comparación se dice una vez acá y no en cada tarjeta,
          que repetirlo seis veces sería ruido. */}
      <p className="text-xs text-[#787774] mb-6">
        Comparado con <span className="first-letter:uppercase">{before.label}</span>
        {before.partial && ` · sus primeros ${before.days} días, que es lo que va del período`}
      </p>

      <div className="grid md:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* La ganancia va primero: las ventas incluyen el delivery cobrado y
              el costo de hacer los frascos, así que solas dicen menos de lo que
              parece. */}
          <Link
            href={`/admin/finanzas?month=${period.from.slice(0, 7)}`}
            className="sm:col-span-2 block"
          >
            <div className="border border-black/10 rounded-lg bg-white p-4 hover:bg-black/[0.02] transition-colors">
              <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
                Ganancia
              </p>
              <p className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={`text-lg font-semibold truncate ${
                    report.netProfit < 0 ? "text-red-700" : ""
                  }`}
                >
                  {fmtUsd(report.netProfit)}
                </span>
                <Delta
                  current={report.netProfit}
                  previous={prevReport.netProfit}
                  format={fmtUsd}
                />
              </p>
              <p className="text-xs text-[#787774] mt-1">
                {fmtUsd(report.productRevenue)} en producto − {fmtUsd(report.cogs)}{" "}
                de costo − {fmtUsd(report.operatingExpenses)} de gastos
                {report.jarsWithoutCost > 0 && " · faltan recetas"}
              </p>
            </div>
          </Link>

          <StatCard
            label="Ventas ($)"
            value={fmtUsd(summary.totalUsd)}
            current={summary.totalUsd}
            previous={prevSummary.totalUsd}
            format={fmtUsd}
          />
          <StatCard
            label="Ventas (Bs.)"
            value={fmtBs(summary.totalBs)}
            current={summary.totalBs}
            previous={prevSummary.totalBs}
            format={fmtBs}
          />
          <StatCard
            label="Pedidos registrados"
            value={String(summary.count)}
            current={summary.count}
            previous={prevSummary.count}
            format={fmtCount}
          />
          <StatCard label="Producto más vendido" value={summary.topProduct ?? "—"} />
          {/* Las dos tasas son las de hoy, no las del período: son el cambio al
              que se cobra ahora, y por eso no llevan comparación. */}
          <StatCard
            label="Tasa BCV USD"
            value={bcv.usd ? `Bs. ${bcv.usd.rate.toFixed(2)}` : "No disponible"}
          />
          <StatCard
            label="Tasa BCV EUR"
            value={bcv.eur ? `Bs. ${bcv.eur.rate.toFixed(2)}` : "No disponible"}
          />
        </div>

        <BcvConverterWidget />
      </div>
    </div>
  );
}

/**
 * Cuánto cambió respecto del período anterior.
 *
 * Se muestra la diferencia y, sólo si el período anterior tuvo algo positivo
 * con qué comparar, el porcentaje: sobre cero no hay porcentaje que valga, y
 * sobre una ganancia negativa el número saldría al revés —pasar de −50 a −10 es
 * una mejora, pero calculado da un 80% que se lee como caída—.
 */
function Delta({
  current,
  previous,
  format,
}: {
  current: number;
  previous: number;
  format: (n: number) => string;
}) {
  const diff = current - previous;

  if (previous === 0 && current === 0) {
    return <span className="text-xs text-[#787774]">sin movimiento antes</span>;
  }
  // Los centavos de redondeo no son un cambio.
  if (Math.abs(diff) < 0.005) {
    return <span className="text-xs text-[#787774]">igual que antes</span>;
  }

  const up = diff > 0;
  const pct = previous > 0 ? Math.abs(diff / previous) * 100 : null;
  const Icon = up ? ArrowUp : ArrowDown;

  return (
    <span
      className={`text-xs font-medium inline-flex items-center gap-0.5 ${
        up ? "text-green-700" : "text-red-700"
      }`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {format(Math.abs(diff))}
      {pct !== null && (
        <span className="font-normal text-[#787774]">
          · {pct.toFixed(pct < 10 ? 1 : 0)}%
        </span>
      )}
    </span>
  );
}

function StatCard({
  label,
  value,
  current,
  previous,
  format,
}: {
  label: string;
  value: string;
  /** Sin estos tres la tarjeta no compara: no todo dato tiene un antes. */
  current?: number;
  previous?: number;
  format?: (n: number) => string;
}) {
  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold truncate">{value}</p>
      {current !== undefined && previous !== undefined && format && (
        <p className="mt-1">
          <Delta current={current} previous={previous} format={format} />
        </p>
      )}
    </div>
  );
}
