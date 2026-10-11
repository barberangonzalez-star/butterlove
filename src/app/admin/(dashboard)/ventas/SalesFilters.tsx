"use client";

import { useState } from "react";
import type { AdminProduct } from "@/lib/products-data";
import { SALE_CHANNELS } from "@/lib/config";

export interface MonthOption {
  value: string;
  label: string;
}

/**
 * Filtro por rango de fechas o por mes. Son excluyentes: elegir un mes limpia
 * el rango y viceversa, así nunca se manda una combinación ambigua al servidor.
 */
export default function SalesFilters({
  from,
  to,
  month,
  productId,
  channel,
  products,
  months,
}: {
  from?: string;
  to?: string;
  month?: string;
  productId?: string;
  channel?: string;
  products: AdminProduct[];
  months: MonthOption[];
}) {
  const [fromValue, setFromValue] = useState(from ?? "");
  const [toValue, setToValue] = useState(to ?? "");
  const [monthValue, setMonthValue] = useState(month ?? "");

  const hasFilters = Boolean(
    fromValue || toValue || monthValue || productId || channel,
  );

  return (
    <form
      method="get"
      // Tres columnas en tablet (iPad en vertical): Desde | Hasta | Mes arriba y
      // Producto | Canal | Filtrar abajo. La fila flexible queda para pantallas
      // anchas, donde cada fecha tiene su ancho fijo.
      className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-end"
    >
      <label className="block min-w-0 lg:w-40">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Desde
        </span>
        <input
          type="date"
          name="from"
          value={fromValue}
          onChange={(e) => {
            setFromValue(e.target.value);
            if (e.target.value) setMonthValue("");
          }}
          className="mt-1 block w-full min-w-0 h-10 lg:h-9 rounded-md border border-black/15 bg-white px-3 text-sm"
        />
      </label>
      <label className="block min-w-0 lg:w-40">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Hasta
        </span>
        <input
          type="date"
          name="to"
          value={toValue}
          onChange={(e) => {
            setToValue(e.target.value);
            if (e.target.value) setMonthValue("");
          }}
          className="mt-1 block w-full min-w-0 h-10 lg:h-9 rounded-md border border-black/15 bg-white px-3 text-sm"
        />
      </label>
      <label className="block col-span-2 sm:col-span-1 min-w-0">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Mes
        </span>
        <select
          name="month"
          value={monthValue}
          onChange={(e) => {
            setMonthValue(e.target.value);
            if (e.target.value) {
              setFromValue("");
              setToValue("");
            }
          }}
          className="mt-1 block w-full h-10 lg:h-9 rounded-md border border-black/15 bg-white px-3 text-sm lg:min-w-[160px] capitalize"
        >
          <option value="">Todos</option>
          {months.map((m) => (
            <option key={m.value} value={m.value} className="capitalize">
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block col-span-2 sm:col-span-1 min-w-0">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Producto
        </span>
        <select
          name="productId"
          defaultValue={productId ?? ""}
          className="mt-1 block w-full h-10 lg:h-9 rounded-md border border-black/15 bg-white px-3 text-sm lg:min-w-[160px]"
        >
          <option value="">Todos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block col-span-2 sm:col-span-1 min-w-0">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Canal
        </span>
        <select
          name="channel"
          defaultValue={channel ?? ""}
          className="mt-1 block w-full h-10 lg:h-9 rounded-md border border-black/15 bg-white px-3 text-sm lg:min-w-[110px]"
        >
          <option value="">Todos</option>
          {SALE_CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 sm:col-span-1 flex items-end gap-2 lg:contents">
        <button
          type="submit"
          className="flex-1 h-10 lg:h-9 rounded-md border border-black/15 px-3.5 text-sm font-medium hover:bg-black/5 lg:flex-none"
        >
          Filtrar
        </button>
        {hasFilters && (
          <a
            href="/admin/ventas"
            className="shrink-0 inline-flex items-center h-10 lg:h-9 text-sm text-[#787774] hover:text-[#37352f] px-3"
          >
            Limpiar
          </a>
        )}
      </div>
    </form>
  );
}
