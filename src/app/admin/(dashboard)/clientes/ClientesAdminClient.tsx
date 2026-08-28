"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import CustomerForm from "./CustomerForm";
import { deleteCustomerAction } from "./actions";
import {
  customerLocation,
  formatPhone,
  matchesCustomer,
} from "@/lib/customers";
import type { CustomerWithStats } from "@/lib/customers-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

type SortKey = "recientes" | "gastan" | "nombre";

const SORT_LABELS: Record<SortKey, string> = {
  recientes: "Compra más reciente",
  gastan: "Los que más gastan",
  nombre: "Nombre (A–Z)",
};

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";

function sortCustomers(list: CustomerWithStats[], key: SortKey) {
  const sorted = [...list];
  if (key === "nombre") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  if (key === "gastan") {
    return sorted.sort((a, b) => b.stats.totalUsd - a.stats.totalUsd);
  }
  // Quien nunca compró no tiene fecha: va al final en vez de arriba.
  return sorted.sort((a, b) =>
    (b.stats.lastPurchase ?? "").localeCompare(a.stats.lastPurchase ?? ""),
  );
}

export default function ClientesAdminClient({
  customers,
}: {
  customers: CustomerWithStats[];
}) {
  const [editing, setEditing] = useState<CustomerWithStats | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recientes");

  const visible = useMemo(() => {
    const filtered = query.trim()
      ? customers.filter((c) => matchesCustomer(c, query))
      : customers;
    return sortCustomers(filtered, sort);
  }, [customers, query, sort]);

  async function handleDelete(customer: CustomerWithStats) {
    const warning =
      customer.stats.orders > 0
        ? `¿Eliminar a ${customer.name}? Sus ${customer.stats.orders} venta${
            customer.stats.orders === 1 ? "" : "s"
          } no se borran, pero pierden la ficha y su historial.`
        : `¿Eliminar a ${customer.name}?`;
    if (!confirm(warning)) return;
    await deleteCustomerAction(customer.id);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={15} /> Nuevo cliente
        </button>

        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#787774] pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono, zona…"
            className={`${inputClass} pl-8`}
          />
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Ordenar clientes"
          // No se reusa `inputClass`: trae `w-full`, que en la hoja de
          // Tailwind cae después de `w-auto` y por eso le gana — el select
          // terminaría ocupando toda la fila en vez de ajustarse a su texto.
          className="rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f] w-auto"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      {/* Debajo de lg la tabla no entra: cada cliente va como ficha. */}
      <div className="lg:hidden space-y-2">
        {visible.map((customer) => (
          <div
            key={customer.id}
            className="border border-black/10 rounded-lg bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/clientes/${customer.id}`}
                  className="font-medium text-sm hover:underline underline-offset-2"
                >
                  {customer.name}
                </Link>
                <p className="text-xs text-[#787774] mt-0.5 break-words">
                  {[formatPhone(customer.phone), customerLocation(customer)]
                    .filter(Boolean)
                    .join(" · ") || "Sin contacto"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-sm">
                  {fmtUsd(customer.stats.totalUsd)}
                </p>
                <p className="text-xs text-[#787774]">
                  {customer.stats.orders} compra
                  {customer.stats.orders === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#5f5e5b] mt-2">
              {customer.stats.favoriteProduct
                ? `Favorito: ${customer.stats.favoriteProduct} · ${customer.stats.jars} frascos`
                : "Todavía no le has registrado ventas"}
            </p>
            {customer.stats.lastPurchase && (
              <p className="text-xs text-[#787774]">
                Última compra: {customer.stats.lastPurchase}
              </p>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-black/5">
              <button
                onClick={() => setEditing(customer)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium hover:bg-black/5"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => handleDelete(customer)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="border border-black/10 rounded-lg bg-white px-4 py-10 text-center text-sm text-[#787774]">
            {customers.length === 0
              ? "Todavía no hay clientes. Se crean solos al registrar ventas con nombre o teléfono."
              : "Ningún cliente coincide con la búsqueda."}
          </p>
        )}
      </div>

      <div className="hidden lg:block border border-black/10 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Ubicación</th>
                <th className="px-4 py-2.5 font-medium">Producto favorito</th>
                <th className="px-4 py-2.5 font-medium text-right">Compras</th>
                <th className="px-4 py-2.5 font-medium text-right">Frascos</th>
                <th className="px-4 py-2.5 font-medium text-right">Total $</th>
                <th className="px-4 py-2.5 font-medium">Última compra</th>
                <th className="px-4 py-2.5 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clientes/${customer.id}`}
                      className="font-medium hover:underline underline-offset-2"
                    >
                      {customer.name}
                    </Link>
                    {customer.phone && (
                      <p className="text-xs text-[#787774]">
                        {formatPhone(customer.phone)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#5f5e5b]">
                    {customerLocation(customer) || "—"}
                  </td>
                  <td className="px-4 py-3 text-[#5f5e5b]">
                    {customer.stats.favoriteProduct ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {customer.stats.orders}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#5f5e5b]">
                    {customer.stats.jars}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {fmtUsd(customer.stats.totalUsd)}
                  </td>
                  <td className="px-4 py-3 text-[#5f5e5b] whitespace-nowrap">
                    {customer.stats.lastPurchase ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(customer)}
                        title="Editar cliente"
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        title="Eliminar cliente"
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[#787774]">
                    {customers.length === 0
                      ? "Todavía no hay clientes. Se crean solos al registrar ventas con nombre o teléfono."
                      : "Ningún cliente coincide con la búsqueda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <CustomerForm
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
