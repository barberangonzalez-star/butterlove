"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { createSaleAction } from "./actions";
import { PAYMENT_METHODS } from "@/lib/config";
import type { AdminProduct } from "@/lib/products-data";
import type { Promotion } from "@/lib/promotions-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass =
  "text-xs font-medium text-[#787774] uppercase tracking-wide";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function SaleForm({
  products,
  promotions,
  onClose,
}: {
  products: AdminProduct[];
  promotions: Promotion[];
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [grams, setGrams] = useState(products[0]?.sizes[0]?.grams ?? 0);
  const [quantity, setQuantity] = useState(1);
  const [promotionId, setPromotionId] = useState("");
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState("Pickup");
  const [deliveryProvider, setDeliveryProvider] = useState("Ridery");
  const [deliveryFee, setDeliveryFee] = useState("0");

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedSize = selectedProduct?.sizes.find((s) => s.grams === grams);
  const unitPrice = selectedSize?.price ?? 0;
  const isSelfDelivery = deliveryMethod === "Delivery" && deliveryProvider === "Nosotros";
  const computedAmount = useMemo(() => {
    const base = unitPrice * quantity;
    const fee = isSelfDelivery ? Number(deliveryFee) || 0 : 0;
    return base + fee;
  }, [unitPrice, quantity, isSelfDelivery, deliveryFee]);
  const amount = amountOverride !== null ? Number(amountOverride) : computedAmount;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await createSaleAction(formData);
          onClose();
        }}
        className="relative w-full max-w-md h-full bg-white border-l border-black/10 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/10 sticky top-0 bg-white">
          <h2 className="font-semibold text-sm">Registrar venta</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <label className="block">
            <span className={labelClass}>Producto</span>
            <select
              name="productId"
              value={productId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setProductId(id);
                const p = products.find((pr) => pr.id === id);
                setGrams(p?.sizes[0]?.grams ?? 0);
                setAmountOverride(null);
              }}
              className={`${inputClass} mt-1`}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Tamaño</span>
            <select
              name="grams"
              value={grams}
              onChange={(e) => {
                setGrams(Number(e.target.value));
                setAmountOverride(null);
              }}
              className={`${inputClass} mt-1`}
            >
              {selectedProduct?.sizes.map((s) => (
                <option key={s.grams} value={s.grams}>
                  {s.grams}g — ${s.price}
                </option>
              ))}
            </select>
          </label>

          <input type="hidden" name="unitPriceUsd" value={unitPrice} />

          <label className="block">
            <span className={labelClass}>Cantidad</span>
            <input
              type="number"
              name="quantity"
              min={1}
              value={quantity}
              onChange={(e) => {
                setQuantity(Number(e.target.value) || 1);
                setAmountOverride(null);
              }}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Promoción (opcional)</span>
            <select
              name="promotionId"
              value={promotionId}
              onChange={(e) => {
                setPromotionId(e.target.value);
                const promo = promotions.find((p) => String(p.id) === e.target.value);
                if (promo && promo.bundleQuantity > 1) {
                  setQuantity(promo.bundleQuantity);
                  setAmountOverride(null);
                }
              }}
              className={`${inputClass} mt-1`}
            >
              <option value="">Ninguna</option>
              {promotions
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input
              type="date"
              name="saleDate"
              defaultValue={todayIso()}
              required
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Método de pago</span>
            <select name="paymentMethod" defaultValue={PAYMENT_METHODS[0]} className={`${inputClass} mt-1`}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Entrega</span>
            <select
              name="deliveryMethod"
              value={deliveryMethod}
              onChange={(e) => {
                setDeliveryMethod(e.target.value);
                setAmountOverride(null);
              }}
              className={`${inputClass} mt-1`}
            >
              <option value="Pickup">Pickup</option>
              <option value="Delivery">Delivery</option>
            </select>
          </label>

          {deliveryMethod === "Delivery" && (
            <label className="block">
              <span className={labelClass}>Proveedor</span>
              <select
                name="deliveryProvider"
                value={deliveryProvider}
                onChange={(e) => {
                  setDeliveryProvider(e.target.value);
                  setAmountOverride(null);
                }}
                className={`${inputClass} mt-1`}
              >
                <option value="Ridery">Ridery</option>
                <option value="Yummy">Yummy</option>
                <option value="Nosotros">Nosotros</option>
              </select>
            </label>
          )}

          {isSelfDelivery && (
            <label className="block">
              <span className={labelClass}>Monto delivery ($)</span>
              <input
                type="number"
                step="0.01"
                name="deliveryFeeUsd"
                value={deliveryFee}
                onChange={(e) => {
                  setDeliveryFee(e.target.value);
                  setAmountOverride(null);
                }}
                className={`${inputClass} mt-1`}
              />
              <p className="text-xs text-[#787774] mt-1">
                Se suma automáticamente al monto total de la venta.
              </p>
            </label>
          )}

          <div className="pt-2 border-t border-black/5">
            <span className={labelClass}>Datos del cliente (opcional)</span>
          </div>

          <label className="block">
            <span className={labelClass}>Nombre</span>
            <input name="customerName" className={`${inputClass} mt-1`} />
          </label>

          <label className="block">
            <span className={labelClass}>Correo</span>
            <input type="email" name="customerEmail" className={`${inputClass} mt-1`} />
          </label>

          <label className="block">
            <span className={labelClass}>Teléfono</span>
            <input type="tel" name="customerPhone" className={`${inputClass} mt-1`} />
          </label>

          <label className="block">
            <span className={labelClass}>Monto ($)</span>
            <input
              type="number"
              step="0.01"
              name="amountUsd"
              value={amount}
              onChange={(e) => setAmountOverride(e.target.value)}
              className={`${inputClass} mt-1`}
            />
            <p className="text-xs text-[#787774] mt-1">
              Sugerido: ${computedAmount.toFixed(2)}
              {isSelfDelivery ? " (incluye delivery)" : ""} — ajústalo si aplicaste un
              descuento de promo
            </p>
          </label>

          <label className="block">
            <span className={labelClass}>Notas (opcional)</span>
            <textarea name="notes" rows={2} className={`${inputClass} resize-none mt-1`} />
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4">
          <button
            type="submit"
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
          >
            Registrar
          </button>
        </div>
      </form>
    </div>
  );
}
