"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { saveRecipesAction } from "./actions";
import type { SizeRecipe } from "@/lib/costs-data";
import type { SupplyItem } from "@/lib/inventory-data";
import type { AdminProduct } from "@/lib/products-data";

// Sin ancho fijo a propósito: cada campo pone el suyo (flex-1, w-24…). Un
// `w-full` acá adentro compite con esos anchos por la misma propiedad CSS y,
// como cae después en la hoja de Tailwind, gana siempre — el campo de ancho
// fijo se estira al 100% y aplasta al de al lado.
const inputClass =
  "rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";

interface Line {
  key: number;
  supplyItemId: number;
  /** Texto y no número: escribir "0.5" pasa por un estado intermedio inválido. */
  quantity: string;
}

interface SizeState {
  sizeId: number;
  grams: number;
  lines: Line[];
}

let nextKey = 0;
const newKey = () => ++nextKey;

/**
 * Qué insumos consume un frasco. Sirve para una sola cosa: descontar el
 * inventario cuando se registra una venta. El costo se escribe aparte, en el
 * desglose, porque llenar esto con unidades y rendimientos era demasiado
 * trabajo para saber cuánto deja un frasco.
 */
export default function RecipeForm({
  product,
  supplies,
  recipes,
  onClose,
}: {
  product: AdminProduct;
  supplies: SupplyItem[];
  recipes: SizeRecipe[];
  onClose: () => void;
}) {
  const [sizes, setSizes] = useState<SizeState[]>(() =>
    product.sizes.map((size) => {
      const recipe = recipes.find((r) => r.productSizeId === size.id);
      return {
        sizeId: size.id,
        grams: size.grams,
        lines:
          recipe?.lines.map((line) => ({
            key: newKey(),
            supplyItemId: line.supplyItemId,
            quantity: String(line.quantity),
          })) ?? [],
      };
    }),
  );
  const [saving, setSaving] = useState(false);

  function patchSize(sizeId: number, patch: Partial<SizeState>) {
    setSizes((current) =>
      current.map((s) => (s.sizeId === sizeId ? { ...s, ...patch } : s)),
    );
  }

  function addLine(size: SizeState) {
    // Se propone el primer insumo que la receta no tenga: repetir uno casi
    // siempre es un clic de más, no lo que se quería.
    const used = new Set(size.lines.map((l) => l.supplyItemId));
    const supply = supplies.find((s) => !used.has(s.id)) ?? supplies[0];
    if (!supply) return;
    patchSize(size.sizeId, {
      lines: [
        ...size.lines,
        { key: newKey(), supplyItemId: supply.id, quantity: "1" },
      ],
    });
  }

  function updateLine(size: SizeState, key: number, patch: Partial<Line>) {
    patchSize(size.sizeId, {
      lines: size.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    });
  }

  function removeLine(size: SizeState, key: number) {
    patchSize(size.sizeId, { lines: size.lines.filter((l) => l.key !== key) });
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveRecipesAction(
        sizes.map((size) => ({
          sizeId: size.sizeId,
          lines: size.lines.map((line) => ({
            supplyItemId: line.supplyItemId,
            quantity: Number(line.quantity) || 0,
          })),
        })),
      );
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg h-dvh bg-white border-l border-black/10 overflow-y-auto">
        <div className="flex items-center justify-between px-6 h-16 border-b border-black/10 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">
              Receta · {product.name}
            </h2>
            <p className="text-xs text-[#787774]">
              Qué se descuenta del inventario al vender
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="rounded-md border border-black/10 bg-black/[0.02] px-3 py-2 text-xs text-[#5f5e5b]">
            {supplies.length === 0 ? (
              <>
                Todavía no hay insumos cargados. Créalos en Inventario (frascos,
                tapas, etiquetas, maní crudo…) y vuelve aquí.
              </>
            ) : (
              <>
                Esto no calcula el costo: sólo dice cuánto sacar del inventario
                cuando se vende un frasco. El costo va en el desglose. La merma
                del tostado se mete subiendo la cantidad de materia prima.
              </>
            )}
          </p>

          {sizes.map((size) => (
            <div
              key={size.sizeId}
              className="rounded-lg border border-black/10 p-4"
            >
              <h3 className="font-medium text-sm mb-3">{size.grams}g</h3>

              <div className="divide-y divide-black/5">
                {size.lines.map((line) => {
                  const supply = supplies.find(
                    (s) => s.id === line.supplyItemId,
                  );

                  return (
                    <div key={line.key} className="py-2.5 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={line.supplyItemId}
                          onChange={(e) =>
                            updateLine(size, line.key, {
                              supplyItemId: Number(e.target.value),
                            })
                          }
                          className={`${inputClass} flex-1 min-w-0`}
                        >
                          {supplies.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeLine(size, line.key)}
                          aria-label="Quitar insumo"
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[#787774] hover:bg-black/5 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(size, line.key, {
                              quantity: e.target.value,
                            })
                          }
                          aria-label="Cuánto lleva"
                          className={`${inputClass} w-24 shrink-0 text-right tabular-nums`}
                        />
                        <span className="text-xs text-[#787774]">
                          {supply?.unit ?? ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => addLine(size)}
                disabled={supplies.length === 0}
                className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed border-black/20 py-2 text-sm font-medium text-[#5f5e5b] hover:bg-black/[0.03] disabled:opacity-40"
              >
                <Plus size={15} /> Agregar insumo
              </button>

              {size.lines.length === 0 && (
                <p className="mt-2 text-xs text-[#787774]">
                  Sin receta, vender este tamaño no descuenta nada del
                  inventario.
                </p>
              )}
            </div>
          ))}

          {sizes.length === 0 && (
            <p className="text-sm text-[#787774]">
              Este producto no tiene tamaños cargados.
            </p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar recetas"}
          </button>
        </div>
      </div>
    </div>
  );
}
