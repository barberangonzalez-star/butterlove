"use client";

import { useState } from "react";
import type { AdminProduct } from "@/lib/products-data";

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
  products,
  months,
}: {
  from?: string;
  to?: string;
  month?: string;
  productId?: string;
  products: AdminProduct[];
  months: MonthOption[];
}) {
  const [fromValue, setFromValue] = useState(from ?? "");
  const [toValue, setToValue] = useState(to ?? "");
  const [monthValue, setMonthValue] = useState(month ?? "");

  const hasFilters = Boolean(fromValue || toValue || monthValue || productId);

  return (
    <form
      method="get"
      className="grid grid-cols-2 gap-3 mb-4 sm:flex sm:flex-wrap sm:items-end"
    >
      <label className="block">
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
          className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5"
        />
      </label>
      <label className="block">
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
          className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5"
        />
      </label>
      <label className="block col-span-2 sm:col-auto">
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
          className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5 sm:min-w-[160px] capitalize"
        >
          <option value="">Todos</option>
          {months.map((m) => (
            <option key={m.value} value={m.value} className="capitalize">
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block col-span-2 sm:col-auto">
        <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Producto
        </span>
        <select
          name="productId"
          defaultValue={productId ?? ""}
          className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5 sm:min-w-[160px]"
        >
          <option value="">Todos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="col-span-2 flex items-center gap-2 sm:contents">
        <button
          type="submit"
          className="flex-1 rounded-md border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-black/5 sm:flex-none sm:py-1.5"
        >
          Filtrar
        </button>
        {hasFilters && (
          <a
            href="/admin/ventas"
            className="shrink-0 text-sm text-[#787774] hover:text-[#37352f] px-3 py-2 sm:py-1.5"
          >
            Limpiar
          </a>
        )}
      </div>
    </form>
  );
}
