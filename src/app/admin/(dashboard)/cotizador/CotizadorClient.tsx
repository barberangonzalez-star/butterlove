"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Minus, Plus, RotateCcw } from "lucide-react";
import { productTitle, sizeLabel } from "@/lib/products";
import type { AdminProduct } from "@/lib/products-data";
import { DELIVERY_ZONES } from "@/lib/config";

type Row = {
  id: string;
  label: string;
  size: string;
  price: number;
};

type DeliveryChoice = "" | "pickup" | "nacional" | string;

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtBs = (n: number) =>
  n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function useBcvRate() {
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bcv-rate")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setRate(json.usd?.rate ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}

/** Etiqueta y costo de la opción de entrega elegida. `null` de costo es "a coordinar". */
function deliveryInfo(choice: DeliveryChoice): { label: string; price: number | null } | null {
  if (!choice) return null;
  if (choice === "pickup") return { label: "Retiro en tienda", price: 0 };
  if (choice === "nacional") return { label: "Envío nacional", price: null };
  const zone = DELIVERY_ZONES.find((z) => z.name === choice);
  return zone ? { label: zone.name, price: zone.price } : null;
}

export default function CotizadorClient({
  products,
}: {
  products: AdminProduct[];
}) {
  const rows: Row[] = useMemo(
    () =>
      products.flatMap((p) =>
        p.sizes.map((size) => ({
          id: `${p.key}:${size.grams}`,
          label: productTitle(p),
          size: sizeLabel(p, size),
          price: size.price,
        })),
      ),
    [products],
  );

  const [qty, setQty] = useState<Record<string, number>>({});
  const [priceOverride, setPriceOverride] = useState<Record<string, number>>({});
  const [delivery, setDelivery] = useState<DeliveryChoice>("");
  const [copied, setCopied] = useState(false);
  const bcvRate = useBcvRate();

  const setRowQty = (id: string, value: number) => {
    const next = Math.max(0, Math.min(99, value));
    setQty((prev) => ({ ...prev, [id]: next }));
    // Sin unidades en el pedido no hay precio que recordar: la próxima vez
    // que se agregue arranca de nuevo en el precio de catálogo.
    if (next === 0) {
      setPriceOverride((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const setRowPrice = (id: string, value: number) => {
    setPriceOverride((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const reset = () => {
    setQty({});
    setPriceOverride({});
    setDelivery("");
  };

  const { selected, subtotal, delivery_, total, quoteText } = useMemo(() => {
    const price = (r: Row) => priceOverride[r.id] ?? r.price;
    const selected = rows.filter((r) => (qty[r.id] ?? 0) > 0);
    const subtotal = selected.reduce(
      (sum, r) => sum + price(r) * (qty[r.id] ?? 0),
      0,
    );
    const delivery_ = deliveryInfo(delivery);
    const total = subtotal + (delivery_?.price ?? 0);

    if (selected.length === 0) {
      return { selected, subtotal, delivery_, total, quoteText: "" };
    }

    const lines = selected.map((r) => {
      const q = qty[r.id] ?? 0;
      const lineTotal = price(r) * q;
      const bs = bcvRate ? ` (Bs. ${fmtBs(lineTotal * bcvRate)})` : "";
      return `• ${r.label} ${r.size} x${q}: ${fmtUsd(lineTotal)}${bs}`;
    });

    const out = ["🧈 Cotización Butter Love", "", ...lines];

    if (delivery_ && delivery_.price !== null) {
      const bs = bcvRate ? ` (Bs. ${fmtBs(delivery_.price * bcvRate)})` : "";
      out.push("", `Delivery (${delivery_.label}): ${fmtUsd(delivery_.price)}${bs}`);
    } else if (delivery_) {
      out.push("", `${delivery_.label}: a coordinar`);
    } else {
      out.push("");
    }

    const totalBs = bcvRate ? ` (Bs. ${fmtBs(total * bcvRate)})` : "";
    out.push(`Total: ${fmtUsd(total)}${totalBs}`);

    if (bcvRate) {
      out.push("", `Tasa BCV: Bs. ${fmtBs(bcvRate)}`);
    }

    return { selected, subtotal, delivery_, total, quoteText: out.join("\n") };
  }, [rows, qty, priceOverride, delivery, bcvRate]);

  const hasItems = selected.length > 0;

  const copy = async () => {
    if (!quoteText) return;
    await navigator.clipboard.writeText(quoteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div className="border border-black/10 rounded-lg bg-white divide-y divide-black/5">
        {rows.map((r) => {
          const q = qty[r.id] ?? 0;
          const price = priceOverride[r.id] ?? r.price;
          const discounted = price !== r.price;
          return (
            <div
              key={r.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.label}</p>
                <p className="text-xs text-[#787774]">
                  {r.size}
                  {discounted && (
                    <span className="line-through mr-1">
                      {" "}
                      {fmtUsd(r.price)}
                    </span>
                  )}
                  {bcvRate && ` · Bs. ${fmtBs(price * bcvRate)}`}
                </p>
              </div>
              {q > 0 ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-sm text-[#787774]">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={price}
                    onChange={(e) => setRowPrice(r.id, Number(e.target.value))}
                    aria-label={`Precio de ${r.label}`}
                    className={`w-16 rounded-md border px-1.5 py-1.5 text-sm text-right outline-none focus:border-[#37352f] ${
                      discounted
                        ? "border-[#b4700a] text-[#b4700a] font-medium"
                        : "border-black/15"
                    }`}
                  />
                </div>
              ) : (
                <span className="text-xs text-[#787774] shrink-0">
                  {fmtUsd(r.price)}
                </span>
              )}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setRowQty(r.id, q - 1)}
                  disabled={q === 0}
                  aria-label={`Restar ${r.label}`}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-black/15 text-[#37352f] disabled:opacity-30 hover:bg-black/5"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm tabular-nums">{q}</span>
                <button
                  type="button"
                  onClick={() => setRowQty(r.id, q + 1)}
                  aria-label={`Sumar ${r.label}`}
                  className="w-8 h-8 flex items-center justify-center rounded-md border border-black/15 text-[#37352f] hover:bg-black/5"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lg:sticky lg:top-8 border border-black/10 rounded-lg bg-white p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#787774] mb-1.5">
            Entrega
          </label>
          <select
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            className="w-full rounded-md border border-black/15 px-2.5 py-2 text-sm outline-none focus:border-[#37352f] bg-white"
          >
            <option value="">Sin especificar</option>
            <option value="pickup">Retiro en tienda</option>
            {DELIVERY_ZONES.map((z) => (
              <option key={z.name} value={z.name}>
                {z.name} — {fmtUsd(z.price)}
              </option>
            ))}
            <option value="nacional">Envío nacional (a coordinar)</option>
          </select>
        </div>

        <div className="space-y-1.5 text-sm pt-1 border-t border-black/5">
          <div className="flex justify-between pt-3">
            <span className="text-[#787774]">Subtotal</span>
            <span className="font-medium tabular-nums">{fmtUsd(subtotal)}</span>
          </div>
          {delivery_ && (
            <div className="flex justify-between">
              <span className="text-[#787774]">{delivery_.label}</span>
              <span className="font-medium tabular-nums">
                {delivery_.price === null ? "a coordinar" : fmtUsd(delivery_.price)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-base pt-1.5 border-t border-black/5">
            <span className="font-semibold">Total</span>
            <span className="font-semibold tabular-nums">{fmtUsd(total)}</span>
          </div>
          {bcvRate && (
            <div className="flex justify-between text-xs text-[#787774]">
              <span>Bs. (tasa BCV {fmtBs(bcvRate)})</span>
              <span className="tabular-nums">Bs. {fmtBs(total * bcvRate)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={copy}
            disabled={!hasItems}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium py-2 disabled:opacity-30"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "¡Copiado!" : "Copiar cotización"}
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reiniciar"
            className="w-9 h-9 flex items-center justify-center rounded-md border border-black/15 text-[#37352f] hover:bg-black/5"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
