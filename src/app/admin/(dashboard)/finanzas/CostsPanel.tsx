"use client";

import { useState } from "react";
import { Calculator, TriangleAlert } from "lucide-react";
import RecipeForm from "./RecipeForm";
import { setSizeCostAction } from "./actions";
import { marginPercent } from "@/lib/costs";
import type { SizeCost } from "@/lib/costs-data";
import type { SupplyItem } from "@/lib/inventory-data";
import type { AdminProduct } from "@/lib/products-data";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

/**
 * El costo del envase, editable en el sitio. Se guarda al salir del campo y no
 * a cada tecla: escribir "3.20" pasa por "3" y por "3.2", y guardar eso sería
 * guardar tres costos distintos.
 */
function CostCell({ sizeId, value }: { sizeId: number; value: number }) {
  const [text, setText] = useState(value > 0 ? String(value) : "");
  const [saving, setSaving] = useState(false);

  async function commit() {
    const parsed = Number(text);
    // Vacío o basura es "no lo sé", que se guarda como cero: así el tamaño
    // vuelve a contarse como sin costo en vez de quedar con un número falso.
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    if (next === value) return;
    setSaving(true);
    try {
      await setSizeCostAction(sizeId, next);
    } finally {
      setSaving(false);
    }
  }

  return (
    <input
      type="number"
      step="0.01"
      min="0"
      inputMode="decimal"
      value={text}
      disabled={saving}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      placeholder="0.00"
      aria-label="Costo por frasco"
      className="w-20 rounded-md border border-black/15 px-2 py-1.5 text-sm text-right tabular-nums outline-none focus:border-[#37352f] disabled:opacity-50"
    />
  );
}

export default function CostsPanel({
  products,
  costs,
  supplies,
}: {
  products: AdminProduct[];
  costs: SizeCost[];
  supplies: SupplyItem[];
}) {
  const [costing, setCosting] = useState<AdminProduct | null>(null);

  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
        Costo y ganancia por frasco
      </p>
      <p className="text-xs text-[#787774] mb-3">
        Escribe lo que te cuesta hacer cada envase y la ganancia se calcula
        sola. Se guarda al salir del campo.
      </p>

      <div className="overflow-x-auto -mx-4">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs text-[#787774] uppercase tracking-wide border-b border-black/10">
              <th className="px-4 py-2 font-medium">Producto</th>
              <th className="px-4 py-2 font-medium text-right">Precio</th>
              <th className="px-4 py-2 font-medium text-right">Costo</th>
              <th className="px-4 py-2 font-medium text-right">Deja</th>
              <th className="px-4 py-2 font-medium text-right">Margen</th>
              <th className="px-4 py-2 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody>
            {products.flatMap((product) =>
              product.sizes.map((size) => {
                const cost = costs.find((c) => c.productSizeId === size.id);
                // Un costo a medias es más bajo que el real: se dice que falta
                // en vez de mostrar una ganancia que no existe.
                const total = cost?.complete ? cost.total : null;
                const profit = total === null ? null : size.price - total;
                const percent =
                  total === null ? null : marginPercent(size.price, total);

                return (
                  <tr
                    key={size.id}
                    className="border-b border-black/5 last:border-0"
                  >
                    <td className="px-4 py-2">
                      {product.name}{" "}
                      <span className="text-[#787774]">{size.grams}g</span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {fmtUsd(size.price)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {/* La clave lleva el valor del servidor: si la receta lo
                          cambia, el campo se refresca en vez de quedar viejo. */}
                      <CostCell
                        key={`${size.id}-${cost?.extra ?? 0}`}
                        sizeId={size.id}
                        value={cost?.extra ?? 0}
                      />
                      {cost && cost.materials > 0 && (
                        <span className="block text-[11px] text-[#787774] mt-0.5">
                          + {fmtUsd(cost.materials)} de insumos
                        </span>
                      )}
                      {cost && cost.missing.length > 0 && (
                        <span className="flex items-center justify-end gap-1 text-[11px] text-amber-700 mt-0.5">
                          <TriangleAlert size={11} /> faltan precios
                        </span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-medium ${
                        profit !== null && profit < 0 ? "text-red-700" : ""
                      }`}
                    >
                      {profit === null ? "—" : fmtUsd(profit)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#787774]">
                      {percent === null ? "—" : `${percent.toFixed(0)}%`}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={() => setCosting(product)}
                        title="Desglosar por insumos"
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                      >
                        <Calculator size={14} />
                      </button>
                    </td>
                  </tr>
                );
              }),
            )}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[#787774]"
                >
                  Todavía no hay productos en el catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#787774] mt-3">
        Con la calculadora puedes desglosarlo insumo por insumo, usando los
        precios de compra de Inventario. La ventaja es que cuando suba el maní,
        suben solos todos los productos que lo llevan.
      </p>

      {costing && (
        <RecipeForm
          product={costing}
          supplies={supplies}
          costs={costs}
          onClose={() => setCosting(null)}
        />
      )}
    </div>
  );
}
