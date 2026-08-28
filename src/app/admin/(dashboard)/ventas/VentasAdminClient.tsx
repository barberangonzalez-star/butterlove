"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import SaleForm from "./SaleForm";
import SaleDetail from "./SaleDetail";
import { deleteSaleAction } from "./actions";
import type { CustomerChoice } from "@/lib/customers";
import type { AdminProduct } from "@/lib/products-data";
import type { Promotion } from "@/lib/promotions-data";
import type { Sale } from "@/lib/sales-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  `Bs. ${n.toLocaleString("es-VE", { maximumFractionDigits: 2 })}`;

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] bg-black/5 text-[#5f5e5b] px-2 py-0.5 rounded-full">
      {children}
    </span>
  );
}

function deliveryLabel(s: Sale) {
  if (s.deliveryMethod === "Envío nacional") {
    return `Nacional · ${s.deliveryProvider ?? "—"}`;
  }
  if (s.deliveryMethod === "Delivery") {
    return `Delivery · ${s.deliveryProvider ?? "—"}`;
  }
  return "Pickup";
}

export default function VentasAdminClient({
  sales,
  products,
  promotions,
  customers,
  wholesalePrices,
}: {
  sales: Sale[];
  products: AdminProduct[];
  promotions: Promotion[];
  customers: CustomerChoice[];
  /** Precio al mayor por `productId·grams`, para cotizar al marcar el canal. */
  wholesalePrices: Record<string, number>;
}) {
  const [editing, setEditing] = useState<Sale | "new" | null>(null);
  // Una venta abierta a la vez: la lista se lee de arriba abajo, y con varias
  // desplegadas deja de ser una lista.
  const [openId, setOpenId] = useState<number | null>(null);
  const toggle = (id: number) => setOpenId((cur) => (cur === id ? null : id));

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

      {/* Debajo de lg la tabla no entra: cada venta va como ficha. */}
      <div className="lg:hidden space-y-2">
        {sales.length > 0 && (
          <div className="border border-black/10 rounded-lg bg-white px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
              Total · {sales.length} venta{sales.length === 1 ? "" : "s"}
            </span>
            <span className="text-right">
              <span className="block font-semibold">{fmtUsd(totalUsd)}</span>
              <span className="block text-xs text-[#5f5e5b]">{fmtBs(totalBs)}</span>
            </span>
          </div>
        )}

        {sales.map((s) => (
          <div
            key={s.id}
            className="border border-black/10 rounded-lg bg-white overflow-hidden"
          >
            {/* Tocar la ficha la despliega; tocar el nombre se va al cliente. */}
            <div
              onClick={() => toggle(s.id)}
              className="p-4 cursor-pointer active:bg-black/[0.02]"
            >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <ul className="space-y-0.5">
                  {s.items.map((item) => (
                    <li key={item.id} className="font-medium text-sm">
                      {item.productName}{" "}
                      <span className="font-normal text-[#787774]">
                        {item.grams}g × {item.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-[#787774] mt-0.5 flex items-center gap-1">
                  <ChevronRight
                    size={12}
                    className={`transition-transform ${
                      openId === s.id ? "rotate-90" : ""
                    }`}
                  />
                  {s.saleDate}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-sm">{fmtUsd(Number(s.amountUsd))}</p>
                {s.amountBs && (
                  <p className="text-xs text-[#5f5e5b]">{fmtBs(Number(s.amountBs))}</p>
                )}
              </div>
            </div>

            {s.customerName && (
              <p className="text-sm mt-2 break-words">
                {s.customerId ? (
                  <Link
                    href={`/admin/clientes/${s.customerId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium underline underline-offset-2"
                  >
                    {s.customerName}
                  </Link>
                ) : (
                  s.customerName
                )}
                {s.customerPhone && (
                  <span className="text-[#787774]"> · {s.customerPhone}</span>
                )}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 mt-3">
              <Chip>{s.paymentMethod ?? "Pago —"}</Chip>
              <Chip>
                {deliveryLabel(s)}
                {s.deliveryState ? ` · ${s.deliveryState}` : ""}
              </Chip>
              {[
                ...new Set(
                  s.items
                    .map((i) => i.promotionLabel)
                    .filter((label): label is string => Boolean(label)),
                ),
              ].map((label) => (
                <Chip key={label}>{label}</Chip>
              ))}
            </div>

            </div>

            {openId === s.id && <SaleDetail sale={s} />}

            <div className="flex gap-2 p-4 pt-3 border-t border-black/5">
              <button
                onClick={() => setEditing(s)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium hover:bg-black/5"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}

        {sales.length === 0 && (
          <p className="border border-black/10 rounded-lg bg-white px-4 py-10 text-center text-sm text-[#787774]">
            No hay ventas registradas en este rango.
          </p>
        )}
      </div>

      <div className="hidden lg:block border border-black/10 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
              <th className="w-8"></th>
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Productos</th>
              <th className="px-4 py-2.5 font-medium">Pago</th>
              <th className="px-4 py-2.5 font-medium text-right">Monto $</th>
              <th className="px-4 py-2.5 font-medium text-right">Monto Bs.</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <Fragment key={s.id}>
              {/* La fila entera despliega la venta. El nombre y los botones
                  cortan el clic: cada uno hace lo suyo. */}
              <tr
                onClick={() => toggle(s.id)}
                className={`border-b border-black/5 last:border-0 cursor-pointer ${
                  openId === s.id ? "bg-black/[0.03]" : "hover:bg-black/[0.02]"
                }`}
              >
                <td className="pl-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(s.id);
                    }}
                    aria-expanded={openId === s.id}
                    aria-controls={`venta-${s.id}`}
                    aria-label={`Ver detalle de la venta del ${s.saleDate}`}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-[#787774] hover:bg-black/5"
                  >
                    <ChevronRight
                      size={14}
                      className={`transition-transform ${
                        openId === s.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{s.saleDate}</td>
                <td className="px-4 py-3" title={s.customerEmail ?? undefined}>
                  {s.customerName ? (
                    <>
                      {/* Con ficha, el nombre lleva a su historial. Sin ella la
                          venta se registró suelta y no hay a dónde ir. */}
                      {s.customerId ? (
                        <Link
                          href={`/admin/clientes/${s.customerId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium hover:underline underline-offset-2"
                        >
                          {s.customerName}
                        </Link>
                      ) : (
                        <p>{s.customerName}</p>
                      )}
                      {s.customerPhone && (
                        <p className="text-xs text-[#787774]">{s.customerPhone}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-[#787774]">—</span>
                  )}
                </td>
                {/* Productos y cantidades van en columnas separadas pero con
                    la misma lista: cada renglón de una casa con el de la otra. */}
                {/* La cantidad va pegada al producto en vez de en su propia
                    columna: eran dos listas que había que leer en paralelo, y
                    juntas se leen de una. */}
                <td className="px-4 py-3">
                  <ul className="space-y-0.5">
                    {s.items.map((item) => (
                      <li key={item.id} className="whitespace-nowrap">
                        <span className="tabular-nums text-[#787774]">
                          {item.quantity}×
                        </span>{" "}
                        {item.productName}{" "}
                        <span className="text-[#787774]">{item.grams}g</span>
                        {item.promotionLabel && (
                          <span className="ml-1.5 text-[11px] bg-green-50 text-green-800 px-1.5 py-0.5 rounded-full">
                            promo
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3 text-[#787774] whitespace-nowrap">
                  {s.paymentMethod ?? "—"}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(s);
                      }}
                      title="Editar venta"
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(s.id);
                      }}
                      title="Eliminar venta"
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>

              {openId === s.id && (
                <tr id={`venta-${s.id}`}>
                  <td colSpan={8} className="p-0">
                    <SaleDetail sale={s} />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[#787774]">
                  No hay ventas registradas en este rango.
                </td>
              </tr>
            )}
          </tbody>
          {sales.length > 0 && (
            <tfoot>
              <tr className="border-t border-black/10 font-semibold bg-black/[0.02]">
                <td colSpan={5} className="px-4 py-3 text-right">
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
      </div>

      {editing && (
        <SaleForm
          sale={editing === "new" ? null : editing}
          products={products}
          promotions={promotions}
          customers={customers}
          wholesalePrices={wholesalePrices}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
