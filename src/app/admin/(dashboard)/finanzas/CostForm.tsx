"use client";

import { useState } from "react";
import { X, Plus, Trash2, TriangleAlert } from "lucide-react";
import { saveCostItemsAction } from "./actions";
import { marginPercent } from "@/lib/costs";
import type { SizeCost } from "@/lib/costs-data";
import type { AdminProduct } from "@/lib/products-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";

/** Lo que suele llevar un frasco, para no escribirlo entero cada vez. */
const COMMON_NAMES = [
  "Frasco",
  "Tapa",
  "Etiqueta",
  "Precinto",
  "Materia prima",
  "Mano de obra",
  "Gas",
  "Empaque",
];

interface Line {
  key: number;
  name: string;
  /** Texto y no número: escribir "0.25" pasa por estados intermedios inválidos. */
  amount: string;
}

interface SizeState {
  sizeId: number;
  grams: number;
  price: number;
  /** El costo escrito de un tirón en la tabla. Acá sólo se muestra. */
  extra: number;
  lines: Line[];
}

let nextKey = 0;
const newKey = () => ++nextKey;

/**
 * El desglose del costo de un frasco, línea por línea. A propósito no sabe de
 * insumos ni de unidades: cada línea es un nombre y un monto ya calculado por
 * frasco, que es como se piensa el costo al hacer el presupuesto.
 */
export default function CostForm({
  product,
  costs,
  onClose,
}: {
  product: AdminProduct;
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
        extra: cost?.extra ?? 0,
        lines:
          cost?.lines.map((line) => ({
            key: newKey(),
            name: line.name,
            amount: String(line.amount),
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
    patchSize(size.sizeId, {
      lines: [...size.lines, { key: newKey(), name: "", amount: "" }],
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

  /**
   * Copia el desglose de un tamaño a los demás. Los tamaños de un mismo sabor
   * llevan casi lo mismo y cambian sólo en la materia prima, así que copiar y
   * corregir un número es más rápido que escribirlo todo de nuevo.
   */
  function copyToOthers(source: SizeState) {
    setSizes((current) =>
      current.map((s) =>
        s.sizeId === source.sizeId
          ? s
          : {
              ...s,
              lines: source.lines.map((line) => ({ ...line, key: newKey() })),
            },
      ),
    );
  }

  /** El costo mientras se escribe, con la misma cuenta que hace el servidor. */
  function totalOf(size: SizeState) {
    const breakdown = size.lines.reduce(
      (sum, line) => sum + (Number(line.amount) || 0),
      0,
    );
    return breakdown + size.extra;
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveCostItemsAction(
        sizes.map((size) => ({
          sizeId: size.sizeId,
          lines: size.lines.map((line) => ({
            name: line.name,
            amount: Number(line.amount) || 0,
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
              Desglose del costo · {product.name}
            </h2>
            <p className="text-xs text-[#787774]">
              Cuánto le pone cada cosa a un frasco
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

        <datalist id="costos-comunes">
          {COMMON_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <div className="p-6 space-y-6">
          <p className="rounded-md border border-black/10 bg-black/[0.02] px-3 py-2 text-xs text-[#5f5e5b]">
            Escribe lo que te cuesta cada parte de UN frasco: el frasco, la tapa,
            la etiqueta, el maní que lleva. No hace falta que esté todo — lo que
            cargues ya se suma.
          </p>

          {sizes.map((size) => {
            const total = totalOf(size);
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
                  {size.lines.map((line) => (
                    <div key={line.key} className="flex items-center gap-2">
                      <input
                        type="text"
                        list="costos-comunes"
                        value={line.name}
                        onChange={(e) =>
                          updateLine(size, line.key, { name: e.target.value })
                        }
                        placeholder="Frasco, etiqueta, maní…"
                        aria-label="Qué es"
                        className={`${inputClass} flex-1 min-w-0`}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={line.amount}
                        onChange={(e) =>
                          updateLine(size, line.key, { amount: e.target.value })
                        }
                        placeholder="0.00"
                        aria-label="Cuánto cuesta por frasco"
                        className={`${inputClass} w-24 shrink-0 text-right tabular-nums`}
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(size, line.key)}
                        aria-label="Quitar línea"
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[#787774] hover:bg-black/5 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => addLine(size)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-black/20 py-2 text-sm font-medium text-[#5f5e5b] hover:bg-black/[0.03]"
                  >
                    <Plus size={15} /> Agregar línea
                  </button>
                  {sizes.length > 1 && size.lines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => copyToOthers(size)}
                      title="Copiar este desglose a los otros tamaños"
                      className="shrink-0 rounded-md border border-black/15 px-3 text-sm font-medium text-[#5f5e5b] hover:bg-black/[0.03]"
                    >
                      Copiar a los demás
                    </button>
                  )}
                </div>

                {size.extra > 0 && (
                  <p className="mt-3 text-xs text-[#787774]">
                    Más ${size.extra.toFixed(2)} que escribiste en la columna
                    &quot;Costo&quot; de la tabla. Si ya está en el desglose,
                    bórralo de ahí para no contarlo dos veces.
                  </p>
                )}

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

                {total <= 0 && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
                    <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                    <span>
                      Sin costo: las ventas de este tamaño no van a saber cuánto
                      dejaron.
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
            {saving ? "Guardando…" : "Guardar desglose"}
          </button>
        </div>
      </div>
    </div>
  );
}
