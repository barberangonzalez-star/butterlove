"use client";

import { useId, useState, useTransition } from "react";
import { Check, ChevronDown, Pencil, Plus, ShoppingBag, Trash2, Undo2, X } from "lucide-react";
import {
  confirmCasheaInstallmentAction,
  deleteCasheaPurchaseAction,
  unconfirmCasheaInstallmentAction,
  updateCasheaInstallmentAction,
  updateCasheaPurchaseAction,
} from "./actions";
import type {
  CasheaInstallment,
  CasheaPurchaseWithInstallments,
} from "@/lib/cashea-data";
import CasheaPurchaseForm from "./CasheaPurchaseForm";

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-2 py-1.5 text-sm outline-none focus:border-[#37352f]";
const iconButtonBase =
  "w-9 h-9 shrink-0 flex items-center justify-center rounded-md disabled:opacity-50";
const iconButtonClass = `${iconButtonBase} text-[#5f5e5b] hover:bg-black/5`;
const saveButtonClass = `${iconButtonBase} bg-[#37352f] text-white hover:opacity-90`;

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function shortDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

/**
 * Una cuota dentro de la compra abierta. En reposo muestra fecha, monto y si
 * está pagada; el lápiz la pasa a modo edición en la misma fila.
 */
function InstallmentRow({
  installment,
  count,
  onError,
}: {
  installment: CasheaInstallment;
  count: number;
  onError: (message: string | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [dueDate, setDueDate] = useState(installment.dueDate);
  const [amount, setAmount] = useState(String(Number(installment.amountUsd)));
  const paid = installment.expenseId !== null;

  const run = (fn: () => Promise<void>, fallback: string, after?: () => void) => {
    onError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
      } catch (err) {
        onError(errorMessage(err, fallback));
      }
    });
  };

  const startEdit = () => {
    setDueDate(installment.dueDate);
    setAmount(String(Number(installment.amountUsd)));
    setEditing(true);
  };

  const save = () =>
    run(
      () =>
        updateCasheaInstallmentAction(installment.id, {
          dueDate,
          amountUsd: Number(amount),
        }),
      "No se pudo guardar la cuota.",
      () => setEditing(false),
    );

  if (editing) {
    return (
      <li className="py-2.5">
        <p className="text-xs font-medium text-[#787774] mb-1.5">
          Cuota {installment.installmentNumber}/{count}
          {paid && " · pagada, su gasto se actualiza también"}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="Fecha de la cuota"
            className={`${inputClass} min-w-0 flex-[3]`}
          />
          <div className="relative min-w-0 flex-[2]">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-sm text-[#787774]">
              $
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Monto de la cuota en dólares"
              className={`${inputClass} pl-5 tabular-nums`}
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            title="Guardar"
            className={saveButtonClass}
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isPending}
            title="Cancelar"
            className={iconButtonClass}
          >
            <X size={16} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-1.5">
      <span
        className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-xs font-medium tabular-nums ${
          paid ? "bg-[#37352f] text-white" : "border border-black/15 text-[#5f5e5b]"
        }`}
        aria-label={paid ? "Pagada" : "Pendiente"}
      >
        {paid ? <Check size={13} /> : installment.installmentNumber}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm tabular-nums">
          {fmtUsd(Number(installment.amountUsd))}
        </p>
        <p className="text-xs text-[#787774] tabular-nums">
          {shortDate(installment.dueDate)}
          {paid ? " · pagada" : ""}
        </p>
      </div>
      {paid ? (
        <button
          type="button"
          onClick={() =>
            run(
              () => unconfirmCasheaInstallmentAction(installment.id),
              "No se pudo deshacer el pago.",
            )
          }
          disabled={isPending}
          title="Deshacer pago"
          className={iconButtonClass}
        >
          <Undo2 size={15} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() =>
            run(
              () => confirmCasheaInstallmentAction(installment.id),
              "No se pudo confirmar el pago.",
            )
          }
          disabled={isPending}
          className="h-9 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {isPending ? "Confirmando…" : "Confirmar pago"}
        </button>
      )}
      <button
        type="button"
        onClick={startEdit}
        disabled={isPending}
        title="Editar cuota"
        className={iconButtonClass}
      >
        <Pencil size={14} />
      </button>
    </li>
  );
}

/**
 * Una compra cerrada ocupa una línea: detalle, cuánto va pagado y la próxima
 * cuota. Al tocarla se despliegan todas sus cuotas, editables.
 */
function PurchaseItem({ purchase }: { purchase: CasheaPurchaseWithInstallments }) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [description, setDescription] = useState(purchase.description ?? "");
  const [isPending, startTransition] = useTransition();

  const { installments } = purchase;
  const paidCount = installments.filter((i) => i.expenseId !== null).length;
  const paidUsd =
    Number(purchase.initialUsd) +
    installments
      .filter((i) => i.expenseId !== null)
      .reduce((sum, i) => sum + Number(i.amountUsd), 0);
  const totalUsd = Number(purchase.totalUsd);
  const next = installments.find((i) => i.expenseId === null);
  const done = !next;
  const progress = totalUsd > 0 ? Math.min(paidUsd / totalUsd, 1) : 0;

  const saveDescription = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateCasheaPurchaseAction(purchase.id, description);
        setEditingDescription(false);
      } catch (err) {
        setError(errorMessage(err, "No se pudo guardar el detalle."));
      }
    });
  };

  const remove = () => {
    if (
      !confirm(
        "¿Eliminar esta compra Cashea? También se borran de Gastos la inicial y las cuotas ya pagadas.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await deleteCasheaPurchaseAction(purchase.id);
      } catch (err) {
        setError(errorMessage(err, "No se pudo eliminar la compra."));
      }
    });
  };

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="w-full px-4 py-3 text-left hover:bg-black/[0.02] active:bg-black/[0.04]"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium truncate">
                {purchase.description ?? "Compra Cashea"}
              </p>
              <span className="text-sm tabular-nums shrink-0">{fmtUsd(totalUsd)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3 mt-0.5">
              <p className="text-xs text-[#787774] truncate">
                {done
                  ? "Pagada completa"
                  : `Próxima ${shortDate(next.dueDate)} · ${fmtUsd(Number(next.amountUsd))}`}
              </p>
              <span className="text-xs text-[#787774] tabular-nums shrink-0">
                {paidCount}/{purchase.installmentCount} cuotas
              </span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-black/5 overflow-hidden">
              <div
                className={`h-full rounded-full ${done ? "bg-emerald-600" : "bg-[#37352f]"}`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#787774] transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        id={panelId}
        inert={!open}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3">
            <div className="rounded-md bg-black/[0.025] px-3 py-2">
              {editingDescription ? (
                <div className="flex items-center gap-2 py-1">
                  <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalle de la compra"
                    aria-label="Detalle de la compra"
                    className={`${inputClass} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={saveDescription}
                    disabled={isPending}
                    title="Guardar detalle"
                    className={saveButtonClass}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDescription(purchase.description ?? "");
                      setEditingDescription(false);
                    }}
                    title="Cancelar"
                    className={iconButtonClass}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#787774] py-1">
                  Comprada el {shortDate(purchase.purchaseDate)} · inicial{" "}
                  {fmtUsd(Number(purchase.initialUsd))} pagada · van{" "}
                  {fmtUsd(paidUsd)} de {fmtUsd(totalUsd)}
                </p>
              )}

              <ul className="divide-y divide-black/5">
                {installments.map((installment) => (
                  <InstallmentRow
                    key={`${installment.id}-${installment.dueDate}-${installment.amountUsd}`}
                    installment={installment}
                    count={purchase.installmentCount}
                    onError={setError}
                  />
                ))}
              </ul>
            </div>

            {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

            <div className="flex items-center gap-1 mt-2">
              {!editingDescription && (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="h-9 flex items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[#5f5e5b] hover:bg-black/5"
                >
                  <Pencil size={13} /> Editar detalle
                </button>
              )}
              <button
                type="button"
                onClick={remove}
                disabled={isPending}
                className="ml-auto h-9 flex items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={13} /> Eliminar compra
              </button>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Compras Cashea en una sola tarjeta: cada compra es una línea que se
 * despliega para ver y editar sus cuotas, y el formulario de una compra nueva
 * se abre desde el encabezado sólo cuando hace falta. Cada cuota queda
 * pendiente hasta que Gabriel confirma que la pagó — nunca se registra sola
 * por haber llegado la fecha.
 */
export default function CasheaPurchasesList({
  purchases,
  defaultDate,
  bcvRate,
}: {
  purchases: CasheaPurchaseWithInstallments[];
  defaultDate: string;
  bcvRate: number | null;
}) {
  const [adding, setAdding] = useState(false);
  // Remonta el formulario al cerrarlo, así cada compra nueva arranca limpia.
  const [formKey, setFormKey] = useState(0);

  const closeForm = () => {
    setAdding(false);
    setFormKey((k) => k + 1);
  };

  const pendingUsd = purchases.reduce(
    (sum, p) =>
      sum +
      p.installments
        .filter((i) => i.expenseId === null)
        .reduce((s, i) => s + Number(i.amountUsd), 0),
    0,
  );

  return (
    <div className="border border-black/10 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-black/10">
        <ShoppingBag size={15} className="shrink-0 text-[#787774]" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-[#787774] uppercase tracking-wide">
            Compras Cashea
          </p>
          {pendingUsd > 0 && (
            <p className="text-xs text-[#787774] tabular-nums">
              Por pagar {fmtUsd(pendingUsd)}
            </p>
          )}
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-9 flex items-center gap-1.5 rounded-md bg-[#37352f] px-3 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus size={15} /> Nueva
          </button>
        )}
      </div>

      {adding && (
        <div className="p-4 border-b border-black/10 bg-black/[0.015]">
          <CasheaPurchaseForm
            key={formKey}
            defaultDate={defaultDate}
            bcvRate={bcvRate}
            onDone={closeForm}
            onCancel={closeForm}
          />
        </div>
      )}

      {purchases.length === 0 ? (
        !adding && (
          <p className="px-4 py-6 text-center text-sm text-[#787774]">
            Sin compras Cashea.
          </p>
        )
      ) : (
        <ul className="divide-y divide-black/5">
          {purchases.map((purchase) => (
            <PurchaseItem key={purchase.id} purchase={purchase} />
          ))}
        </ul>
      )}
    </div>
  );
}
