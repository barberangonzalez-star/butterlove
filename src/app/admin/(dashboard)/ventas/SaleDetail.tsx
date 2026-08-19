import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Sale } from "@/lib/sales-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-28 shrink-0 text-[#787774]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * El detalle de una venta, el que no cabe en la fila.
 *
 * La tabla muestra lo que sirve para escanear —fecha, cliente, qué se vendió y
 * por cuánto—; acá va lo que sólo se busca cuando se abre una venta en
 * concreto: a qué precio salió cada frasco, cuánto se cobró y cuánto costó el
 * delivery, a qué tasa se convirtió, y qué se anotó ese día.
 */
export default function SaleDetail({ sale }: { sale: Sale }) {
  const items = sale.items.map((item) => {
    const unit = Number(item.unitPriceUsd);
    return { ...item, unit, subtotal: unit * item.quantity };
  });
  const subtotalItems = items.reduce((sum, i) => sum + i.subtotal, 0);

  const deliveryFee = sale.deliveryFeeUsd ? Number(sale.deliveryFeeUsd) : 0;
  const deliveryCost = sale.deliveryCostUsd ? Number(sale.deliveryCostUsd) : null;
  const bcvRate = sale.bcvUsdRate ? Number(sale.bcvUsdRate) : null;

  const entrega = [
    sale.deliveryMethod ?? "—",
    sale.deliveryProvider,
    sale.deliveryState,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="bg-black/[0.02] border-t border-black/10 px-4 py-4 grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-2">
          Qué se vendió
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#787774]">
              <th className="font-medium pb-1">Producto</th>
              <th className="font-medium pb-1 text-right">Cant.</th>
              <th className="font-medium pb-1 text-right">Precio</th>
              <th className="font-medium pb-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-black/5">
                <td className="py-1.5">
                  {item.productName}{" "}
                  <span className="text-[#787774]">{item.grams}g</span>
                  {item.promotionLabel && (
                    <span className="ml-1.5 text-[11px] bg-green-50 text-green-800 px-1.5 py-0.5 rounded-full">
                      {item.promotionLabel}
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {item.quantity}
                </td>
                <td className="py-1.5 text-right tabular-nums text-[#5f5e5b]">
                  {fmtUsd(item.unit)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {fmtUsd(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr className="border-t border-black/10">
              <td colSpan={3} className="py-1.5 text-right text-[#787774]">
                Productos
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {fmtUsd(subtotalItems)}
              </td>
            </tr>
            {deliveryFee > 0 && (
              <tr>
                <td colSpan={3} className="py-1.5 text-right text-[#787774]">
                  Delivery cobrado
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {fmtUsd(deliveryFee)}
                </td>
              </tr>
            )}
            <tr className="border-t border-black/10 font-semibold">
              <td colSpan={3} className="py-1.5 text-right">
                Total
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {fmtUsd(Number(sale.amountUsd))}
              </td>
            </tr>
            {sale.amountBs && (
              <tr className="text-[#5f5e5b]">
                <td colSpan={3} className="py-1 text-right">
                  {/* La tasa se congela en la venta: sin ella los bolívares de
                      hace tres meses no se pueden explicar. */}
                  En bolívares{bcvRate ? ` · tasa ${bcvRate}` : ""}
                </td>
                <td className="py-1 text-right tabular-nums">
                  {fmtBs(Number(sale.amountBs))}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <dl className="text-sm">
        <Campo label="Fecha">{sale.saleDate}</Campo>
        <Campo label="Pago">{sale.paymentMethod ?? "—"}</Campo>
        <Campo label="Entrega">{entrega || "—"}</Campo>
        {deliveryCost !== null && (
          <Campo label="Costó llevarlo">
            <span className="tabular-nums">{fmtUsd(deliveryCost)}</span>
          </Campo>
        )}
        <Campo label="Cliente">
          {sale.customerName ? (
            <>
              <span className="block">{sale.customerName}</span>
              {sale.customerPhone && (
                <span className="block text-[#787774]">
                  {sale.customerPhone}
                </span>
              )}
              {sale.customerEmail && (
                <span className="block text-[#787774] break-all">
                  {sale.customerEmail}
                </span>
              )}
              {/* Desde acá se salta al historial completo. Sin ficha la venta
                  se registró suelta y no hay a dónde ir. */}
              {sale.customerId && (
                <Link
                  href={`/admin/clientes/${sale.customerId}`}
                  className="mt-1 inline-flex items-center gap-1 font-medium hover:underline underline-offset-2"
                >
                  Ver perfil del cliente
                  <ArrowUpRight size={13} />
                </Link>
              )}
            </>
          ) : (
            <span className="text-[#787774]">Sin ficha</span>
          )}
        </Campo>
        {sale.notes && (
          <Campo label="Notas">
            <span className="whitespace-pre-wrap">{sale.notes}</span>
          </Campo>
        )}
      </dl>
    </div>
  );
}
