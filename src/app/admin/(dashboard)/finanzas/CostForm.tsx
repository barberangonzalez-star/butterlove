"use client";

import { useState } from "react";
import { Copy, Plus, TriangleAlert, X } from "lucide-react";
import { saveCostItemsAction } from "./actions";
import { marginPercent } from "@/lib/costs";
import type { SizeCost } from "@/lib/costs-data";
import type { AdminProduct } from "@/lib/products-data";

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none focus:border-[#37352f]";

/**
 * Lo que lleva casi cualquier frasco. Se cargan como líneas vacías al abrir un
 * tamaño que todavía no tiene desglose: llenar cinco montos es mucho más rápido
 * que escribir cinco nombres y cinco montos, y lo que sobre se borra.
 */
const TEMPLATE = ["Frasco", "Tapa", "Etiqueta", "Precinto", "Materia prima"];

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
  lines: Line[];
  /** Lo que no está desglosado: gas, mano de obra, lo que sea. */
  extra: string;
}

let nextKey = 0;
const newKey = () => ++nextKey;

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * El desglose del costo de un frasco, línea por línea. A propósito no sabe de
 * insumos ni de unidades: cada línea es un nombre y un monto ya calculado por
 * frasco, que es como se piensa el costo al hacer el presupuesto.
 *
 * Todo lo que entra en el costo se edita acá, incluido el número suelto que
 * también aparece en la tabla. Tenerlo en dos pantallas hacía que el total no
 * cuadrara con lo que se veía.
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
      const lines = cost?.lines ?? [];
      return {
        sizeId: size.id,
        grams: size.grams,
        price: size.price,
        extra: cost?.extra ? String(cost.extra) : "",
        lines:
          lines.length > 0
            ? lines.map((line) => ({
                key: newKey(),
                name: line.name,
                amount: String(line.amount),
              }))
            : TEMPLATE.map((name) => ({ key: newKey(), name, amount: "" })),
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
   * llevan lo mismo y cambian sólo en cuánta materia prima entra, así que
   * copiar y corregir un número es más rápido que escribirlo todo de nuevo.
   */
  function copyToOthers(source: SizeState) {
    setSizes((current) =>
      current.map((s) =>
        s.sizeId === source.sizeId
          ? s
          : {
              ...s,
              extra: source.extra,
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
    return breakdown + (Number(size.extra) || 0);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveCostItemsAction(
        sizes.map((size) => ({
          sizeId: size.sizeId,
          extraUsd: Number(size.extra) || 0,
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
      <div className="relative w-full max-w-lg h-dvh bg-white border-l border-black/10 flex flex-col">
        <div className="flex items-center justify-between px-5 h-16 border-b border-black/10 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">
              Costo · {product.name}
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
          {[...TEMPLATE, "Mano de obra", "Gas", "Empaque", "Envío"].map(
            (name) => (
              <option key={name} value={name} />
            ),
          )}
        </datalist>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-xs text-[#5f5e5b]">
            Ya están puestas las líneas de siempre: sólo escribe cuánto te cuesta
            cada una para un frasco. Borra las que no van y agrega las que
            falten.
          </p>

          {sizes.map((size) => {
            const total = totalOf(size);
            const margin = size.price - total;
            const percent = marginPercent(size.price, total);

            return (
              <div
                key={size.sizeId}
                className="rounded-lg border border-black/10 overflow-hidden"
              >
                <div className="flex items-baseline justify-between gap-2 px-4 py-2.5 bg-black/[0.02] border-b border-black/10">
                  <h3 className="font-medium text-sm">{size.grams}g</h3>
                  <span className="text-xs text-[#787774]">
                    Se vende en {money(size.price)}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 pb-1.5 text-[11px] text-[#787774] uppercase tracking-wide">
                    <span className="flex-1 min-w-0">Qué</span>
                    <span className="w-24 shrink-0 text-right">$ / frasco</span>
                    <span className="w-8 shrink-0" />
                  </div>

                  <div className="space-y-1.5">
                    {size.lines.map((line, index) => (
                      <div key={line.key} className="flex items-center gap-2">
                        <input
                          type="text"
                          list="costos-comunes"
                          value={line.name}
                          onChange={(e) =>
                            updateLine(size, line.key, { name: e.target.value })
                          }
                          placeholder="Qué es"
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
                            updateLine(size, line.key, {
                              amount: e.target.value,
                            })
                          }
                          // Enter al final de la lista sigue agregando: se
                          // carga todo de corrido, sin buscar el botón.
                          onKeyDown={(e) => {
                            if (e.key !== "Enter") return;
                            e.preventDefault();
                            if (index === size.lines.length - 1) addLine(size);
                          }}
                          placeholder="0.00"
                          aria-label="Cuánto cuesta por frasco"
                          className={`${inputClass} w-24 shrink-0 text-right tabular-nums`}
                        />
                        <button
                          type="button"
                          onClick={() => removeLine(size, line.key)}
                          aria-label={`Quitar ${line.name || "la línea"}`}
                          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-[#a3a29e] hover:bg-black/5 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2">
                      <span className="flex-1 min-w-0 px-3 py-2 text-sm text-[#787774]">
                        Otros (gas, mano de obra…)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={size.extra}
                        onChange={(e) =>
                          patchSize(size.sizeId, { extra: e.target.value })
                        }
                        placeholder="0.00"
                        aria-label="Otros costos por frasco"
                        className={`${inputClass} w-24 shrink-0 text-right tabular-nums`}
                      />
                      <span className="w-8 shrink-0" />
                    </div>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => addLine(size)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-dashed border-black/20 py-2 text-sm font-medium text-[#5f5e5b] hover:bg-black/[0.03]"
                    >
                      <Plus size={15} /> Agregar línea
                    </button>
                    {sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => copyToOthers(size)}
                        title="Copiar este desglose a los otros tamaños"
                        className="shrink-0 flex items-center gap-1.5 rounded-md border border-black/15 px-3 text-sm font-medium text-[#5f5e5b] hover:bg-black/[0.03]"
                      >
                        <Copy size={14} /> Copiar
                      </button>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-black/5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <span className="text-sm">
                      Cuesta{" "}
                      <strong className="tabular-nums">{money(total)}</strong>
                    </span>
                    <span
                      className={`text-sm tabular-nums ${
                        margin < 0 ? "text-red-700" : "text-[#5f5e5b]"
                      }`}
                    >
                      Deja {money(margin)}
                      {percent !== null ? ` · ${percent.toFixed(0)}%` : ""}
                    </span>
                  </div>

                  {total <= 0 && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
                      <TriangleAlert size={13} className="shrink-0 mt-0.5" />
                      <span>
                        Sin costo, las ventas de este tamaño no van a saber
                        cuánto dejaron.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {sizes.length === 0 && (
            <p className="text-sm text-[#787774]">
              Este producto no tiene tamaños cargados.
            </p>
          )}
        </div>

        <div className="shrink-0 bg-white border-t border-black/10 px-5 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full rounded-md bg-[#37352f] text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
