"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [infoOpen, setInfoOpen] = useState(false);
  const { addItem } = useCart();
  const size = product.sizes[sizeIdx];

  return (
    <div className="torn-card overflow-hidden flex flex-col">
      {/* Colored "torn card" — mirrors Charlie's product tile */}
      <div
        onClick={() => setInfoOpen((v) => !v)}
        className={`relative ${product.bgClass} pt-4 px-4 pb-0 aspect-[4/5] flex flex-col cursor-pointer`}
      >
        <div className="flex items-start justify-between relative z-10">
          <span className="bg-white/90 text-ink text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full">
            100% natural
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setInfoOpen((v) => !v);
            }}
            aria-label={`Información de ${product.name}`}
            className="w-7 h-7 rounded-full bg-white/90 text-ink flex items-center justify-center font-display font-700 text-sm hover:bg-white transition-colors"
          >
            i
          </button>
        </div>

        {/* decorative bubbles, echoing Charlie's droplet motifs */}
        <span className="absolute left-5 top-[42%] w-2 h-2 rounded-full bg-white/50" />
        <span className="absolute left-8 top-[48%] w-1.5 h-1.5 rounded-full bg-white/40" />
        <span className="absolute right-6 top-[30%] w-2.5 h-2.5 rounded-full bg-white/40" />

        <div className="relative flex-1 mt-1">
          <Image
            src={product.image}
            alt={`Mantequilla de ${product.name} Butter Love ${size.grams}g`}
            fill
            sizes="(max-width: 640px) 90vw, 280px"
            className="object-contain object-bottom drop-shadow-xl"
          />
        </div>

        {infoOpen && (
          <div className="absolute inset-0 z-20 bg-ink/95 text-cream p-5 flex flex-col justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInfoOpen(false);
              }}
              aria-label="Cerrar información"
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              ✕
            </button>
            <p className="text-sm leading-relaxed">{product.description}</p>
            <ul className="mt-4 space-y-1">
              {product.badges.map((b) => (
                <li key={b} className="text-xs text-cream/80">
                  • {b}
                </li>
              ))}
            </ul>
            <Link
              href={`/productos/${product.key}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-4 inline-block text-xs font-bold uppercase tracking-wide text-cream underline underline-offset-4 hover:text-white w-fit"
            >
              Más información →
            </Link>
          </div>
        )}
      </div>

      {/* White footer strip — product name, like Charlie's label under each can */}
      <div className="bg-white/80 px-4 pt-3 pb-4">
        <Link
          href={`/productos/${product.key}`}
          className="block font-display font-700 text-xl text-center mb-3 hover:underline"
        >
          Mantequilla de {product.name}
        </Link>

        <div className="flex gap-2 mb-3">
          {product.sizes.map((s, i) => (
            <button
              key={s.grams}
              onClick={() => setSizeIdx(i)}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold border transition-colors ${
                i === sizeIdx
                  ? "bg-ink text-cream border-ink"
                  : "bg-transparent border-ink/15 text-ink-soft hover:border-ink/40"
              }`}
            >
              {s.grams}g
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-display font-700 text-2xl text-ink">
            ${size.price}
          </span>
          <button
            onClick={() => addItem(product.key, size.grams, size.price)}
            className="rounded-full bg-ink text-cream px-4 py-2 text-sm font-semibold hover:opacity-85 transition-opacity"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
