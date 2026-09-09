import Link from "next/link";
import { getRangeSummary } from "@/lib/sales-data";
import { getRangeReport } from "@/lib/finance-data";
import { getBcvRates } from "@/lib/bcv";
import {
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

  const [summary, bcv, report] = await Promise.all([
    getRangeSummary(period.from, period.to),
    getBcvRates(),
    getRangeReport(period.from, period.to),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Dashboard</h1>
      <div className="mb-6">
        <PeriodPicker period={period} base="/admin" />
      </div>

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
              <p
                className={`text-lg font-semibold truncate ${
                  report.netProfit < 0 ? "text-red-700" : ""
                }`}
              >
                {fmtUsd(report.netProfit)}
              </p>
              <p className="text-xs text-[#787774] mt-1">
                {fmtUsd(report.productRevenue)} en producto − {fmtUsd(report.cogs)}{" "}
                de costo − {fmtUsd(report.operatingExpenses)} de gastos
                {report.jarsWithoutCost > 0 && " · faltan recetas"}
              </p>
            </div>
          </Link>

          <StatCard label="Ventas ($)" value={fmtUsd(summary.totalUsd)} />
          <StatCard label="Ventas (Bs.)" value={fmtBs(summary.totalBs)} />
          <StatCard label="Pedidos registrados" value={String(summary.count)} />
          <StatCard label="Producto más vendido" value={summary.topProduct ?? "—"} />
          {/* Las dos tasas son las de hoy, no las del período: son el cambio al
              que se cobra ahora, y por eso no llevan el rango en el rótulo. */}
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold truncate">{value}</p>
    </div>
  );
}
