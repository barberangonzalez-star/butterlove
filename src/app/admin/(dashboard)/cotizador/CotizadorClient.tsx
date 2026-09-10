"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Minus, Plus, RotateCcw } from "lucide-react";
import { productTitle, sizeLabel } from "@/lib/products";
import type { AdminProduct } from "@/lib/products-data";
import {
  CARACAS_MUNICIPALITIES,
  CARACAS_ZONES,
  PAGO_MOVIL,
  PAGO_MOVIL_ACCOUNTS,
  deliveryPriceForZone,
} from "@/lib/config";

type Row = {
  id: string;
  label: string;
  size: string;
  price: number;
};

type DeliveryChoice = "" | "pickup" | "nacional" | string;

/** La cuenta con la que arranca el cotizador: la misma que cobra la tienda. */
const DEFAULT_ACCOUNT = PAGO_MOVIL.bank;

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

/** Cómo se nombra la opción de entrega elegida en la cotización. */
function deliveryLabel(choice: DeliveryChoice) {
  if (choice === "pickup") return "Retiro en tienda";
  if (choice === "nacional") return "Envío nacional";
  return choice;
}

/**
 * La tarifa publicada de la opción de entrega, o `null` si no tiene.
 *
 * Se ofrecen todas las zonas de Caracas y la lista de precios sólo cubre unas
 * cuantas: las demás arrancan sin monto, para escribirlo a mano.
 */
function deliveryTariff(choice: DeliveryChoice): number | null {
  if (choice === "pickup") return 0;
  if (!choice || choice === "nacional") return null;
  return deliveryPriceForZone(choice);
}

/** El monto escrito a mano, o `null` si el campo quedó vacío o ilegible. */
function parseFee(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : null;
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
  // El monto del delivery se guarda como texto: vacío es "a coordinar", no cero.
  const [deliveryFee, setDeliveryFee] = useState("");
  const [account, setAccount] = useState(DEFAULT_ACCOUNT);
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

  /** Al cambiar de entrega el monto vuelve a la tarifa de la zona, si tiene. */
  const chooseDelivery = (choice: DeliveryChoice) => {
    setDelivery(choice);
    const tariff = deliveryTariff(choice);
    setDeliveryFee(tariff === null ? "" : String(tariff));
  };

  const reset = () => {
    setQty({});
    setPriceOverride({});
    setDelivery("");
    setDeliveryFee("");
    setAccount(DEFAULT_ACCOUNT);
  };

  const { selected, subtotal, delivery_, total, quoteText } = useMemo(() => {
    const price = (r: Row) => priceOverride[r.id] ?? r.price;
    const selected = rows.filter((r) => (qty[r.id] ?? 0) > 0);
    const subtotal = selected.reduce(
      (sum, r) => sum + price(r) * (qty[r.id] ?? 0),
      0,
    );
    const delivery_ = delivery
      ? { label: deliveryLabel(delivery), price: parseFee(deliveryFee) }
      : null;
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

    if (delivery_) {
      // El retiro y el envío nacional se nombran solos; una zona va rotulada
      // como delivery, para que se lea a qué corresponde el monto.
      const label =
        delivery === "pickup" || delivery === "nacional"
          ? delivery_.label
          : `Delivery (${delivery_.label})`;
      if (delivery_.price === null) {
        out.push("", `${label}: a coordinar`);
      } else {
        const bs = bcvRate ? ` (Bs. ${fmtBs(delivery_.price * bcvRate)})` : "";
        out.push("", `${label}: ${fmtUsd(delivery_.price)}${bs}`);
      }
    } else {
      out.push("");
    }

    const totalBs = bcvRate ? ` (Bs. ${fmtBs(total * bcvRate)})` : "";
    out.push(`Total: ${fmtUsd(total)}${totalBs}`);

    if (bcvRate) {
      out.push("", `Tasa BCV: Bs. ${fmtBs(bcvRate)}`);
    }

    const bank = PAGO_MOVIL_ACCOUNTS.find((a) => a.bank === account);
    if (bank) {
      out.push("", "💳 Pago Móvil", bank.bank, `CI ${bank.id}`, bank.phone);
    }

    return { selected, subtotal, delivery_, total, quoteText: out.join("\n") };
  }, [rows, qty, priceOverride, delivery, deliveryFee, account, bcvRate]);

  const hasItems = selected.length > 0;
  const tariff = deliveryTariff(delivery);
  const customFee = delivery_ !== null && delivery_.price !== tariff;

  const copy = async () => {
    if (!quoteText) return;
    await navigator.clipboard.writeText(quoteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    // El espacio de abajo es para la barra fija del teléfono, que si no tapa
    // el último producto de la lista.
    <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start pb-20 lg:pb-0">
      <div className="border border-black/10 rounded-lg bg-white divide-y divide-black/5">
        {rows.map((r) => {
          const q = qty[r.id] ?? 0;
          const price = priceOverride[r.id] ?? r.price;
          const discounted = price !== r.price;
          return (
            // En el teléfono el nombre se lleva la primera línea entera y los
            // controles bajan a la segunda: con todo en un renglón el producto
            // quedaba cortado a tres palabras.
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <div className="w-full sm:w-auto sm:flex-1 min-w-0">
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
              <div className="flex items-center gap-3 ml-auto shrink-0">
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
                    className={`w-20 rounded-md border px-1.5 py-1.5 text-sm text-right outline-none focus:border-[#37352f] ${
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
            </div>
          );
        })}
      </div>

      {/* Sin la columna al lado, el resumen va arriba: la entrega y el total se
          eligen y se leen sin recorrer los catorce productos primero. */}
      <div className="order-first lg:order-none lg:sticky lg:top-8 border border-black/10 rounded-lg bg-white p-4 space-y-4">
        <div>
          <label
            htmlFor="entrega"
            className="block text-xs font-medium text-[#787774] mb-1.5"
          >
            Entrega
          </label>
          <select
            id="entrega"
            value={delivery}
            onChange={(e) => chooseDelivery(e.target.value)}
            className="w-full rounded-md border border-black/15 px-2.5 py-2 text-sm outline-none focus:border-[#37352f] bg-white"
          >
            <option value="">Sin especificar</option>
            <option value="pickup">Retiro en tienda</option>
            {CARACAS_MUNICIPALITIES.map((municipality) => (
              <optgroup key={municipality} label={municipality}>
                {CARACAS_ZONES.filter(
                  (z) => z.municipality === municipality,
                ).map((z) => {
                  const price = deliveryPriceForZone(z.name);
                  return (
                    <option key={z.name} value={z.name}>
                      {z.name}
                      {price !== null ? ` — ${fmtUsd(price)}` : ""}
                    </option>
                  );
                })}
              </optgroup>
            ))}
            <option value="nacional">Envío nacional (a coordinar)</option>
          </select>
        </div>

        {delivery && delivery !== "pickup" && (
          <div>
            <label
              htmlFor="monto-delivery"
              className="block text-xs font-medium text-[#787774] mb-1.5"
            >
              Monto del delivery
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-[#787774]">$</span>
              <input
                id="monto-delivery"
                type="number"
                min={0}
                step={0.01}
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="a coordinar"
                className={`flex-1 min-w-0 rounded-md border px-2.5 py-2 text-sm outline-none focus:border-[#37352f] ${
                  customFee
                    ? "border-[#b4700a] text-[#b4700a] font-medium"
                    : "border-black/15"
                }`}
              />
            </div>
            {customFee && tariff !== null && (
              <p className="text-xs text-[#787774] mt-1">
                Tarifa de la zona: {fmtUsd(tariff)}
              </p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="cuenta"
            className="block text-xs font-medium text-[#787774] mb-1.5"
          >
            Cuenta para cobrar
          </label>
          <select
            id="cuenta"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="w-full rounded-md border border-black/15 px-2.5 py-2 text-sm outline-none focus:border-[#37352f] bg-white"
          >
            <option value="">Sin especificar</option>
            {PAGO_MOVIL_ACCOUNTS.map((a) => (
              <option key={a.bank} value={a.bank}>
                {a.bank} — {a.phone}
              </option>
            ))}
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

      {/* En el teléfono el resumen queda arriba y la lista es larga: esta barra
          mantiene el total y el botón de copiar a la mano mientras se arma el
          pedido. */}
      {hasItems && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center gap-3 border-t border-black/10 bg-white/95 backdrop-blur px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[#787774] leading-tight">
              {selected.length} producto{selected.length === 1 ? "" : "s"}
            </p>
            <p className="font-semibold tabular-nums leading-tight">
              {fmtUsd(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            className="ml-auto flex items-center justify-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-4 py-2.5"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
