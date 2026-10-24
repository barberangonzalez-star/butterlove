"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";

interface BcvRatesResponse {
  usd: { rate: number; updatedAt: string } | null;
  eur: { rate: number; updatedAt: string } | null;
}

/** Which way the amount is converted: from dollars to bolívares, or back. */
type Direction = "toBs" | "fromBs";

const fmt = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Reads an amount typed either way: "226293.75", "226293,75" or the
 * Venezuelan "226.293,75" copied from a bank transfer. When a comma is
 * present it is the decimal mark and the dots are thousands separators.
 */
function parseAmount(raw: string): number {
  const s = raw.trim().replace(/\s/g, "");
  const normalised = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : 0;
}

export default function BcvConverterWidget() {
  const [bcv, setBcv] = useState<BcvRatesResponse | null>(null);
  const [amount, setAmount] = useState("1");
  const [direction, setDirection] = useState<Direction>("toBs");

  useEffect(() => {
    fetch("/api/bcv-rate")
      .then((res) => res.json())
      .then(setBcv)
      .catch(() => setBcv(null));
  }, []);

  const value = parseAmount(amount);
  const fromBs = direction === "fromBs";

  const rows = [
    {
      label: fromBs ? "$ (USD BCV)" : "Bs. (USD BCV)",
      rate: bcv?.usd?.rate,
      prefix: fromBs ? "$" : "Bs.",
    },
    {
      label: fromBs ? "€ (EUR BCV)" : "Bs. (EUR BCV)",
      rate: bcv?.eur?.rate,
      prefix: fromBs ? "€" : "Bs.",
    },
  ];

  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ArrowRightLeft size={15} />
          Conversor Tasa BCV
        </div>
        <button
          type="button"
          onClick={() => setDirection(fromBs ? "toBs" : "fromBs")}
          className="rounded-md border border-black/15 px-2 py-1 text-xs text-[#37352f] hover:bg-black/5"
        >
          {fromBs ? "Bs → $ / €" : "$ / € → Bs"}
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-[#787774]">{fromBs ? "Bs." : "$ / €"}</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-36 rounded-md border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-[#37352f]"
        />
      </div>
      {!bcv ? (
        <p className="text-sm text-[#787774]">Cargando tasas...</p>
      ) : (
        <div className="space-y-1.5 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between">
              <span className="text-[#787774]">{row.label}</span>
              <span className="font-medium">
                {row.rate
                  ? `${row.prefix} ${fmt(fromBs ? value / row.rate : value * row.rate)}`
                  : "No disponible"}
              </span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-black/5 text-xs text-[#787774]">
            {bcv.usd && <p>1 USD = Bs. {fmt(bcv.usd.rate)}</p>}
            {bcv.eur && <p>1 EUR = Bs. {fmt(bcv.eur.rate)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
