"use client";

import { useState, useTransition } from "react";
import { createCasheaPurchaseAction } from "./actions";
import { CASHEA_INSTALLMENT_OPTIONS } from "@/lib/config";
import DualCurrencyInput from "./DualCurrencyInput";

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "block text-xs font-medium text-[#787774] mb-1";

/** Cashea cobra cada cuota 14 días después de la anterior. */
const CASHEA_INSTALLMENT_INTERVAL_DAYS = 14;

/** Suma días a una fecha "YYYY-MM-DD" en UTC, para no correrse un día por la zona horaria. */
function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/** Cuota 1 a los 14 días de la compra, cuota 2 a los 28, y así — cada 14 días. */
function computeInstallmentDates(purchaseDate: string, count: number): string[] {
  if (!purchaseDate) return Array(count).fill("");
  return Array.from({ length: count }, (_, i) =>
    addDaysIso(purchaseDate, CASHEA_INSTALLMENT_INTERVAL_DAYS * (i + 1)),
  );
}

/**
 * Registrar una compra a crédito con Cashea: la inicial se paga hoy (entra a
 * Gastos de una vez) y el resto se reparte en cuotas futuras, que se confirman
 * a mano cuando se pagan. Vive dentro de la tarjeta de Compras Cashea y se
 * abre sólo cuando se va a usar.
 */
export default function CasheaPurchaseForm({
  defaultDate,
  bcvRate,
  onDone,
  onCancel,
}: {
  defaultDate: string;
  bcvRate: number | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [purchaseDate, setPurchaseDate] = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [totalUsd, setTotalUsd] = useState(0);
  const [initialUsd, setInitialUsd] = useState(0);
  const [installmentCount, setInstallmentCount] =
    useState<(typeof CASHEA_INSTALLMENT_OPTIONS)[number]>(3);
  const [installmentDates, setInstallmentDates] = useState<string[]>(() =>
    computeInstallmentDates(defaultDate, 3),
  );
  const [error, setError] = useState<string | null>(null);

  const chooseCount = (count: (typeof CASHEA_INSTALLMENT_OPTIONS)[number]) => {
    setInstallmentCount(count);
    setInstallmentDates(computeInstallmentDates(purchaseDate, count));
  };

  const changePurchaseDate = (date: string) => {
    setPurchaseDate(date);
    setInstallmentDates(computeInstallmentDates(date, installmentCount));
  };

  const remaining = Math.max(totalUsd - initialUsd, 0);
  const perInstallment = installmentCount > 0 ? remaining / installmentCount : 0;

  const submit = () => {
    setError(null);
    if (totalUsd <= 0) {
      setError("El total de la compra tiene que ser mayor que cero.");
      return;
    }
    if (initialUsd > totalUsd) {
      setError("La inicial no puede ser mayor que el total.");
      return;
    }
    if (installmentDates.some((d) => !d)) {
      setError("Falta la fecha de alguna cuota.");
      return;
    }

    startTransition(async () => {
      try {
        await createCasheaPurchaseAction({
          purchaseDate,
          description: description.trim() || null,
          totalUsd,
          initialUsd,
          installmentCount,
          bcvRate,
          installmentDates,
        });
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar la compra.");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Fecha de la compra</span>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => changePurchaseDate(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Detalle (opcional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Stand para feria, nevera…"
            className={inputClass}
          />
        </label>
      </div>

      <DualCurrencyInput
        label="Total"
        usd={totalUsd}
        onChange={setTotalUsd}
        bcvRate={bcvRate}
      />
      <DualCurrencyInput
        label="Inicial"
        usd={initialUsd}
        onChange={setInitialUsd}
        bcvRate={bcvRate}
      />

      <div>
        <span className={labelClass}>Número de cuotas</span>
        <div className="grid grid-cols-6 gap-1.5 sm:flex sm:flex-wrap">
          {CASHEA_INSTALLMENT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => chooseCount(count)}
              aria-pressed={installmentCount === count}
              className={`h-9 rounded-full border text-sm font-medium transition-colors sm:min-w-10 sm:px-3 ${
                installmentCount === count
                  ? "border-[#37352f] bg-[#37352f] text-white"
                  : "border-black/15 text-[#5f5e5b] hover:bg-black/5"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
        {remaining > 0 && (
          <p className="text-xs text-[#787774] mt-1.5">
            Quedan ${remaining.toFixed(2)} en {installmentCount} cuota
            {installmentCount === 1 ? "" : "s"} de ${perInstallment.toFixed(2)}.
          </p>
        )}
      </div>

      <div>
        <p className="text-xs text-[#787774] mb-1.5">
          Las fechas van cada 14 días desde la compra; cámbialas si alguna cae
          distinto.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {installmentDates.map((date, i) => (
            <label key={i} className="block min-w-0">
              <span className={labelClass}>Cuota {i + 1}</span>
              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setInstallmentDates((prev) =>
                    prev.map((d, idx) => (idx === i ? e.target.value : d)),
                  )
                }
                className={`${inputClass} px-2`}
              />
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 sm:flex-none rounded-md border border-black/15 px-4 py-2 text-sm hover:bg-black/5"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="flex-1 sm:flex-none rounded-md bg-[#37352f] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Registrando…" : "Registrar compra"}
        </button>
      </div>
    </div>
  );
}
