"use client";

import { useState } from "react";
import Image from "next/image";
import { products, FlavorKey, getProduct } from "@/lib/products";

const bgByKey: Record<FlavorKey, string> = {
  mani: "bg-mani-bg",
  pistacho: "bg-pistacho-bg",
  almendras: "bg-almendras-bg",
  merey: "bg-merey-bg",
};

export default function Hero() {
  const [active, setActive] = useState<FlavorKey>("mani");
  const product = getProduct(active);

  return (
    <section id="top" className="px-3 sm:px-5 pt-4">
      <div
        className={`relative overflow-hidden torn-card transition-colors duration-500 ease-out ${bgByKey[active]} min-h-[520px] sm:min-h-[600px] flex flex-col`}
      >
        {/* oversized background wordmark, echoes Charlie's distressed hero type */}
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center font-display font-700 text-[22vw] sm:text-[13vw] leading-none text-white/25 select-none whitespace-nowrap"
        >
          BUTTER LOVE
        </span>

        <div className="relative flex-1 flex items-center justify-center py-10">
          <div className="relative w-56 sm:w-72 aspect-square rotate-[6deg]">
            <Image
              key={product.key}
              src={product.image}
              alt={`Mantequilla de ${product.name} Butter Love`}
              fill
              priority
              sizes="(max-width: 640px) 240px, 320px"
              className="object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        <div className="relative flex items-end justify-between px-6 sm:px-10 pb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-ink/70">
              Sabor
            </p>
            <p className="font-display font-700 text-2xl sm:text-3xl text-ink underline decoration-2 underline-offset-4">
              {product.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                  active === p.key
                    ? "bg-ink text-cream border-ink"
                    : "bg-white/70 text-ink border-white/0 hover:border-ink/40"
                }`}
                aria-label={p.name}
                title={p.name}
              >
                {p.name[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 py-5 flex-wrap gap-3">
        <p className="font-display font-700 text-lg sm:text-xl text-ink max-w-md">
          Untado real. Sin azúcar, sin nada raro.
        </p>
        <a
          href="#productos"
          className="rounded-full bg-ink text-cream px-6 py-3 font-bold text-sm uppercase tracking-wide hover:opacity-85 transition-opacity"
        >
          Ver productos
        </a>
      </div>
    </section>
  );
}
