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
    product?.sizes.length ? product.sizes : [{ grams: 230, price: 0, costUsd: 0 }]
  );
  // Las fotos sólo hacen falta si el producto se va a mostrar en la vitrina;
  // uno de sólo encargo vive nada más en el panel y no tiene por qué tenerlas.
  const [inStore, setInStore] = useState(product?.inStore ?? true);

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

          <Field label="Tipo">
            <select
              name="kind"
              defaultValue={product?.kind ?? "single"}
              className={inputClass}
            >
              <option value="single">Sabor suelto</option>
              <option value="combo">Combo / dúo</option>
            </select>
            <span className="mt-1 block text-xs text-[#787774]">
              Los sabores sueltos se muestran como &quot;Mantequilla de
              [nombre]&quot;. Los combos usan el nombre tal cual lo escribas.
            </span>
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

          <label className="flex items-start gap-2.5 rounded-md border border-black/10 p-3">
            <input
              type="checkbox"
              name="inStore"
              checked={inStore}
              onChange={(e) => setInStore(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <span>
              <span className="block text-sm font-medium">
                Mostrar en la tienda
              </span>
              <span className="block text-xs text-[#787774] mt-0.5">
                Si lo desmarcas, el producto no sale en la vitrina ni en el
                sitemap, pero sigue disponible para registrar ventas y llevarle
                inventario.
              </span>
            </span>
          </label>

          <Field label="Imagen (ruta o URL)">
            <input
              name="image"
              defaultValue={product?.image}
              required={inStore}
              className={inputClass}
            />
          </Field>

          <Field label="Imagen hero (ruta o URL)">
            <input
              name="heroImage"
              defaultValue={product?.heroImage}
              required={inStore}
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
                <div
                  key={i}
                  className="rounded-md border border-black/10 p-2.5 pb-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="grid grid-cols-3 gap-2 flex-1 min-w-0">
                      <SizeField label="Gramos">
                        <input
                          type="number"
                          name="grams"
                          defaultValue={size.grams}
                          className={inputClass}
                        />
                      </SizeField>
                      <SizeField label="Precio $">
                        <input
                          type="number"
                          step="0.01"
                          name="price"
                          defaultValue={size.price}
                          className={inputClass}
                        />
                      </SizeField>
                      <SizeField label="Costo $">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="costUsd"
                          defaultValue={size.costUsd || ""}
                          placeholder="0.00"
                          className={inputClass}
                        />
                      </SizeField>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSizes((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      aria-label="Quitar talla"
                      className="mt-5 w-8 h-8 shrink-0 flex items-center justify-center rounded-md hover:bg-black/5 text-[#787774]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSizes((prev) => [
                    ...prev,
                    { grams: 0, price: 0, costUsd: 0 },
                  ])
                }
                className="flex items-center gap-1.5 text-xs font-medium text-[#787774] hover:text-[#37352f] mt-1"
              >
                <Plus size={14} /> Agregar talla
              </button>
            </div>
            <p className="text-xs text-[#787774] mt-2">
              El costo es lo que te cuesta hacer ese frasco: envase, etiqueta,
              materia prima y mano de obra. Con eso ya se calcula la ganancia.
              Si prefieres desglosarlo insumo por insumo —y que suba solo cuando
              suba el maní— usa el botón de receta en la lista de productos.
            </p>
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

/** Etiqueta chiquita para las tres columnas de una talla. */
function SizeField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="block text-[11px] text-[#787774] mb-0.5">{label}</span>
      {children}
    </label>
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
