import Link from "next/link";
import { getMonthSummary } from "@/lib/sales-data";
import { getMonthReport } from "@/lib/finance-data";
import { getBcvRates } from "@/lib/bcv";
import BcvConverterWidget from "./_components/BcvConverterWidget";

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

export default async function AdminDashboardPage() {
  const now = new Date();
  const { start, end } = monthRange(now);
  const month = start.slice(0, 7);
  const [summary, bcv, report] = await Promise.all([
    getMonthSummary(start, end),
    getBcvRates(),
    getMonthReport(month),
  ]);

  const monthLabel = now.toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Dashboard</h1>
      <p className="text-sm text-[#787774] mb-6 capitalize">{monthLabel}</p>

      <div className="grid md:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="grid sm:grid-cols-2 gap-4">
          {/* La ganancia va primero: las ventas del mes incluyen el delivery
              cobrado y el costo de hacer los frascos, así que solas dicen
              menos de lo que parece. */}
          <Link href="/admin/finanzas" className="sm:col-span-2 block">
            <div className="border border-black/10 rounded-lg bg-white p-4 hover:bg-black/[0.02] transition-colors">
              <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
                Ganancia del mes
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

          <StatCard label="Ventas del mes ($)" value={fmtUsd(summary.totalUsd)} />
          <StatCard label="Ventas del mes (Bs.)" value={fmtBs(summary.totalBs)} />
          <StatCard label="Pedidos registrados" value={String(summary.count)} />
          <StatCard label="Producto más vendido" value={summary.topProduct ?? "—"} />
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
