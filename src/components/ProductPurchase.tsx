"use client";

import { useState } from "react";
import { Product, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductPurchase({ product }: { product: Product }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const { addItem } = useCart();
  const size = product.sizes[sizeIdx];
  const multiSize = product.sizes.length > 1;

  return (
    <div className="rounded-2xl bg-white/70 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-3">
        {multiSize ? "Elige tamaño" : "Presentación"}
      </p>
      {multiSize ? (
        <div className="flex gap-2 mb-4">
          {product.sizes.map((s, i) => (
            <button
              key={s.grams}
              onClick={() => setSizeIdx(i)}
              className={`flex-1 rounded-full py-2 text-sm font-semibold border transition-colors ${
                i === sizeIdx
                  ? "bg-ink text-cream border-ink"
                  : "bg-transparent border-ink/15 text-ink-soft hover:border-ink/40"
              }`}
            >
              {sizeLabel(product, s)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink mb-4">
          {sizeLabel(product, size)}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="font-display font-700 text-3xl text-ink">
          ${size.price}
        </span>
        <button
          onClick={() => addItem(product.key, size.grams, size.price)}
          className="rounded-full bg-ink text-cream px-6 py-3 text-sm font-semibold hover:opacity-85 transition-opacity"
        >
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}
