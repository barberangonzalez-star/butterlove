"use client";

import { useState } from "react";
import { setStockAction } from "./actions";
import type { AdminProduct } from "@/lib/products-data";

const LOW_STOCK_THRESHOLD = 5;

function StockCell({ sizeId, initialValue }: { sizeId: number; initialValue: number }) {
  const [value, setValue] = useState(String(initialValue));

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const parsed = Number(value);
        if (parsed !== initialValue) {
          setStockAction(sizeId, parsed);
        }
      }}
      className={`w-16 md:w-24 rounded-md border px-2 py-2 md:py-1.5 text-sm text-right outline-none focus:border-[#37352f] ${
        Number(value) <= LOW_STOCK_THRESHOLD
          ? "border-red-300 text-red-700 bg-red-50"
          : "border-black/15"
      }`}
    />
  );
}

export default function ProductStockClient({ products }: { products: AdminProduct[] }) {
  return (
    <div className="border border-black/10 rounded-lg overflow-hidden bg-white">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-xs text-[#787774] uppercase tracking-wide">
            <th className="px-3 md:px-4 py-2.5 font-medium">Producto</th>
            <th className="px-3 md:px-4 py-2.5 font-medium">Talla</th>
            <th className="px-3 md:px-4 py-2.5 font-medium text-right">Stock (frascos)</th>
          </tr>
        </thead>
        <tbody>
          {products.flatMap((p) =>
            p.sizes.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                <td className="px-3 md:px-4 py-3">
                  <div className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${p.bgClass}`} />
                  {p.name}
                </td>
                <td className="px-3 md:px-4 py-3 text-[#5f5e5b]">{s.grams}g</td>
                <td className="px-3 md:px-4 py-3 text-right">
                  <StockCell sizeId={s.id} initialValue={s.stockQuantity} />
                </td>
              </tr>
            ))
          )}
          {products.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-10 text-center text-[#787774]">
                No hay productos todavía.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
