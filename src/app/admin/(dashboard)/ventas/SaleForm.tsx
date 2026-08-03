"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { saveSaleAction } from "./actions";
import {
  PAYMENT_METHODS,
  DELIVERY_METHODS,
  DELIVERY_PROVIDERS,
  NATIONAL_COURIERS,
  VENEZUELA_STATES,
} from "@/lib/config";
import type { AdminProduct } from "@/lib/products-data";
import type { Promotion } from "@/lib/promotions-data";
import type { Sale } from "@/lib/sales-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass =
  "text-xs font-medium text-[#787774] uppercase tracking-wide";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function SaleForm({
  sale,
  products,
  promotions,
  onClose,
}: {
  sale: Sale | null;
  products: AdminProduct[];
  promotions: Promotion[];
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(
    sale ? (sale.productId ?? 0) : products[0]?.id ?? 0
  );
  const [grams, setGrams] = useState(
    sale?.grams ?? products[0]?.sizes[0]?.grams ?? 0
  );
  const [quantity, setQuantity] = useState(sale?.quantity ?? 1);
  const [promotionId, setPromotionId] = useState(
    sale?.promotionId ? String(sale.promotionId) : ""
  );
  // An existing sale starts on its stored amount, so edits never silently
  // recalculate a total that was adjusted by hand.
  const [amountOverride, setAmountOverride] = useState<string | null>(
    sale ? String(Number(sale.amountUsd)) : null
  );
  const [deliveryMethod, setDeliveryMethod] = useState(
    sale?.deliveryMethod ?? "Pickup"
  );
  // El proveedor se guarda en una sola columna, pero cada modo tiene su propia
  // lista, así que alternar entre ellos no pisa lo ya elegido en el otro.
  const [deliveryProvider, setDeliveryProvider] = useState(
    sale?.deliveryMethod === "Delivery"
      ? sale.deliveryProvider ?? DELIVERY_PROVIDERS[0]
      : DELIVERY_PROVIDERS[0]
  );
  const [nationalCourier, setNationalCourier] = useState(
    sale?.deliveryMethod === "Envío nacional"
      ? sale.deliveryProvider ?? NATIONAL_COURIERS[0]
      : NATIONAL_COURIERS[0]
  );
  const [deliveryState, setDeliveryState] = useState(sale?.deliveryState ?? "");
  const [deliveryFee, setDeliveryFee] = useState(
    sale?.deliveryFeeUsd ? String(Number(sale.deliveryFeeUsd)) : "0"
  );

  const selectedProduct = products.find((p) => p.id === productId);
  const selectedSize = selectedProduct?.sizes.find((s) => s.grams === grams);
  // The size may have been removed from the catalog since the sale was made.
  const unitPrice =
    selectedSize?.price ??
    (sale && sale.productId === productId && sale.grams === grams
      ? Number(sale.unitPriceUsd)
      : 0);
  // While editing, the units this sale already holds are returned to stock before
  // the new quantity is taken, so count them as available.
  const availableStock =
    selectedSize === undefined
      ? null
      : selectedSize.stockQuantity +
        (sale && sale.productId === productId && sale.grams === grams
          ? sale.quantity
          : 0);
  // Keep the promo attached to this sale selectable even if it is no longer active.
  const promotionOptions = promotions.filter(
    (p) => p.active || p.id === sale?.promotionId
  );
  const isSelfDelivery = deliveryMethod === "Delivery" && deliveryProvider === "Nosotros";
  const isNationalShipping = deliveryMethod === "Envío nacional";
  const computedAmount =
    unitPrice * quantity + (isSelfDelivery ? Number(deliveryFee) || 0 : 0);
  const amount = amountOverride !== null ? Number(amountOverride) : computedAmount;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await saveSaleAction(formData);
          onClose();
        }}
        className="relative w-full max-w-md h-full bg-white border-l border-black/10 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/10 sticky top-0 bg-white">
          <h2 className="font-semibold text-sm">
            {sale ? "Editar venta" : "Registrar venta"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {sale && <input type="hidden" name="id" value={sale.id} />}

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
              {sale && !sale.productId && (
                <option value={0}>{sale.productName}</option>
              )}
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
              {sale && !selectedSize && sale.grams === grams && (
                <option value={grams}>{grams}g — ya no disponible</option>
              )}
              {selectedProduct?.sizes.map((s) => (
                <option key={s.grams} value={s.grams}>
                  {s.grams}g — ${s.price}
                </option>
              ))}
            </select>
            {availableStock !== null && (
              <p
                className={`text-xs mt-1 ${
                  availableStock <= 5 ? "text-red-600" : "text-[#787774]"
                }`}
              >
                Stock disponible: {availableStock} frasco
                {availableStock === 1 ? "" : "s"}
              </p>
            )}
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
              {promotionOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.active ? "" : " (inactiva)"}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>Fecha</span>
            <input
              type="date"
              name="saleDate"
              defaultValue={sale?.saleDate ?? todayIso()}
              required
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Método de pago</span>
            <select
              name="paymentMethod"
              defaultValue={sale?.paymentMethod ?? PAYMENT_METHODS[0]}
              className={`${inputClass} mt-1`}
            >
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
              {DELIVERY_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
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
                {DELIVERY_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isNationalShipping && (
            <>
              <label className="block">
                <span className={labelClass}>Empresa de envío</span>
                <select
                  name="deliveryProvider"
                  value={nationalCourier}
                  onChange={(e) => setNationalCourier(e.target.value)}
                  className={`${inputClass} mt-1`}
                >
                  {NATIONAL_COURIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>Estado destino</span>
                <select
                  name="deliveryState"
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                  required
                  className={`${inputClass} mt-1`}
                >
                  <option value="">Selecciona un estado</option>
                  {VENEZUELA_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </>
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
            <input
              name="customerName"
              defaultValue={sale?.customerName ?? ""}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Correo</span>
            <input
              type="email"
              name="customerEmail"
              defaultValue={sale?.customerEmail ?? ""}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="block">
            <span className={labelClass}>Teléfono</span>
            <input
              type="tel"
              name="customerPhone"
              defaultValue={sale?.customerPhone ?? ""}
              className={`${inputClass} mt-1`}
            />
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
            <textarea
              name="notes"
              rows={2}
              defaultValue={sale?.notes ?? ""}
              className={`${inputClass} resize-none mt-1`}
            />
          </label>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4">
          <button
            type="submit"
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
          >
            {sale ? "Guardar cambios" : "Registrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
