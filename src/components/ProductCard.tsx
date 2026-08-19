"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, isCombo, productTitle, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export default function ProductCard({ product }: { product: Product }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { addItem } = useCart();
  // La vitrina cotiza siempre el frasco de 230g, que es el que se lleva la
  // mayoría: un solo precio por tarjeta se lee de un vistazo, y quien quiera
  // otro tamaño lo elige en la ficha. Los combos no tienen 230g, así que caen
  // en su presentación única.
  const size = product.sizes.find((s) => s.grams === 230) ?? product.sizes[0];
  const title = productTitle(product);

  return (
    <div className="torn-card overflow-hidden flex flex-col">
      {/* Colored "torn card" — mirrors Charlie's product tile */}
      <div
        className={`relative ${product.bgClass} pt-4 px-4 pb-0 aspect-[4/5] flex flex-col`}
      >
        {/* Tocar el frasco abre su ficha, como en cualquier tienda. Antes sólo
            se llegaba por el nombre de abajo o por dentro del panel de
            información, y el gesto natural —tocar la foto— no llevaba a nada. */}
        <Link
          href={`/productos/${product.key}`}
          aria-label={`Ver ${title}`}
          className="absolute inset-0 z-10"
        />

        <div className="flex items-start justify-between relative z-20">
          <span className="bg-white/90 text-ink text-xs px-3 py-1 rounded-full">
            {isCombo(product) ? "Combo" : "100% natural"}
          </span>
          <button
            onClick={() => setInfoOpen((v) => !v)}
            aria-expanded={infoOpen}
            aria-label={`Información de ${product.name}`}
            className="w-7 h-7 rounded-full bg-white/90 text-ink flex items-center justify-center font-display font-700 text-sm hover:bg-white transition-colors"
          >
            i
          </button>
        </div>

        {/* Los sabores sueltos son recortes sin fondo, así que flotan sobre el
            color de la tarjeta con las burbujas detrás. Las fotos de combo
            traen su propio fondo: ahí la foto es la tarjeta. */}
        {isCombo(product) ? (
          <Image
            src={product.image}
            alt={`${title} Butter Love ${sizeLabel(product, size)}`}
            fill
            sizes="(max-width: 640px) 90vw, 280px"
            className="absolute inset-0 object-cover"
          />
        ) : (
          <>
            {/* decorative bubbles, echoing Charlie's droplet motifs */}
            <span className="absolute left-5 top-[42%] w-2 h-2 rounded-full bg-white/50" />
            <span className="absolute left-8 top-[48%] w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="absolute right-6 top-[30%] w-2.5 h-2.5 rounded-full bg-white/40" />

            <div className="relative flex-1 mt-1">
              <Image
                src={product.image}
                alt={`${title} Butter Love ${sizeLabel(product, size)}`}
                fill
                sizes="(max-width: 640px) 90vw, 280px"
                className="object-contain object-bottom drop-shadow-xl"
              />
            </div>
          </>
        )}

        {infoOpen && (
          <div className="absolute inset-0 z-30 bg-ink/95 text-cream p-5 flex flex-col justify-center">
            <button
              onClick={() => setInfoOpen(false)}
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
              className="mt-4 inline-block text-xs font-bold uppercase tracking-wide text-cream underline underline-offset-4 hover:text-white w-fit"
            >
              Más información →
            </Link>
          </div>
        )}
      </div>

      {/* Pie de la tarjeta: nombre, precio y el botón, todo en un renglón. El
          gramaje no se nombra —es siempre el mismo— y así el precio queda
          pegado al nombre, que es como se pregunta en la calle: "¿a cómo la
          de maní?". */}
      <div className="px-4 pt-3 pb-4 flex items-center justify-between gap-2">
        <Link
          href={`/productos/${product.key}`}
          className="min-w-0 font-display font-700 text-base lg:text-[17px] leading-tight text-ink hover:underline"
        >
          {title}{" "}
          {/* El precio va un punto más chico que el nombre: manda el nombre,
              y con los dos al mismo cuerpo el renglón no alcanza. */}
          <span className="whitespace-nowrap text-sm lg:text-base">
            ${size.price.toFixed(2)}
          </span>
        </Link>
        {/* En el teléfono el botón va más chico para que el nombre más largo
            ("Dúo Pistacho + Almendras $38.00") siga cabiendo en el renglón. */}
        <button
          onClick={() => addItem(product.key, size.grams, size.price)}
          className="shrink-0 rounded-full bg-ink text-cream px-3 py-1.5 text-xs font-semibold hover:opacity-85 transition-opacity"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
