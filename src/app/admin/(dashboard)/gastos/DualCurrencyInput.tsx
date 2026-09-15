"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-black/15 bg-white px-2.5 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "block text-xs font-medium text-[#787774] mb-1";

/**
 * Un monto que se puede entrar en $ o en Bs., siempre con las dos opciones
 * visibles: cambiar cualquiera de los dos convierte el otro con la tasa BCV
 * del día. El dólar es la fuente de verdad que sube al padre — es lo que se
 * guarda — y el bolívar es sólo una vista de conveniencia sobre ese número.
 */
export default function DualCurrencyInput({
  label,
  usd,
  onChange,
  bcvRate,
}: {
  label: string;
  usd: number;
  onChange: (usd: number) => void;
  bcvRate: number | null;
}) {
  // Texto libre mientras se escribe (permite "12." o vacío a medio tipear);
  // sólo se convierte a número cuando parsea.
  const [usdText, setUsdText] = useState(usd ? String(usd) : "");
  const [bsText, setBsText] = useState(
    usd && bcvRate ? (usd * bcvRate).toFixed(2) : "",
  );

  const handleUsdChange = (text: string) => {
    setUsdText(text);
    const value = Number(text);
    if (text.trim() === "" || !Number.isFinite(value)) return;
    onChange(value);
    setBsText(bcvRate ? (value * bcvRate).toFixed(2) : "");
  };

  const handleBsChange = (text: string) => {
    setBsText(text);
    const value = Number(text);
    if (text.trim() === "" || !Number.isFinite(value) || !bcvRate) return;
    const usdValue = value / bcvRate;
    onChange(usdValue);
    setUsdText(usdValue.toFixed(2));
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className={labelClass}>{label} ($)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={usdText}
          onChange={(e) => handleUsdChange(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>{label} (Bs.)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={bsText}
          onChange={(e) => handleBsChange(e.target.value)}
          disabled={!bcvRate}
          placeholder={bcvRate ? undefined : "Tasa no disponible"}
          className={`${inputClass} disabled:bg-black/5 disabled:text-[#a3a29e]`}
        />
      </label>
    </div>
  );
}
