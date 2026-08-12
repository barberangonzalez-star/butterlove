"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { saveSaleAction } from "./actions";
import CustomerPicker from "./CustomerPicker";
import {
  PAYMENT_METHODS,
  DELIVERY_METHODS,
  DELIVERY_PROVIDERS,
  NATIONAL_COURIERS,
  VENEZUELA_STATES,
} from "@/lib/config";
import type { CustomerChoice } from "@/lib/customers";
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

/**
 * Una línea del formulario. `key` sólo existe para React: al borrar una línea
 * del medio, el índice del array cambiaría y se arrastraría el estado de la
 * línea siguiente.
 */
interface Line {
  key: number;
  productId: number;
  /** El nombre con el que se guardó, por si el producto ya no está en el catálogo. */
  productName: string;
  grams: number;
  quantity: number;
  /** El combo con el que se cobra esta línea, si se eligió una promo. */
  promotionId: number | null;
}

let nextKey = 0;
const newKey = () => ++nextKey;

/**
 * Una promo sólo se puede ofrecer como línea si sabe qué vende: producto,
 * tamaño y precio del combo. Las que quedaron a medio definir siguen
 * existiendo pero no aparecen en el selector.
 */
function isBundle(promo: Promotion) {
  return (
    promo.productId !== null &&
    promo.grams !== null &&
    promo.bundlePrice !== null &&
    promo.bundleQuantity > 0
  );
}

export default function SaleForm({
  sale,
  products,
  promotions,
  customers,
  onClose,
}: {
  sale: Sale | null;
  products: AdminProduct[];
  promotions: Promotion[];
  customers: CustomerChoice[];
  onClose: () => void;
}) {
  const [lines, setLines] = useState<Line[]>(() => {
    if (sale && sale.items.length > 0) {
      return sale.items.map((item) => ({
        key: newKey(),
        productId: item.productId ?? 0,
        productName: item.productName,
        grams: item.grams,
        quantity: item.quantity,
        promotionId: item.promotionId,
      }));
    }
    const first = products[0];
    return [
      {
        key: newKey(),
        productId: first?.id ?? 0,
        productName: first?.name ?? "",
        grams: first?.sizes[0]?.grams ?? 0,
        quantity: 1,
        promotionId: null,
      },
    ];
  });

  // An existing sale starts on its stored amount, so edits never silently
  // recalculate a total that was adjusted by hand.
  const [amountOverride, setAmountOverride] = useState<string | null>(
    sale ? String(Number(sale.amountUsd)) : null,
  );
  const [deliveryMethod, setDeliveryMethod] = useState(
    sale?.deliveryMethod ?? "Pickup",
  );
  // El proveedor se guarda en una sola columna, pero cada modo tiene su propia
  // lista, así que alternar entre ellos no pisa lo ya elegido en el otro.
  const [deliveryProvider, setDeliveryProvider] = useState(
    sale?.deliveryMethod === "Delivery"
      ? sale.deliveryProvider ?? DELIVERY_PROVIDERS[0]
      : DELIVERY_PROVIDERS[0],
  );
  const [nationalCourier, setNationalCourier] = useState(
    sale?.deliveryMethod === "Envío nacional"
      ? sale.deliveryProvider ?? NATIONAL_COURIERS[0]
      : NATIONAL_COURIERS[0],
  );
  const [deliveryState, setDeliveryState] = useState(sale?.deliveryState ?? "");
  const [deliveryFee, setDeliveryFee] = useState(
    sale?.deliveryFeeUsd ? String(Number(sale.deliveryFeeUsd)) : "0",
  );

  /**
   * Elegir a un cliente propone su estado, pero sólo si la venta todavía no
   * tiene uno: el destino de *este* pedido puede no ser donde vive.
   */
  function handlePickCustomer(customer: CustomerChoice | null) {
    if (customer?.state && !deliveryState) setDeliveryState(customer.state);
  }

  /** Lo que esta venta ya tenía tomado de un producto y tamaño, antes de editarla. */
  function stockHeldBySale(productId: number, grams: number) {
    if (!sale) return 0;
    return sale.items
      .filter((item) => item.productId === productId && item.grams === grams)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  function promoOf(line: Line) {
    if (!line.promotionId) return undefined;
    return promotions.find((p) => p.id === line.promotionId);
  }

  function unitPriceOf(line: Line) {
    // El combo manda: su precio es del paquete, así que se reparte entre los
    // envases que incluye para que la cantidad siga multiplicando bien.
    const promo = promoOf(line);
    if (promo?.bundlePrice && promo.bundleQuantity > 0) {
      return Number(promo.bundlePrice) / promo.bundleQuantity;
    }
    const product = products.find((p) => p.id === line.productId);
    const size = product?.sizes.find((s) => s.grams === line.grams);
    if (size) return size.price;
    // The size may have been removed from the catalog since the sale was made.
    const stored = sale?.items.find(
      (item) => item.productId === line.productId && item.grams === line.grams,
    );
    return stored ? Number(stored.unitPriceUsd) : 0;
  }

  /**
   * Frascos que quedarían para esta línea. Se descuenta lo que ya reservaron
   * las otras líneas del formulario, así que cargar el mismo producto dos
   * veces no muestra el stock completo en ambas.
   */
  function availableFor(line: Line) {
    const product = products.find((p) => p.id === line.productId);
    const size = product?.sizes.find((s) => s.grams === line.grams);
    if (!size) return null;

    const takenByOtherLines = lines
      .filter(
        (other) =>
          other.key !== line.key &&
          other.productId === line.productId &&
          other.grams === line.grams,
      )
      .reduce((sum, other) => sum + other.quantity, 0);

    return (
      size.stockQuantity +
      stockHeldBySale(line.productId, line.grams) -
      takenByOtherLines
    );
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
    setAmountOverride(null);
  }

  function addLine() {
    // Se propone el primer producto que todavía no esté en la venta: lo normal
    // al agregar una línea es que sea otro sabor.
    const used = new Set(lines.map((l) => l.productId));
    const product = products.find((p) => !used.has(p.id)) ?? products[0];
    setLines((current) => [
      ...current,
      {
        key: newKey(),
        productId: product?.id ?? 0,
        productName: product?.name ?? "",
        grams: product?.sizes[0]?.grams ?? 0,
        quantity: 1,
        promotionId: null,
      },
    ]);
    setAmountOverride(null);
  }

  /** Elegir en el selector: un producto suelto o un combo ya armado. */
  function pickForLine(line: Line, value: string) {
    const [kind, rawId] = value.split(":");
    const id = Number(rawId);

    if (kind === "promo") {
      const promo = promotions.find((p) => p.id === id);
      if (!promo || !isBundle(promo)) return;
      const product = products.find((p) => p.id === promo.productId);
      updateLine(line.key, {
        productId: promo.productId ?? 0,
        productName: product?.name ?? promo.title,
        grams: promo.grams ?? 0,
        quantity: promo.bundleQuantity,
        promotionId: promo.id,
      });
      return;
    }

    const next = products.find((p) => p.id === id);
    updateLine(line.key, {
      productId: id,
      productName: next?.name ?? line.productName,
      grams: next?.sizes[0]?.grams ?? 0,
      promotionId: null,
    });
  }

  function removeLine(key: number) {
    setLines((current) => current.filter((line) => line.key !== key));
    setAmountOverride(null);
  }

  // Se ofrecen los combos activos, más los que alguna línea ya trae aunque se
  // hayan desactivado después: si no, editar una venta vieja perdería su promo.
  const usedPromoIds = new Set(lines.map((l) => l.promotionId));
  const bundleOptions = promotions.filter(
    (p) => isBundle(p) && (p.active || usedPromoIds.has(p.id)),
  );
  const isSelfDelivery =
    deliveryMethod === "Delivery" && deliveryProvider === "Nosotros";
  const isNationalShipping = deliveryMethod === "Envío nacional";

  const itemsTotal = lines.reduce(
    (sum, line) => sum + unitPriceOf(line) * line.quantity,
    0,
  );
  const computedAmount =
    itemsTotal + (isSelfDelivery ? Number(deliveryFee) || 0 : 0);
  const amount =
    amountOverride !== null ? Number(amountOverride) : computedAmount;
  const totalJars = lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await saveSaleAction(formData);
          onClose();
        }}
        className="relative w-full max-w-lg h-dvh bg-white border-l border-black/10 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/10 sticky top-0 bg-white z-10">
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

          <div className="flex items-center justify-between">
            <span className={labelClass}>Productos</span>
            <span className="text-xs text-[#787774]">
              {totalJars} frasco{totalJars === 1 ? "" : "s"} · $
              {itemsTotal.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => {
              const product = products.find((p) => p.id === line.productId);
              const available = availableFor(line);
              const unitPrice = unitPriceOf(line);
              const promo = promoOf(line);
              const sizeMissing =
                product !== undefined &&
                !product.sizes.some((s) => s.grams === line.grams);
              const regularPrice = product?.sizes.find(
                (s) => s.grams === line.grams,
              )?.price;

              return (
                <div
                  key={line.key}
                  className="rounded-lg border border-black/10 p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={
                        line.promotionId
                          ? `promo:${line.promotionId}`
                          : `p:${line.productId}`
                      }
                      onChange={(e) => pickForLine(line, e.target.value)}
                      className={`${inputClass} flex-1`}
                    >
                      {line.productId === 0 && !line.promotionId && (
                        <option value="p:0">{line.productName}</option>
                      )}
                      <optgroup label="Productos">
                        {products.map((p) => (
                          <option key={p.id} value={`p:${p.id}`}>
                            {p.name}
                          </option>
                        ))}
                      </optgroup>
                      {bundleOptions.length > 0 && (
                        <optgroup label="Promociones">
                          {bundleOptions.map((p) => (
                            <option key={p.id} value={`promo:${p.id}`}>
                              {p.title} — ${Number(p.bundlePrice).toFixed(2)}
                              {p.active ? "" : " (inactiva)"}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1}
                      title="Quitar producto"
                      aria-label={`Quitar ${line.productName || "producto"}`}
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-md text-[#787774] hover:bg-black/5 hover:text-red-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#787774]"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <input type="hidden" name="itemProductId" value={line.productId} />
                  <input
                    type="hidden"
                    name="itemProductName"
                    value={product?.name ?? line.productName}
                  />
                  <input type="hidden" name="itemUnitPrice" value={unitPrice} />
                  <input
                    type="hidden"
                    name="itemPromotionId"
                    value={line.promotionId ?? ""}
                  />

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {/* Con un combo el tamaño lo fija la promo. El select queda
                        sólo de lectura y el valor viaja por un hidden, porque
                        un select deshabilitado no se envía. */}
                    {promo ? (
                      <>
                        <input type="hidden" name="itemGrams" value={line.grams} />
                        <select
                          value={line.grams}
                          disabled
                          className={`${inputClass} bg-black/[0.03] text-[#787774]`}
                        >
                          <option value={line.grams}>
                            {line.grams}g — fijado por la promo
                          </option>
                        </select>
                      </>
                    ) : (
                      <select
                        name="itemGrams"
                        value={line.grams}
                        onChange={(e) =>
                          updateLine(line.key, { grams: Number(e.target.value) })
                        }
                        className={inputClass}
                      >
                        {sizeMissing && (
                          <option value={line.grams}>
                            {line.grams}g — ya no disponible
                          </option>
                        )}
                        {product?.sizes.map((s) => (
                          <option key={s.grams} value={s.grams}>
                            {s.grams}g — ${s.price}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#787774]">×</span>
                      <input
                        type="number"
                        name="itemQuantity"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className={`${inputClass} w-20`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {available !== null ? (
                      <span
                        className={
                          available < line.quantity
                            ? "text-red-600"
                            : available <= 5
                              ? "text-amber-700"
                              : "text-[#787774]"
                        }
                      >
                        Stock: {available} frasco{available === 1 ? "" : "s"}
                        {available < line.quantity ? " — no alcanza" : ""}
                      </span>
                    ) : (
                      <span className="text-[#787774]">Sin stock registrado</span>
                    )}
                    <span className="text-[#5f5e5b] font-medium">
                      ${(unitPrice * line.quantity).toFixed(2)}
                    </span>
                  </div>

                  {promo && regularPrice !== undefined && (
                    <p className="text-xs text-green-700">
                      Promo aplicada — sueltos costarían $
                      {(regularPrice * line.quantity).toFixed(2)}
                    </p>
                  )}

                  <span className="sr-only">Línea {index + 1}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addLine}
            className="w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-black/20 py-2 text-sm font-medium text-[#5f5e5b] hover:bg-black/[0.03]"
          >
            <Plus size={15} /> Agregar producto
          </button>

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
            <span className={labelClass}>Cliente (opcional)</span>
          </div>

          <CustomerPicker
            customers={customers}
            initialCustomerId={sale?.customerId ?? null}
            initialName={sale?.customerName ?? ""}
            initialEmail={sale?.customerEmail ?? ""}
            initialPhone={sale?.customerPhone ?? ""}
            onPick={handlePickCustomer}
          />

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
              {isSelfDelivery ? " (incluye delivery)" : ""} — ajústalo si
              aplicaste un descuento de promo
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
