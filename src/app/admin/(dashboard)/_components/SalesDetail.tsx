import Link from "next/link";
import { X } from "lucide-react";
import type { Sale } from "@/lib/sales-data";
import { SALE_CHANNELS } from "@/lib/config";

export type DetailKind = "pedidos" | "ventas";

export function isDetailKind(value: unknown): value is DetailKind {
  return value === "pedidos" || value === "ventas";
}

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
  });
}

const channelLabel = (value: string) =>
  SALE_CHANNELS.find((c) => c.value === value)?.label ?? value;

/** Suma por una llave y deja la lista ordenada de mayor a menor. */
function tally<T>(rows: T[], key: (row: T) => string, amount: (row: T) => number) {
  const totals = new Map<string, { count: number; usd: number }>();
  for (const row of rows) {
    const k = key(row);
    const t = totals.get(k) ?? { count: 0, usd: 0 };
    t.count += 1;
    t.usd += amount(row);
    totals.set(k, t);
  }
  return [...totals.entries()].sort((a, b) => b[1].usd - a[1].usd);
}

/**
 * El resumen que se abre al tocar una tarjeta del dashboard, para el mismo
 * período que muestran las tarjetas.
 *
 * "Pedidos" es la lista, uno por uno: quién, qué, cuánto. "Ventas" es el
 * desglose del dinero: por producto, por canal y por forma de pago. Los dos
 * terminan en la página de Ventas con el mismo rango, que es donde se editan.
 */
export default function SalesDetail({
  kind,
  sales,
  from,
  to,
  label,
  closeHref,
}: {
  kind: DetailKind;
  sales: Sale[];
  from: string;
  to: string;
  label: string;
  closeHref: string;
}) {
  const totalUsd = sales.reduce((s, sale) => s + Number(sale.amountUsd), 0);
  const totalBs = sales.reduce((s, sale) => s + Number(sale.amountBs ?? 0), 0);

  return (
    <section className="mt-6 border border-black/10 rounded-lg bg-white">
      <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-black/10">
        <div>
          <h2 className="text-sm font-semibold">
            {kind === "pedidos" ? "Pedidos" : "Resumen de ventas"} ·{" "}
            <span className="first-letter:uppercase inline-block">{label}</span>
          </h2>
          <p className="text-xs text-[#787774] mt-0.5">
            {sales.length} {sales.length === 1 ? "pedido" : "pedidos"} ·{" "}
            {fmtUsd(totalUsd)} · {fmtBs(totalBs)}
          </p>
        </div>
        <Link
          href={closeHref}
          aria-label="Cerrar resumen"
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5"
        >
          <X size={16} />
        </Link>
      </header>

      {sales.length === 0 ? (
        <p className="px-4 py-8 text-sm text-center text-[#787774]">
          No hay ventas registradas en este período.
        </p>
      ) : kind === "pedidos" ? (
        <OrdersList sales={sales} />
      ) : (
        <Breakdown sales={sales} totalUsd={totalUsd} />
      )}

      <footer className="px-4 py-3 border-t border-black/10">
        <Link
          href={`/admin/ventas?from=${from}&to=${to}`}
          className="text-xs font-medium text-[#37352f] underline underline-offset-2"
        >
          Ver y editar en Ventas
        </Link>
      </footer>
    </section>
  );
}

function OrdersList({ sales }: { sales: Sale[] }) {
  return (
    <ul className="divide-y divide-black/5">
      {sales.map((sale) => (
        <li key={sale.id} className="px-4 py-3 flex gap-3 items-start">
          <div className="w-14 shrink-0 text-xs text-[#787774] pt-0.5">
            {fmtDate(sale.saleDate)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {sale.customerName || "Sin nombre"}
            </p>
            <p className="text-xs text-[#5f5e5b] mt-0.5">
              {sale.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ") ||
                "Sin productos"}
            </p>
            <p className="text-xs text-[#787774] mt-0.5">
              {[channelLabel(sale.channel), sale.paymentMethod, sale.deliveryMethod]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-sm font-semibold shrink-0">
            {fmtUsd(Number(sale.amountUsd))}
          </div>
        </li>
      ))}
    </ul>
  );
}

function Breakdown({ sales, totalUsd }: { sales: Sale[]; totalUsd: number }) {
  // Por producto se cuentan unidades vendidas (un dúo cuenta como una) y lo
  // que dejó cada línea, sin el delivery.
  const products = new Map<string, { qty: number; usd: number }>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const p = products.get(item.productName) ?? { qty: 0, usd: 0 };
      p.qty += item.quantity;
      p.usd += item.quantity * Number(item.unitPriceUsd);
      products.set(item.productName, p);
    }
  }
  const byProduct = [...products.entries()].sort((a, b) => b[1].usd - a[1].usd);
  const deliveryUsd = sales.reduce((s, sale) => s + Number(sale.deliveryFeeUsd ?? 0), 0);
  const byChannel = tally(sales, (s) => channelLabel(s.channel), (s) => Number(s.amountUsd));
  const byPayment = tally(
    sales,
    (s) => s.paymentMethod || "Sin indicar",
    (s) => Number(s.amountUsd),
  );

  return (
    <div className="p-4 space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Mini label="Total" value={fmtUsd(totalUsd)} />
        <Mini label="Ticket promedio" value={fmtUsd(totalUsd / sales.length)} />
        <Mini label="Delivery cobrado" value={fmtUsd(deliveryUsd)} />
      </div>

      <Table
        title="Por producto"
        head={["Producto", "Cant.", "$"]}
        rows={byProduct.map(([name, p]) => [name, String(p.qty), fmtUsd(p.usd)])}
      />
      <div className="grid sm:grid-cols-2 gap-5">
        <Table
          title="Por canal"
          head={["Canal", "Pedidos", "$"]}
          rows={byChannel.map(([name, t]) => [name, String(t.count), fmtUsd(t.usd)])}
        />
        <Table
          title="Por forma de pago"
          head={["Pago", "Pedidos", "$"]}
          rows={byPayment.map(([name, t]) => [name, String(t.count), fmtUsd(t.usd)])}
        />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-black/[0.03] px-3 py-2">
      <p className="text-[11px] text-[#787774] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: string[][] }) {
  return (
    <div>
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-2">
        {title}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-[#787774]">
            {head.map((h, i) => (
              <th key={h} className={`font-normal pb-1 ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((row) => (
            <tr key={row[0]}>
              {row.map((cell, i) => (
                <td key={i} className={`py-1.5 ${i === 0 ? "text-left" : "text-right tabular-nums"}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
