"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Calculator, TriangleAlert } from "lucide-react";
import ProductForm from "./ProductForm";
import RecipeForm from "./RecipeForm";
import { deleteProductAction } from "./actions";
import { marginPercent } from "@/lib/costs";
import type { SizeCost } from "@/lib/costs-data";
import type { SupplyItem } from "@/lib/inventory-data";
import type { AdminProduct } from "@/lib/products-data";

/** Marca los productos que no van en la vitrina, sólo en el panel. */
function HiddenTag() {
  return (
    <span className="ml-1.5 align-middle text-[11px] font-normal bg-black/5 text-[#787774] px-1.5 py-0.5 rounded">
      Fuera de la tienda
    </span>
  );
}

/**
 * Lo que cuesta y lo que deja cada tamaño. Un costo incompleto se marca en vez
 * de mostrarse como bueno: es más bajo que el real y engañaría al leerlo.
 */
function CostSummary({
  product,
  costs,
}: {
  product: AdminProduct;
  costs: SizeCost[];
}) {
  if (product.sizes.length === 0) return <span className="text-[#787774]">—</span>;

  return (
    <ul className="space-y-0.5">
      {product.sizes.map((size) => {
        const cost = costs.find((c) => c.productSizeId === size.id);
        if (!cost?.hasRecipe) {
          return (
            <li key={size.id} className="whitespace-nowrap text-amber-700">
              {size.grams}g · sin receta
            </li>
          );
        }
        const percent = marginPercent(size.price, cost.total);
        return (
          <li key={size.id} className="whitespace-nowrap tabular-nums">
            {size.grams}g · ${cost.total.toFixed(2)}
            {percent !== null && (
              <span
                className={percent < 0 ? "text-red-700" : "text-[#5f5e5b]"}
              >
                {" "}
                → {percent.toFixed(0)}%
              </span>
            )}
            {cost.missing.length > 0 && (
              <TriangleAlert
                size={12}
                className="inline ml-1 -mt-0.5 text-amber-600"
                aria-label="Faltan precios de insumos"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function ProductsAdminClient({
  products,
  costs,
  supplies,
}: {
  products: AdminProduct[];
  costs: SizeCost[];
  supplies: SupplyItem[];
}) {
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [costing, setCosting] = useState<AdminProduct | null>(null);

  async function handleDelete(product: AdminProduct) {
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
    await deleteProductAction(product.id);
  }

  return (
    <div>
      <button
        onClick={() => setEditing("new")}
        className="mb-4 flex items-center gap-1.5 rounded-md bg-[#37352f] text-white text-sm font-medium px-3.5 py-2 hover:opacity-90 transition-opacity"
      >
        <Plus size={15} /> Nuevo producto
      </button>

      {/* Debajo de md cada producto va como ficha en vez de fila. */}
      <div className="md:hidden space-y-2">
        {products.map((p) => (
          <div key={p.id} className="border border-black/10 rounded-lg bg-white p-4">
            <div className="flex items-start gap-2.5">
              <div className={`w-4 h-4 shrink-0 rounded-full mt-0.5 ${p.bgClass}`} />
              <div className="min-w-0">
                <p className="font-medium text-sm break-words">
                  {p.name}
                  {!p.inStore && <HiddenTag />}
                </p>
                <p className="text-xs text-[#787774] break-words">{p.tagline}</p>
              </div>
            </div>

            <p className="text-sm text-[#5f5e5b] mt-3">
              {p.sizes.map((s) => `${s.grams}g $${s.price}`).join(" · ") || "—"}
            </p>

            <div className="text-xs text-[#5f5e5b] mt-1">
              <CostSummary product={p} costs={costs} />
            </div>

            {p.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {p.badges.map((b) => (
                  <span
                    key={b}
                    className="text-[11px] bg-black/5 text-[#5f5e5b] px-2 py-0.5 rounded-full"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-3 pt-3 border-t border-black/5">
              <button
                onClick={() => setCosting(p)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium hover:bg-black/5"
              >
                <Calculator size={14} /> Receta
              </button>
              <button
                onClick={() => setEditing(p)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium hover:bg-black/5"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-md border border-black/15 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <p className="border border-black/10 rounded-lg bg-white px-4 py-10 text-center text-sm text-[#787774]">
            Todavía no hay productos.
          </p>
        )}
      </div>

      <div className="hidden md:block border border-black/10 rounded-lg overflow-hidden bg-white">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium w-8"></th>
              <th className="px-4 py-2.5 font-medium">Producto</th>
              <th className="px-4 py-2.5 font-medium">Tallas</th>
              <th className="px-4 py-2.5 font-medium">Costo → margen</th>
              <th className="px-4 py-2.5 font-medium">Badges</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                <td className="px-4 py-3">
                  <div className={`w-4 h-4 rounded-full ${p.bgClass}`} />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {p.name}
                    {!p.inStore && <HiddenTag />}
                  </p>
                  <p className="text-xs text-[#787774]">{p.tagline}</p>
                </td>
                <td className="px-4 py-3 text-[#5f5e5b]">
                  {p.sizes.map((s) => `${s.grams}g $${s.price}`).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[#5f5e5b]">
                  <CostSummary product={p} costs={costs} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {p.badges.map((b) => (
                      <span
                        key={b}
                        className="text-[11px] bg-black/5 text-[#5f5e5b] px-2 py-0.5 rounded-full"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => setCosting(p)}
                      title="Receta y costo"
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Calculator size={14} />
                    </button>
                    <button
                      onClick={() => setEditing(p)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5 text-[#5f5e5b]"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[#787774]">
                  Todavía no hay productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

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
