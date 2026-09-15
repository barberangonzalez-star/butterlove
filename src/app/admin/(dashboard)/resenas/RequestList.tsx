"use client";

import Link from "next/link";
import { useState } from "react";
import ReviewRequestButton from "./ReviewRequestButton";

export interface RequestRow {
  saleId: number;
  saleDate: string;
  customerName: string | null;
  customerId: number | null;
  productNames: string[];
  askedLabel: string | null;
  reviewCount: number;
  whatsappHref: string | null;
  message: string;
}

type Filter = "sin-pedir" | "todas";

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/**
 * Las compras recientes, para ir pidiendo reseñas. Arranca mostrando sólo las
 * que todavía no se pidieron, que son las que quedan por hacer.
 */
export default function RequestList({ rows }: { rows: RequestRow[] }) {
  const [filter, setFilter] = useState<Filter>("sin-pedir");
  const pending = rows.filter((row) => row.reviewCount === 0 && !row.askedLabel);
  const visible = filter === "sin-pedir" ? pending : rows;

  const filters: { value: Filter; label: string }[] = [
    { value: "sin-pedir", label: `Sin pedir (${pending.length})` },
    { value: "todas", label: `Todas (${rows.length})` },
  ];

  return (
    <div className="border border-black/10 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-black/10 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Compras al detal · últimos 6 meses
        </p>
        <div className="flex gap-1.5" role="group" aria-label="Filtrar compras">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`h-8 rounded-full border px-3 text-xs font-medium transition-colors ${
                filter === value
                  ? "border-[#37352f] bg-[#37352f] text-white"
                  : "border-black/15 text-[#5f5e5b] hover:bg-black/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-[#787774]">
          {filter === "sin-pedir"
            ? "Ya pediste reseña a todas las compras recientes."
            : "No hay compras al detal en los últimos 6 meses."}
        </p>
      ) : (
        <ul className="divide-y divide-black/5">
          {visible.map((row) => (
            <li key={row.saleId} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-sm font-medium break-words">
                  {row.customerId ? (
                    <Link
                      href={`/admin/clientes/${row.customerId}`}
                      className="hover:underline underline-offset-2"
                    >
                      {row.customerName ?? "Sin nombre"}
                    </Link>
                  ) : (
                    (row.customerName ?? "Sin nombre")
                  )}
                </p>
                <span className="shrink-0 text-xs text-[#787774] tabular-nums">
                  {shortDate(row.saleDate)}
                </span>
              </div>
              <p className="text-xs text-[#787774] break-words">
                {row.productNames.join(" · ")}
              </p>
              <div className="mt-2">
                <ReviewRequestButton
                  saleId={row.saleId}
                  whatsappHref={row.whatsappHref}
                  message={row.message}
                  askedLabel={row.askedLabel}
                  reviewed={row.reviewCount > 0}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
