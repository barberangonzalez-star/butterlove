"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "./actions";
import { PRODUCT_SWATCHES } from "@/lib/product-swatches";
import type { AdminProduct } from "@/lib/products-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass =
  "text-xs font-medium text-[#787774] uppercase tracking-wide";

export default function ProductForm({
  product,
  onClose,
}: {
  product: AdminProduct | null;
  onClose: () => void;
}) {
  const [sizes, setSizes] = useState(
    product?.sizes.length ? product.sizes : [{ grams: 230, price: 0 }]
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <form
        action={async (formData) => {
          await saveProductAction(formData);
          onClose();
        }}
        className="relative w-full max-w-md h-dvh bg-white border-l border-black/10 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/10 sticky top-0 bg-white">
          <h2 className="font-semibold text-sm">
            {product ? "Editar producto" : "Nuevo producto"}
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
          {product && <input type="hidden" name="id" value={product.id} />}

          <Field label="Nombre">
            <input name="name" defaultValue={product?.name} required className={inputClass} />
          </Field>

          <Field label="Slug (key)">
            <input
              name="key"
              defaultValue={product?.key}
              required
              pattern="[a-z0-9-]+"
              title="Solo minúsculas, números y guiones"
              className={inputClass}
            />
          </Field>

          <Field label="Tagline">
            <input name="tagline" defaultValue={product?.tagline} required className={inputClass} />
          </Field>

          <Field label="Descripción">
            <textarea
              name="description"
              defaultValue={product?.description}
              required
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </Field>

          <Field label="Imagen (ruta o URL)">
            <input name="image" defaultValue={product?.image} required className={inputClass} />
          </Field>

          <Field label="Imagen hero (ruta o URL)">
            <input
              name="heroImage"
              defaultValue={product?.heroImage}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Color">
            <select
              name="bgClass"
              defaultValue={product?.bgClass ?? PRODUCT_SWATCHES[0].bgClass}
              className={inputClass}
            >
              {PRODUCT_SWATCHES.map((s) => (
                <option key={s.bgClass} value={s.bgClass}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Color de acento (hex)">
            <input
              name="accentHex"
              defaultValue={product?.accentHex ?? "#F3B94D"}
              required
              className={inputClass}
            />
          </Field>

          <Field label="Badges (separados por coma)">
            <input
              name="badges"
              defaultValue={product?.badges.join(", ")}
              className={inputClass}
            />
          </Field>

          <Field label="Orden">
            <input
              type="number"
              name="sortOrder"
              defaultValue={product?.sortOrder ?? 0}
              className={inputClass}
            />
          </Field>

          <div>
            <span className={labelClass}>Tallas</span>
            <div className="space-y-2 mt-1">
              {sizes.map((size, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    name="grams"
                    defaultValue={size.grams}
                    placeholder="Gramos"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    defaultValue={size.price}
                    placeholder="Precio $"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setSizes((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md hover:bg-black/5 text-[#787774]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSizes((prev) => [...prev, { grams: 0, price: 0 }])}
                className="flex items-center gap-1.5 text-xs font-medium text-[#787774] hover:text-[#37352f] mt-1"
              >
                <Plus size={14} /> Agregar talla
              </button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4">
          <button
            type="submit"
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
