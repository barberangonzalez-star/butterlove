"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import {
  savePromotionAction,
  deletePromotionAction,
  togglePromotionAction,
} from "./actions";
import type { Promotion } from "@/lib/promotions-data";
import type { AdminProduct } from "@/lib/products-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass =
  "text-xs font-medium text-[#787774] uppercase tracking-wide";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function PromotionForm({
  promotion,
  products,
  onClose,
}: {
  promotion: Promotion | null;
  products: AdminProduct[];
  onClose: () => void;
}) {
  const [productId, setProductId] = useState(promotion?.productId ?? 0);
  const [grams, setGrams] = useState(promotion?.grams ?? 0);
  const [bundleQuantity, setBundleQuantity] = useState(
    promotion?.bundleQuantity ?? 1,
  );
  const [bundlePrice, setBundlePrice] = useState(
    promotion?.bundlePrice ? String(Number(promotion.bundlePrice)) : "",
  );

  const product = products.find((p) => p.id === productId);
  const size = product?.sizes.find((s) => s.grams === grams);
  // Con qué comparar el precio del combo, para ver el descuento de un vistazo.
  const regularPrice = size ? size.price * bundleQuantity : null;
  const promoPrice = Number(bundlePrice);
  const savings =
    regularPrice !== null && bundlePrice !== "" && promoPrice > 0
      ? regularPrice - promoPrice
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await savePromotionAction(formData);
          onClose();
        }}
        className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto bg-white border border-black/10 rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm">
            {promotion ? "Editar promoción" : "Nueva promoción"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={14} />
          </button>
        </div>

        {promotion && <input type="hidden" name="id" value={promotion.id} />}

        <label className="block mb-3">
          <span className={labelClass}>Título</span>
          <input
            name="title"
            defaultValue={promotion?.title}
            required
            className={`${inputClass} mt-1`}
          />
        </label>

        <label className="block mb-3">
          <span className={labelClass}>Descripción</span>
          <textarea
            name="description"
            defaultValue={promotion?.description}
            required
            rows={3}
            className={`${inputClass} resize-none mt-1`}
          />
        </label>

        <div className="rounded-lg border border-black/10 p-3 mb-4 space-y-3">
          <p className="text-xs text-[#787774]">
            Define qué vende el combo para que aparezca como opción en Ventas,
            con su precio ya hecho. Sin producto queda como promo suelta, sólo
            de etiqueta.
          </p>

          <label className="block">
            <span className={labelClass}>Producto</span>
            <select
              name="productId"
              value={productId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setProductId(id);
                const next = products.find((p) => p.id === id);
                setGrams(next?.sizes[0]?.grams ?? 0);
              }}
              className={`${inputClass} mt-1`}
            >
              <option value={0}>Ninguno (promo suelta)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {productId > 0 && (
            <>
              <label className="block">
                <span className={labelClass}>Tamaño</span>
                <select
                  name="grams"
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value))}
                  className={`${inputClass} mt-1`}
                >
                  {product?.sizes.map((s) => (
                    <option key={s.grams} value={s.grams}>
                      {s.grams}g — {fmtUsd(s.price)} c/u
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={labelClass}>Envases</span>
                  <input
                    type="number"
                    name="bundleQuantity"
                    min={1}
                    value={bundleQuantity}
                    onChange={(e) =>
                      setBundleQuantity(Number(e.target.value) || 1)
                    }
                    required
                    className={`${inputClass} mt-1`}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Precio combo ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    name="bundlePrice"
                    value={bundlePrice}
                    onChange={(e) => setBundlePrice(e.target.value)}
                    className={`${inputClass} mt-1`}
                  />
                </label>
              </div>

              {regularPrice !== null && (
                <p className="text-xs text-[#787774]">
                  {bundleQuantity} × {grams}g sueltos costarían{" "}
                  {fmtUsd(regularPrice)}
                  {savings !== null && savings > 0 && (
                    <span className="text-green-700 font-medium">
                      {" "}
                      · ahorro de {fmtUsd(savings)}
                    </span>
                  )}
                  {savings !== null && savings < 0 && (
                    <span className="text-red-600 font-medium">
                      {" "}
                      · el combo sale {fmtUsd(-savings)} más caro
                    </span>
                  )}
                </p>
              )}
            </>
          )}

          {productId === 0 && (
            <input type="hidden" name="bundleQuantity" value={bundleQuantity} />
          )}
        </div>

        <label className="flex items-center gap-2 mb-4 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={promotion?.active ?? true}
          />
          Activa
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}

export default function PromocionesAdminClient({
  promotions,
  products,
}: {
  promotions: Promotion[];
  products: AdminProduct[];
}) {
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);

  async function handleDelete(promo: Promotion) {
    if (!confirm(`¿Eliminar "${promo.title}"?`)) return;
    await deletePromotionAction(promo.id);
  }

  return (
    <div>
      <button
        onClick={() => setEditing("new")}
        className="mb-4 flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
      >
        <Plus size={15} /> Nueva promoción
      </button>

      <div className="border border-black/10 rounded-lg overflow-hidden bg-white divide-y divide-black/5">
        {promotions.map((p) => (
          <div key={p.id} className="flex items-start gap-3 px-4 py-3">
            <label className="flex items-center pt-0.5">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => togglePromotionAction(p.id, e.target.checked)}
              />
            </label>
            <div className="flex-1">
              <p className={`font-medium text-sm flex items-center gap-2 ${!p.active ? "text-[#a8a29e] line-through" : ""}`}>
                {p.title}
                {p.bundleQuantity > 1 && (
                  <span className="text-[11px] font-normal bg-black/5 text-[#5f5e5b] px-1.5 py-0.5 rounded-full">
                    ×{p.bundleQuantity}
                  </span>
                )}
              </p>
              <p className="text-sm text-[#787774]">{p.description}</p>
              {p.bundlePrice !== null && (
                <p className="text-xs text-[#787774] mt-0.5">
                  {p.bundleQuantity} × {p.grams}g por{" "}
                  {fmtUsd(Number(p.bundlePrice))}
                </p>
              )}
              {p.bundlePrice === null && p.active && (
                <p className="text-xs text-amber-700 mt-0.5">
                  Sin producto ni precio: no aparece en el selector de Ventas
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditing(p)}
                className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {promotions.length === 0 && (
          <p className="px-4 py-10 text-center text-[#787774] text-sm">
            No hay promociones todavía.
          </p>
        )}
      </div>

      {editing && (
        <PromotionForm
          promotion={editing === "new" ? null : editing}
          products={products}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
