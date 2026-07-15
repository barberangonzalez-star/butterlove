"use client";

import { useState } from "react";
import Image from "next/image";
import { products, FlavorKey, getProduct } from "@/lib/products";

export default function Hero() {
  const [active, setActive] = useState<FlavorKey>("mani");
  const product = getProduct(active);

  return (
    <section id="top" className="px-3 sm:px-5 pt-4">
      <div className="relative overflow-hidden torn-card min-h-[520px] sm:min-h-[600px] flex flex-col">
        {/* Foto real del banner, generada por producto */}
        <Image
          key={product.key}
          src={product.heroImage}
          alt={`Butter Love ${product.name} — mantequilla artesanal`}
          fill
          priority
          sizes="100vw"
          className="object-cover transition-opacity duration-500"
        />

        {/* leve degradado para que el texto/botones sean legibles sobre la foto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/10" />

        <div className="relative flex-1 flex flex-col justify-end px-6 sm:px-10 pb-8 pt-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">
            {active === "mani" ? "Tiempo limitado" : "Untado real, 100% natural"}
          </p>

          <h1 className="font-display font-700 text-3xl sm:text-5xl text-white mb-6 max-w-lg drop-shadow">
            {active === "mani" ? (
              <>
                Promo 2 × 10
                <br />
                Mantequilla de maní
              </>
            ) : (
              <>
                {product.name}
                <br />
                {product.tagline}
              </>
            )}
          </h1>

          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex flex-wrap gap-2">
              {products.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActive(p.key)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                    active === p.key
                      ? "bg-white text-ink border-white"
                      : "bg-black/20 text-white border-white/40 hover:border-white"
                  }`}
                  aria-label={p.name}
                  title={p.name}
                >
                  {p.name[0]}
                </button>
              ))}
            </div>

            <a
              href="#productos"
              className="rounded-full bg-white text-ink px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-cream transition-colors"
            >
              Ver productos
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
