"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft } from "lucide-react";

interface BcvRatesResponse {
  usd: { rate: number; updatedAt: string } | null;
  eur: { rate: number; updatedAt: string } | null;
}

const fmt = (n: number) =>
  n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BcvConverterWidget() {
  const [bcv, setBcv] = useState<BcvRatesResponse | null>(null);
  const [amount, setAmount] = useState("1");

  useEffect(() => {
    fetch("/api/bcv-rate")
      .then((res) => res.json())
      .then(setBcv)
      .catch(() => setBcv(null));
  }, []);

  const usd = Number(amount) || 0;

  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
        <ArrowRightLeft size={15} />
        Conversor Tasa BCV
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-[#787774]">$</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-md border border-black/15 px-2 py-1.5 text-sm outline-none focus:border-[#37352f]"
        />
      </div>
      {!bcv ? (
        <p className="text-sm text-[#787774]">Cargando tasas...</p>
      ) : (
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-[#787774]">Bs. (USD BCV)</span>
            <span className="font-medium">
              {bcv.usd ? `Bs. ${fmt(usd * bcv.usd.rate)}` : "No disponible"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#787774]">Bs. (EUR BCV)</span>
            <span className="font-medium">
              {bcv.eur ? `Bs. ${fmt(usd * bcv.eur.rate)}` : "No disponible"}
            </span>
          </div>
          <div className="pt-2 mt-2 border-t border-black/5 text-xs text-[#787774]">
            {bcv.usd && <p>1 USD = Bs. {fmt(bcv.usd.rate)}</p>}
            {bcv.eur && <p>1 EUR = Bs. {fmt(bcv.eur.rate)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
