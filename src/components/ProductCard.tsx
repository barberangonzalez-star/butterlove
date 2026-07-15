"use client";

import { useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const { addItem } = useCart();
  const size = product.sizes[sizeIdx];

  return (
    <div
      className={`rounded-3xl ${product.bgClass} p-6 flex flex-col h-full transition-transform hover:-translate-y-1 duration-300`}
    >
      <div className="relative w-full aspect-square mb-4">
        <Image
          src={product.image}
          alt={`Mantequilla de ${product.name} Butter Love ${size.grams}g`}
          fill
          sizes="(max-width: 640px) 90vw, 260px"
          className="object-contain drop-shadow-xl"
        />
      </div>

      <h3 className="font-display font-700 text-2xl mb-1">{product.name}</h3>
      <p className="text-ink-soft text-sm mb-3">{product.tagline}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {product.badges.map((b) => (
          <span
            key={b}
            className="text-[11px] font-semibold uppercase tracking-wide bg-white/60 text-ink-soft px-2.5 py-1 rounded-full"
          >
            {b}
          </span>
        ))}
      </div>

      <div className="mt-auto">
        <div className="flex gap-2 mb-4">
          {product.sizes.map((s, i) => (
            <button
              key={s.grams}
              onClick={() => setSizeIdx(i)}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold border transition-colors ${
                i === sizeIdx
                  ? "bg-ink text-cream border-ink"
                  : "bg-white/50 border-ink/10 text-ink-soft hover:border-ink/30"
              }`}
            >
              {s.grams}g
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className={`font-display font-700 text-2xl ${product.accentClass}`}>
            ${size.price}
          </span>
          <button
            onClick={() => addItem(product.key, size.grams, size.price)}
            className="rounded-full bg-ink text-cream px-5 py-2.5 text-sm font-semibold hover:bg-white hover:text-ink transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
