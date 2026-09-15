"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import ReviewRequestButton from "./ReviewRequestButton";
import { deleteReviewInviteAction } from "./actions";

export interface InviteRow {
  id: number;
  customerName: string;
  createdLabel: string;
  productTitles: string[];
  reviewCount: number;
  whatsappHref: string | null;
  message: string;
}

function InviteItem({ row }: { row: InviteRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const remove = () => {
    if (!confirm(`¿Borrar el enlace de ${row.customerName}? Dejará de abrir.`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteReviewInviteAction(row.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo borrar el enlace.");
      }
    });
  };

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words">{row.customerName}</p>
          <p className="text-xs text-[#787774] break-words">
            {row.createdLabel} ·{" "}
            {row.productTitles.length > 0
              ? row.productTitles.join(" · ")
              : "elige qué probó"}
          </p>
        </div>
        {/* Uno que ya se usó no se borra: es de donde salió su reseña. */}
        {row.reviewCount === 0 && (
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            title="Borrar enlace"
            className="w-8 h-8 -mt-1 -mr-1 shrink-0 flex items-center justify-center rounded-md text-[#5f5e5b] hover:bg-black/5 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="mt-2">
        <ReviewRequestButton
          saleId={null}
          whatsappHref={row.whatsappHref}
          message={row.message}
          askedLabel={null}
          reviewed={row.reviewCount > 0}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

/** Los enlaces hechos a mano, para volver a mandarlos y ver quién ya opinó. */
export default function InviteList({ rows }: { rows: InviteRow[] }) {
  return (
    <div className="mb-4 border border-black/10 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-black/10">
        <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Enlaces creados a mano
        </p>
      </div>
      <ul className="divide-y divide-black/5">
        {rows.map((row) => (
          <InviteItem key={row.id} row={row} />
        ))}
      </ul>
    </div>
  );
}
