"use client";

import { useTransition } from "react";
import { confirmCasheaInstallmentAction } from "./actions";
import type { CasheaPurchaseWithInstallments } from "@/lib/cashea-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function InstallmentChip({
  installment,
}: {
  installment: CasheaPurchaseWithInstallments["installments"][number];
}) {
  const [isPending, startTransition] = useTransition();
  const paid = installment.expenseId !== null;

  const confirm = () => {
    startTransition(async () => {
      try {
        await confirmCasheaInstallmentAction(installment.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo confirmar el pago.");
      }
    });
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        paid
          ? "border-black/15 text-[#5f5e5b]"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {shortDate(installment.dueDate)} · {fmtUsd(Number(installment.amountUsd))}
      {paid ? (
        " · pagada"
      ) : (
        <button
          type="button"
          onClick={confirm}
          disabled={isPending}
          className="underline underline-offset-2 hover:no-underline disabled:opacity-60"
        >
          {isPending ? "Confirmando…" : "Confirmar pago"}
        </button>
      )}
    </span>
  );
}

/**
 * Estado de cada compra Cashea: la inicial ya está pagada (se registró al
 * crear la compra); cada cuota queda pendiente hasta que Gabriel confirma que
 * la pagó — nunca se registra sola solo por haber llegado la fecha.
 */
export default function CasheaPurchasesList({
  purchases,
}: {
  purchases: CasheaPurchaseWithInstallments[];
}) {
  if (purchases.length === 0) return null;

  return (
    <div className="border border-black/10 rounded-lg bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-black/10">
        <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
          Compras Cashea
        </p>
      </div>
      <ul className="divide-y divide-black/5">
        {purchases.map((purchase) => (
          <li key={purchase.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium">
                {purchase.description ?? "Compra Cashea"}
              </p>
              <span className="text-sm tabular-nums shrink-0">
                {fmtUsd(Number(purchase.totalUsd))}
              </span>
            </div>
            <p className="text-xs text-[#787774] mt-0.5">
              {shortDate(purchase.purchaseDate)} · inicial{" "}
              {fmtUsd(Number(purchase.initialUsd))} pagada
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {purchase.installments.map((installment) => (
                <InstallmentChip key={installment.id} installment={installment} />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
