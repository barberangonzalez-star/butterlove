import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { getWholesaleReport } from "@/lib/wholesale-report";
import { monthBounds } from "@/lib/finance-data";
import { getSaleMonths } from "@/lib/sales-data";
import { BOX_UNITS } from "@/lib/wholesale";
import MonthPicker, { type MonthOption } from "../finanzas/MonthPicker";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const pad = (n: number) => String(n).padStart(2, "0");

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(1)}%`);

/**
 * Las cajas se muestran enteras cuando lo son. Un mayorista que se llevó 18
 * frascos compró caja y media, y redondearlo a 2 diría que compró más de lo
 * que compró.
 */
function fmtBoxes(boxes: number) {
  return Number.isInteger(boxes) ? String(boxes) : boxes.toFixed(1);
}

function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });
}

/**
 * Hace cuánto que no compra, dicho como se dice. El número exacto de días
 * importa menos que el tramo: lo que se decide con esto es a quién llamar.
 */
function sinceLabel(days: number) {
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

/**
 * Cuándo un mayorista pasa de estar al día a estar frío.
 *
 * Sesenta días es el corte porque una caja de 12 le dura a una tienda chica
 * entre uno y dos meses; pasado eso, o se le acabó y compró en otro lado, o
 * dejó de vender el producto. Los dos casos piden la misma llamada.
 */
const COLD_DAYS = 60;
const WARM_DAYS = 30;

export default async function MayoreoPage({
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
  const [report, saleMonths] = await Promise.all([
    getWholesaleReport(from, to),
    getSaleMonths(),
  ]);

  const months: MonthOption[] = (
    saleMonths.includes(currentMonth) ? saleMonths : [currentMonth, ...saleMonths]
  ).map((value) => ({ value, label: monthLabel(value) }));

  const [detal, mayor] = report.byChannel;
  const total = detal.revenue + mayor.revenue;
  const mayorShare = total > 0 ? (mayor.revenue / total) * 100 : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mayoreo</h1>
          <p className="text-sm text-[#5f5e5b] mt-1">
            El canal por caja de {BOX_UNITS}, aparte del detal.
          </p>
        </div>
        <MonthPicker month={month} months={months} />
      </header>

      {/* --- El mes, partido por canal --- */}
      <section>
        <h2 className="text-sm font-semibold text-[#5f5e5b] mb-3">
          {monthLabel(month)}, por canal
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {report.byChannel.map((c) => (
            <div
              key={c.channel}
              className="rounded-lg border border-black/10 bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium capitalize">
                  {c.channel}
                </span>
                <span className="text-xs text-[#5f5e5b]">
                  {c.orders} {c.orders === 1 ? "venta" : "ventas"}
                </span>
              </div>
              <p className="text-2xl font-semibold mt-2">{fmtUsd(c.revenue)}</p>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5f5e5b]">Frascos</dt>
                  <dd>
                    {c.jars}
                    {c.channel === "mayor" && c.jars > 0 && (
                      <span className="text-[#5f5e5b]">
                        {" "}
                        · {fmtBoxes(c.boxes)} cajas
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5f5e5b]">Ganancia</dt>
                  <dd className="font-medium">{fmtUsd(c.margin)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#5f5e5b]">Margen</dt>
                  <dd>{fmtPct(c.marginPct)}</dd>
                </div>
              </dl>
              {c.jarsWithoutCost > 0 && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-[#8a6d3b]">
                  <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                  {c.jarsWithoutCost} frascos sin costo cargado: su ganancia no
                  está contada.
                </p>
              )}
            </div>
          ))}
        </div>
        {mayorShare !== null && (
          <p className="text-sm text-[#5f5e5b] mt-3">
            El mayoreo fue el{" "}
            <strong className="text-[#37352f]">{mayorShare.toFixed(1)}%</strong>{" "}
            de lo vendido este mes.
          </p>
        )}
      </section>

      {/* --- Recompra: lo que no se ve en el listado de ventas --- */}
      <section>
        <h2 className="text-sm font-semibold text-[#5f5e5b] mb-1">Mayoristas</h2>
        <p className="text-xs text-[#5f5e5b] mb-3">
          Todo el historial, no sólo el mes. Ordenados por quien hace más que no
          compra.
        </p>

        {report.resellers.length === 0 ? (
          <p className="rounded-lg border border-black/10 bg-white p-4 text-sm text-[#5f5e5b]">
            Todavía no hay ventas al mayor. Se registran en Ventas, marcando el
            canal &quot;Mayor&quot;.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs text-[#5f5e5b]">
                  <th className="px-4 py-2.5 font-medium">Mayorista</th>
                  <th className="px-4 py-2.5 font-medium text-right">Pedidos</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cajas</th>
                  <th className="px-4 py-2.5 font-medium text-right">Compró</th>
                  <th className="px-4 py-2.5 font-medium text-right">Dejó</th>
                  <th className="px-4 py-2.5 font-medium text-right">
                    Última compra
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.resellers.map((r) => (
                  <tr
                    key={r.customerId ?? r.name}
                    className="border-b border-black/5 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      {r.customerId ? (
                        <Link
                          href={`/admin/clientes/${r.customerId}`}
                          className="hover:underline"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        r.name
                      )}
                      {r.phone && (
                        <span className="block text-xs text-[#5f5e5b]">
                          {r.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {r.orders}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtBoxes(r.boxes)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtUsd(r.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtUsd(r.margin)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {/* El color es la alarma: quien lleva dos meses sin
                          comprar ya no está comprando, esté donde esté en la
                          lista. */}
                      <span
                        className={
                          r.daysSince >= COLD_DAYS
                            ? "font-medium text-[#a13d3d]"
                            : r.daysSince >= WARM_DAYS
                              ? "text-[#8a6d3b]"
                              : "text-[#5f5e5b]"
                        }
                      >
                        {sinceLabel(r.daysSince)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Qué mueve el canal --- */}
      {report.flavors.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[#5f5e5b] mb-1">
            Qué se llevaron
          </h2>
          <p className="text-xs text-[#5f5e5b] mb-3">
            Sólo el mayoreo de {monthLabel(month)}. Casi nunca es lo mismo que
            pide el cliente final.
          </p>
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs text-[#5f5e5b]">
                  <th className="px-4 py-2.5 font-medium">Producto</th>
                  <th className="px-4 py-2.5 font-medium text-right">Cajas</th>
                  <th className="px-4 py-2.5 font-medium text-right">Frascos</th>
                  <th className="px-4 py-2.5 font-medium text-right">Vendido</th>
                  <th className="px-4 py-2.5 font-medium text-right">Dejó</th>
                </tr>
              </thead>
              <tbody>
                {report.flavors.map((f) => (
                  <tr
                    key={`${f.productName}-${f.grams}`}
                    className="border-b border-black/5 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      {f.productName}{" "}
                      <span className="text-[#5f5e5b]">{f.grams}g</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtBoxes(f.boxes)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {f.jars}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtUsd(f.revenue)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {f.costKnown ? (
                        fmtUsd(f.margin)
                      ) : (
                        <span className="text-[#5f5e5b]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
