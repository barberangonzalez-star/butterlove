"use client";

import { useState } from "react";
import { setReplacementRateAction } from "./actions";

/**
 * La tasa a la que se consiguieron los dólares ese mes. Se guarda al salir del
 * campo: es un número que se toca una vez al mes y no merece un formulario.
 */
export default function RateField({
  month,
  rate,
}: {
  month: string;
  rate: number | null;
}) {
  const [value, setValue] = useState(rate === null ? "" : String(rate));
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
    if (parsed === rate) return;
    setSaving(true);
    try {
      await setReplacementRateAction(month, parsed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="block">
      <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
        Tasa real de reposición
      </span>
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Bs. por dólar"
        className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]"
      />
      <span className="text-xs text-[#787774]">
        {saving ? "Guardando…" : "A cuánto conseguiste los dólares este mes."}
      </span>
    </label>
  );
}
