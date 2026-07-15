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

const accentByKey: Record<FlavorKey, string> = {
  mani: "bg-mani-accent",
  pistacho: "bg-pistacho-accent",
  almendras: "bg-almendras-accent",
  merey: "bg-merey-accent",
};

export default function Hero() {
  const [active, setActive] = useState<FlavorKey>("mani");
  const product = getProduct(active);

  return (
    <section
      id="top"
      className={`relative overflow-hidden transition-colors duration-700 ease-out ${bgByKey[active]}`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-14 pb-10 sm:pt-20 sm:pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block rounded-full bg-ink/5 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase text-ink-soft mb-5">
            Hecho a mano en Venezuela
          </span>
          <h1 className="font-display font-700 text-[2.6rem] leading-[1.05] sm:text-6xl sm:leading-[1.02] mb-5">
            Amor untado,
            <br />
            <span className={accentByKey[active].replace("bg-", "text-")}>
              100% real.
            </span>
          </h1>
          <p className="text-ink-soft text-lg max-w-md mb-8">
            Mantequillas de maní y frutos secos molidas despacio, sin azúcar
            agregada y sin atajos. Solo lo que dice el frasco.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {products.map((p) => (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  active === p.key
                    ? "bg-ink text-cream border-ink"
                    : "bg-white/50 text-ink-soft border-ink/10 hover:border-ink/30"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#productos"
              className="inline-flex items-center gap-2 rounded-full bg-ink text-cream px-6 py-3 font-semibold hover:bg-mani-accent transition-colors"
            >
              Ver productos
            </a>
            <span className="text-ink-soft text-sm">
              desde{" "}
              <strong className="text-ink">
                ${Math.min(...product.sizes.map((s) => s.price))}
              </strong>
            </span>
          </div>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <div
            className={`absolute w-72 h-72 sm:w-96 sm:h-96 rounded-[45%_55%_60%_40%/50%_45%_55%_50%] ${accentByKey[active]} opacity-20 blur-2xl`}
          />
          <div className="relative w-64 sm:w-80 aspect-square">
            <div
              className={`absolute inset-4 rounded-[50%] ${accentByKey[active]} opacity-15`}
            />
            <Image
              key={product.key}
              src={product.image}
              alt={`Mantequilla de ${product.name} Butter Love`}
              fill
              priority
              sizes="(max-width: 640px) 260px, 320px"
              className="object-contain drop-shadow-2xl animate-[fadein_0.5s_ease]"
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadein {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}
