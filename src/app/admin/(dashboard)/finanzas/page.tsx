import { TriangleAlert } from "lucide-react";
import { getMonthReport, monthBounds } from "@/lib/finance-data";
import { getExpenseMonths, getExpenses } from "@/lib/expenses-data";
import { getSaleMonths } from "@/lib/sales-data";
import MonthPicker, { type MonthOption } from "./MonthPicker";
import ExpensesPanel from "./ExpensesPanel";
import RateField from "./RateField";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const pad = (n: number) => String(n).padStart(2, "0");

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
/** Lo que suma. */
const fmtPlus = (n: number) => `+$${n.toFixed(2)}`;
/**
 * Lo que resta. El signo lo pone la línea y no el número: un costo de cero
 * sigue siendo una resta, y "+$0.00" en la fila del costo se lee al revés.
 */
const fmtMinus = (n: number) => `−$${Math.abs(n).toFixed(2)}`;
/** Para lo que puede caer de cualquier lado, como el resultado del delivery. */
const fmtSigned = (n: number) =>
  `${n < 0 ? "−" : "+"}$${Math.abs(n).toFixed(2)}`;

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const month =
    monthParam && MONTH_RE.test(monthParam) ? monthParam : currentMonth;

  const { from, to } = monthBounds(month);
  const [report, expenses, saleMonths, expenseMonths] = await Promise.all([
    getMonthReport(month),
    getExpenses(from, to),
    getSaleMonths(),
    getExpenseMonths(),
  ]);

  const months: MonthOption[] = [
    ...new Set([currentMonth, month, ...saleMonths, ...expenseMonths]),
  ]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: monthLabel(value) }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold">Finanzas</h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {report.orders} venta{report.orders === 1 ? "" : "s"} ·{" "}
            {report.jars} frasco{report.jars === 1 ? "" : "s"}
          </p>
        </div>
        <MonthPicker month={month} months={months} />
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Ganancia del mes"
          value={fmtUsd(report.netProfit)}
          tone={report.netProfit < 0 ? "bad" : "good"}
        />
        <Stat label="Margen bruto" value={fmtUsd(report.grossMargin)} />
        <Stat label="Gastos operativos" value={fmtUsd(report.operatingExpenses)} />
        <Stat
          label="Caja del mes"
          value={fmtUsd(report.cashFlow)}
          tone={report.cashFlow < 0 ? "bad" : undefined}
        />
      </div>

      {report.jarsWithoutCost > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
          <TriangleAlert size={15} className="shrink-0 mt-0.5" />
          <span>
            {report.jarsWithoutCost} de los {report.jars} frascos vendidos este
            mes no tienen costo conocido, así que la ganancia sale más alta de
            lo que es. Cárgales la receta en Productos y las próximas ventas ya
            la usarán.
          </span>
        </p>
      )}

      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card title="De dónde sale la ganancia">
            <dl className="text-sm">
              <Row
                label="Ventas de producto"
                value={fmtPlus(report.productRevenue)}
                hint={
                  report.deliveryCharged > 0
                    ? `${fmtUsd(report.grossRevenue)} cobrados menos ${fmtUsd(report.deliveryCharged)} de delivery`
                    : undefined
                }
              />
              <Row
                label="Costo de lo vendido"
                value={fmtMinus(report.cogs)}
                hint="Frascos, tapas, etiquetas y materia prima de lo que salió"
              />
              <Row label="Margen bruto" value={fmtUsd(report.grossMargin)} strong />
              {(report.deliveryCharged > 0 || report.deliveryCost > 0) && (
                <Row
                  label="Delivery"
                  value={fmtSigned(report.deliveryResult)}
                  hint={`${fmtUsd(report.deliveryCharged)} cobrados contra ${fmtUsd(report.deliveryCost)} de costo`}
                />
              )}
              <Row
                label="Gastos operativos"
                value={fmtMinus(report.operatingExpenses)}
                hint="Anuncios, sueldos, comisiones"
              />
              <Row
                label="Ganancia del mes"
                value={fmtUsd(report.netProfit)}
                strong
                tone={report.netProfit < 0 ? "bad" : "good"}
              />
            </dl>
          </Card>

          <Card title="Qué deja cada producto">
            {report.byProduct.length > 0 ? (
              <div className="overflow-x-auto -mx-4">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[#787774] uppercase tracking-wide border-b border-black/10">
                      <th className="px-4 py-2 font-medium">Producto</th>
                      <th className="px-4 py-2 font-medium text-right">Frascos</th>
                      <th className="px-4 py-2 font-medium text-right">Vendido</th>
                      <th className="px-4 py-2 font-medium text-right">Costó</th>
                      <th className="px-4 py-2 font-medium text-right">Deja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byProduct.map((row) => (
                      <tr
                        key={`${row.productName}-${row.grams}`}
                        className="border-b border-black/5 last:border-0"
                      >
                        <td className="px-4 py-2.5">
                          {row.productName}{" "}
                          <span className="text-[#787774]">{row.grams}g</span>
                          {!row.costKnown && (
                            <TriangleAlert
                              size={12}
                              className="inline ml-1 -mt-0.5 text-amber-600"
                              aria-label="Sin costo completo"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {row.quantity}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {fmtUsd(row.revenue)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#787774]">
                          {row.costKnown ? fmtUsd(row.cost) : "—"}
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                            row.margin < 0 ? "text-red-700" : ""
                          }`}
                        >
                          {row.costKnown ? fmtUsd(row.margin) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[#787774]">
                Sin ventas registradas este mes.
              </p>
            )}
            <p className="text-xs text-[#787774] mt-3">
              &quot;Vendido&quot; suma el precio de cada línea. Si ajustaste el
              monto de una venta a mano, el total del mes puede diferir.
            </p>
          </Card>
        </div>

        <div className="space-y-6 min-w-0">
          <Card title="Caja del mes">
            <dl className="text-sm">
              <Row label="Entró" value={fmtPlus(report.cashIn)} />
              <Row
                label="Salió"
                value={fmtMinus(report.cashOut)}
                hint={
                  report.inventoryExpenses > 0
                    ? `Incluye ${fmtUsd(report.inventoryExpenses)} de insumos y materia prima`
                    : undefined
                }
              />
              <Row
                label="Quedó"
                value={fmtUsd(report.cashFlow)}
                strong
                tone={report.cashFlow < 0 ? "bad" : undefined}
              />
            </dl>
            <p className="text-xs text-[#787774] mt-3">
              La caja y la ganancia no dan igual a propósito: comprar materia
              prima saca plata hoy pero recién se vuelve costo cuando vendes lo
              que hiciste con ella.
            </p>
          </Card>

          {report.bsRevenueUsd > 0 && (
            <Card title="Cobrado en bolívares">
              <p className="text-sm mb-3">
                {fmtUsd(report.bsRevenueUsd)} en ventas · Bs.{" "}
                {report.bsAmount.toLocaleString("es-VE", {
                  maximumFractionDigits: 2,
                })}
              </p>
              <RateField month={month} rate={report.replacementRate} />
              {report.rateLoss !== null && (
                <p
                  className={`text-sm mt-3 pt-3 border-t border-black/5 ${
                    report.rateLoss > 0 ? "text-red-700" : "text-[#5f5e5b]"
                  }`}
                >
                  {report.rateLoss > 0
                    ? `Se pierden ${fmtUsd(report.rateLoss)} al reponer esos dólares.`
                    : "Reponer esos dólares no cuesta más de lo que se cobró."}
                </p>
              )}
            </Card>
          )}

          {report.expensesByCategory.length > 0 && (
            <Card title="Gastos por categoría">
              <ul className="text-sm space-y-1.5">
                {report.expensesByCategory.map((entry) => (
                  <li
                    key={entry.category}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="min-w-0 truncate">
                      {entry.category}
                      {entry.kind === "inventario" && (
                        <span className="ml-1.5 text-[11px] text-amber-800">
                          (no resta)
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {fmtUsd(entry.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <ExpensesPanel expenses={expenses} monthStart={from} />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p
        className={`text-lg font-semibold truncate ${
          tone === "bad" ? "text-red-700" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-2 ${
        strong ? "border-t border-black/10 font-semibold" : "border-t border-black/5 first:border-0"
      }`}
    >
      <dt className="min-w-0">
        {label}
        {hint && (
          <span className="block text-xs font-normal text-[#787774]">
            {hint}
          </span>
        )}
      </dt>
      <dd
        className={`shrink-0 tabular-nums ${tone === "bad" ? "text-red-700" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
