"use client";

import { useState } from "react";
import Image from "next/image";
import { Product, isCombo, productTitle } from "@/lib/products";

/**
 * La galería de la ficha: miniaturas a un lado y la foto grande al centro,
 * como en cualquier tienda grande. El producto guarda dos fotos —el frasco y
 * la de ambiente— y hasta ahora la segunda sólo se usaba de portada; acá las
 * dos quedan a un toque de distancia.
 */
export default function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const title = productTitle(product);

  // El recorte del frasco no trae fondo: necesita el color de la tarjeta
  // detrás. Las fotos de combo y de ambiente traen el suyo y llenan el marco.
  const shots = [
    { src: product.image, cutout: !isCombo(product) },
    { src: product.heroImage, cutout: false },
  ].filter((shot, i, all) => all.findIndex((s) => s.src === shot.src) === i);

  const shot = shots[active] ?? shots[0];

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4">
      {shots.length > 1 && (
        <div
          className="flex sm:flex-col gap-2 sm:gap-3"
          role="tablist"
          aria-label={`Fotos de ${title}`}
        >
          {shots.map((s, i) => (
            <button
              key={s.src}
              role="tab"
              aria-selected={i === active}
              aria-label={`Ver foto ${i + 1} de ${title}`}
              onClick={() => setActive(i)}
              onMouseEnter={() => setActive(i)}
              className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] shrink-0 rounded-2xl overflow-hidden transition-shadow ${
                s.cutout ? product.bgClass : "bg-surface"
              } ${
                i === active
                  ? "ring-2 ring-ink ring-offset-2 ring-offset-page"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={s.src}
                alt=""
                fill
                sizes="72px"
                className={s.cutout ? "object-contain p-1.5" : "object-cover"}
              />
            </button>
          ))}
        </div>
      )}

      <div
        className={`torn-card relative flex-1 aspect-square overflow-hidden ${
          shot.cutout ? product.bgClass : "bg-surface"
        }`}
      >
        <Image
          key={shot.src}
          src={shot.src}
          alt={`${title} Butter Love`}
          fill
          priority
          sizes="(max-width: 768px) 92vw, 520px"
          className={
            shot.cutout
              ? "object-contain p-8 drop-shadow-xl"
              : "object-cover"
          }
        />
      </div>
    </div>
  );
}
