"use client";

import { useState } from "react";
import { X, Plus, Trash2, TriangleAlert } from "lucide-react";
import { saveRecipesAction } from "./actions";
import { fmtUnitCost, marginPercent, supplyUnitCost } from "@/lib/costs";
import type { SizeCost } from "@/lib/costs-data";
import type { SupplyItem } from "@/lib/inventory-data";
import type { AdminProduct } from "@/lib/products-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";
const labelClass = "text-xs font-medium text-[#787774] uppercase tracking-wide";

interface Line {
  key: number;
  supplyItemId: number;
  /** Texto y no número: escribir "0.5" pasa por un estado intermedio inválido. */
  quantity: string;
}

interface SizeState {
  sizeId: number;
  grams: number;
  price: number;
  lines: Line[];
  extra: string;
}

let nextKey = 0;
const newKey = () => ++nextKey;

export default function RecipeForm({
  product,
  supplies,
  costs,
  onClose,
}: {
  product: AdminProduct;
  supplies: SupplyItem[];
  costs: SizeCost[];
  onClose: () => void;
}) {
  const [sizes, setSizes] = useState<SizeState[]>(() =>
    product.sizes.map((size) => {
      const cost = costs.find((c) => c.productSizeId === size.id);
      return {
        sizeId: size.id,
        grams: size.grams,
        price: size.price,
        extra: String(cost?.extra ?? 0),
        lines:
          cost?.lines.map((line) => ({
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

  /** El costo mientras se escribe, con la misma cuenta que hace el servidor. */
  function costOf(size: SizeState) {
    let materials = 0;
    const missing: string[] = [];
    for (const line of size.lines) {
      const supply = supplies.find((s) => s.id === line.supplyItemId);
      if (!supply) continue;
      const unitCost = supplyUnitCost(supply);
      if (unitCost === null) missing.push(supply.name);
      else materials += unitCost * (Number(line.quantity) || 0);
    }
    const extra = Number(size.extra) || 0;
    return { total: materials + extra, missing, hasLines: size.lines.length > 0 };
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveRecipesAction(
        sizes.map((size) => ({
          sizeId: size.sizeId,
          extraCostUsd: Number(size.extra) || 0,
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
              Receta y costo · {product.name}
            </h2>
            <p className="text-xs text-[#787774]">
              Desglosa el costo insumo por insumo
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
                tapas, etiquetas, maní crudo…) con su precio de compra y vuelve
                aquí. Si no quieres desglosarlo, escribe el costo del frasco en
                &quot;Otros costos&quot; y con eso basta.
              </>
            ) : (
              <>
                Desglosar la receta no es obligatorio: el costo puede ser un solo
                número. La ventaja es que cuando suba el maní, suben solos todos
                los productos que lo llevan.
              </>
            )}
          </p>

          {sizes.map((size) => {
            const { total, missing, hasLines } = costOf(size);
            const margin = size.price - total;
            const percent = marginPercent(size.price, total);

            return (
              <div
                key={size.sizeId}
                className="rounded-lg border border-black/10 p-4"
              >
                <div className="flex items-baseline justify-between gap-2 mb-3">
                  <h3 className="font-medium text-sm">{size.grams}g</h3>
                  <span className="text-xs text-[#787774]">
                    Se vende en ${size.price.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  {size.lines.map((line) => {
                    const supply = supplies.find(
                      (s) => s.id === line.supplyItemId,
                    );
                    const unitCost = supply ? supplyUnitCost(supply) : null;
                    const lineCost =
                      unitCost === null
                        ? null
                        : unitCost * (Number(line.quantity) || 0);

                    return (
                      <div key={line.key} className="flex items-center gap-2">
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
                          className={`${inputClass} w-20 shrink-0 text-right`}
                        />
                        <span className="w-16 shrink-0 text-xs text-[#787774] truncate">
                          {supply?.unit ?? ""}
                        </span>
                        <span className="w-16 shrink-0 text-xs text-right tabular-nums text-[#5f5e5b]">
                          {lineCost === null ? "—" : fmtUnitCost(lineCost)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLine(size, line.key)}
                          aria-label="Quitar insumo"
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[#787774] hover:bg-black/5 hover:text-red-700"
                        >
                          <Trash2 size={14} />
                        </button>
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

                <label className="block mt-3">
                  <span className={labelClass}>Otros costos ($)</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={size.extra}
                    onChange={(e) =>
                      patchSize(size.sizeId, { extra: e.target.value })
                    }
                    className={`${inputClass} mt-1`}
                  />
                  <span className="text-xs text-[#787774]">
                    Mano de obra, gas, lo que no está en la lista de insumos. Es
                    el mismo número de la columna &quot;Costo&quot; de la tabla:
                    se suma a los insumos de arriba.
                  </span>
                </label>

                <div className="mt-3 pt-3 border-t border-black/5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm">
                    Cuesta{" "}
                    <strong className="tabular-nums">${total.toFixed(2)}</strong>
                  </span>
                  <span
                    className={`text-sm tabular-nums ${
                      margin < 0 ? "text-red-700" : "text-[#5f5e5b]"
                    }`}
                  >
                    Deja ${margin.toFixed(2)}
                    {percent !== null ? ` · ${percent.toFixed(0)}%` : ""}
                  </span>
                </div>

                {/* Faltar la receta ya no es un problema si hay un costo
                    escrito a mano: lo que rompe el número es un insumo sin
                    precio, o no tener nada de nada. */}
                {(missing.length > 0 || (!hasLines && total <= 0)) && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
                    <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                    <span>
                      {missing.length > 0
                        ? `Sin precio de compra: ${[...new Set(missing)].join(", ")}. El costo sale más bajo que el real.`
                        : "Sin costo: agrega insumos o escribe cuánto te cuesta el frasco."}
                    </span>
                  </p>
                )}
              </div>
            );
          })}

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
