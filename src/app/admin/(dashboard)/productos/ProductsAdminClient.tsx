"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import ProductForm from "./ProductForm";
import { deleteProductAction } from "./actions";
import type { AdminProduct } from "@/lib/products-data";

export default function ProductsAdminClient({
  products,
}: {
  products: AdminProduct[];
}) {
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);

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

      <div className="border border-black/10 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium w-8"></th>
              <th className="px-4 py-2.5 font-medium">Producto</th>
              <th className="px-4 py-2.5 font-medium">Tallas</th>
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
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-[#787774]">{p.tagline}</p>
                </td>
                <td className="px-4 py-3 text-[#5f5e5b]">
                  {p.sizes.map((s) => `${s.grams}g $${s.price}`).join(" · ") || "—"}
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
                <td colSpan={5} className="px-4 py-10 text-center text-[#787774]">
                  Todavía no hay productos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
