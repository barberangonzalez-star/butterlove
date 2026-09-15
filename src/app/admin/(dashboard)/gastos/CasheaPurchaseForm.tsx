"use client";

import { useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { createCasheaPurchaseAction } from "./actions";
import { CASHEA_INSTALLMENT_OPTIONS } from "@/lib/config";
import DualCurrencyInput from "./DualCurrencyInput";

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "block text-xs font-medium text-[#787774] mb-1";

/**
 * Registrar una compra a crédito con Cashea: la inicial se paga hoy (entra a
 * Gastos de una vez) y el resto se reparte en cuotas futuras que se registran
 * solas, y avisan, cuando llega su fecha.
 */
export default function CasheaPurchaseForm({
  defaultDate,
  bcvRate,
}: {
  defaultDate: string;
  bcvRate: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [purchaseDate, setPurchaseDate] = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [totalUsd, setTotalUsd] = useState(0);
  const [initialUsd, setInitialUsd] = useState(0);
  const [installmentCount, setInstallmentCount] =
    useState<(typeof CASHEA_INSTALLMENT_OPTIONS)[number]>(3);
  const [installmentDates, setInstallmentDates] = useState<string[]>(
    Array(3).fill(""),
  );
  const [error, setError] = useState<string | null>(null);

  const chooseCount = (count: (typeof CASHEA_INSTALLMENT_OPTIONS)[number]) => {
    setInstallmentCount(count);
    setInstallmentDates((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push("");
      return next;
    });
  };

  const remaining = Math.max(totalUsd - initialUsd, 0);
  const perInstallment = installmentCount > 0 ? remaining / installmentCount : 0;

  const reset = () => {
    setPurchaseDate(defaultDate);
    setDescription("");
    setTotalUsd(0);
    setInitialUsd(0);
    setInstallmentCount(3);
    setInstallmentDates(Array(3).fill(""));
  };

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
        reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar la compra.");
      }
    });
  };

  return (
    <div className="border border-black/10 rounded-lg bg-white p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShoppingBag size={15} />
        Compra Cashea (en cuotas)
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelClass}>Fecha de la compra</span>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
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
        label="Total de la compra"
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
        <div className="flex flex-wrap gap-1.5">
          {CASHEA_INSTALLMENT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => chooseCount(count)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                installmentCount === count
                  ? "border-[#37352f] bg-[#37352f] text-white"
                  : "border-black/15 text-[#5f5e5b] hover:bg-black/5"
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {remaining > 0 && (
        <p className="text-xs text-[#787774]">
          Queda ${remaining.toFixed(2)} en {installmentCount} cuota
          {installmentCount === 1 ? "" : "s"} de ${perInstallment.toFixed(2)} cada una.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        {installmentDates.map((date, i) => (
          <label key={i} className="block">
            <span className={labelClass}>Fecha cuota {i + 1}</span>
            <input
              type="date"
              value={date}
              onChange={(e) =>
                setInstallmentDates((prev) =>
                  prev.map((d, idx) => (idx === i ? e.target.value : d)),
                )
              }
              className={inputClass}
            />
          </label>
        ))}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="rounded-md bg-[#37352f] text-white text-sm font-medium px-4 py-2 hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Registrando…" : "Registrar compra Cashea"}
        </button>
      </div>
    </div>
  );
}
