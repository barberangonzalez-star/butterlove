"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import SaleForm from "./SaleForm";
import { deleteSaleAction } from "./actions";
import type { AdminProduct } from "@/lib/products-data";
import type { Promotion } from "@/lib/promotions-data";
import type { Sale } from "@/lib/sales-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

export default function VentasAdminClient({
  sales,
  products,
  promotions,
}: {
  sales: Sale[];
  products: AdminProduct[];
  promotions: Promotion[];
}) {
  const [editing, setEditing] = useState<Sale | "new" | null>(null);

  const totalUsd = sales.reduce((sum, s) => sum + Number(s.amountUsd), 0);
  const totalBs = sales.reduce((sum, s) => sum + Number(s.amountBs ?? 0), 0);

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar esta venta? Esta acción no se puede deshacer.")) return;
    await deleteSaleAction(id);
  }

  return (
    <div>
      <button
        onClick={() => setEditing("new")}
        disabled={products.length === 0}
        className="mb-4 flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <Plus size={15} /> Registrar venta
      </button>

      <div className="border border-black/10 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Producto</th>
              <th className="px-4 py-2.5 font-medium">Cant.</th>
              <th className="px-4 py-2.5 font-medium">Promo</th>
              <th className="px-4 py-2.5 font-medium">Pago</th>
              <th className="px-4 py-2.5 font-medium">Entrega</th>
              <th className="px-4 py-2.5 font-medium text-right">Monto $</th>
              <th className="px-4 py-2.5 font-medium text-right">Monto Bs.</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                <td className="px-4 py-3 whitespace-nowrap">{s.saleDate}</td>
                <td className="px-4 py-3" title={s.customerEmail ?? undefined}>
                  {s.customerName ? (
                    <>
                      <p>{s.customerName}</p>
                      {s.customerPhone && (
                        <p className="text-xs text-[#787774]">{s.customerPhone}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-[#787774]">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {s.productName} <span className="text-[#787774]">{s.grams}g</span>
                </td>
                <td className="px-4 py-3">{s.quantity}</td>
                <td className="px-4 py-3 text-[#787774]">{s.promotionLabel ?? "—"}</td>
                <td className="px-4 py-3 text-[#787774]">{s.paymentMethod ?? "—"}</td>
                <td className="px-4 py-3 text-[#787774]">
                  {s.deliveryMethod === "Envío nacional" ? (
                    <>
                      <p>Nacional · {s.deliveryProvider ?? "—"}</p>
                      {s.deliveryState && (
                        <p className="text-xs">{s.deliveryState}</p>
                      )}
                    </>
                  ) : s.deliveryMethod === "Delivery" ? (
                    `Delivery · ${s.deliveryProvider ?? "—"}`
                  ) : (
                    "Pickup"
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {fmtUsd(Number(s.amountUsd))}
                </td>
                <td className="px-4 py-3 text-right text-[#5f5e5b]">
                  {s.amountBs ? fmtBs(Number(s.amountBs)) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(s)}
                      title="Editar venta"
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      title="Eliminar venta"
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-[#787774]">
                  No hay ventas registradas en este rango.
                </td>
              </tr>
            )}
          </tbody>
          {sales.length > 0 && (
            <tfoot>
              <tr className="border-t border-black/10 font-semibold bg-black/[0.02]">
                <td colSpan={7} className="px-4 py-3 text-right">
                  Total
                </td>
                <td className="px-4 py-3 text-right">{fmtUsd(totalUsd)}</td>
                <td className="px-4 py-3 text-right">{fmtBs(totalBs)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {editing && (
        <SaleForm
          sale={editing === "new" ? null : editing}
          products={products}
          promotions={promotions}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
