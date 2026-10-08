"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Product, isCombo, productTitle, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import {
  formatRating,
  reviewCountLabel,
  type RatingSummary,
} from "@/lib/reviews";

export default function ProductCard({
  product,
  rating,
}: {
  product: Product;
  /** Sólo llega si el producto tiene reseñas publicadas suficientes. */
  rating?: RatingSummary;
}) {
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
        // Cuadrada como las fotos, que son todas de 1080x1080. En 4:5 el
        // marco es más alto que ancho y a los combos —que traen su propio
        // fondo y se dibujan con object-cover— les cortaba los lados.
        className={`relative ${product.bgClass} pt-4 px-4 pb-0 aspect-square flex flex-col`}
      >
        {/* Tocar el frasco abre su ficha, como en cualquier tienda: es el
            gesto que la gente ya hace, y ahí está todo lo que no cabe acá. */}
        <Link
          href={`/productos/${product.key}`}
          aria-label={`Ver ${title}`}
          className="absolute inset-0 z-10"
        />

        {/* Las estrellas van arriba, frente a la etiqueta, y no en el pie: el
            renglón de nombre, precio y botón ya va justo en el teléfono. No
            reciben toques, así que tocarlas abre la ficha como el resto. */}
        <div className="relative z-20 flex items-start justify-between gap-2">
          <span className="bg-white/90 text-ink text-xs px-3 py-1 rounded-full">
            {isCombo(product) ? "Combo" : "Sin azúcar"}
          </span>
          {rating && (
            <span
              role="img"
              aria-label={`${formatRating(rating.average)} de 5 estrellas, ${reviewCountLabel(rating.count)}`}
              className="pointer-events-none inline-flex items-center gap-1 bg-white/90 text-ink text-xs font-semibold px-2.5 py-1 rounded-full"
            >
              <Star
                size={12}
                fill="currentColor"
                strokeWidth={0}
                className="text-star"
                aria-hidden="true"
              />
              {formatRating(rating.average)}
              <span className="font-normal text-ink-soft">({rating.count})</span>
            </span>
          )}
        </div>

        {/* Los recortes sin fondo flotan sobre el color de la tarjeta, con las
            burbujas detrás. Las fotos que traen su propio fondo —los combos, y
            los sabores que llegan fotografiados en estudio— son la tarjeta. */}
        {!product.imageCutout ? (
          <Image
            src={product.image}
            alt={`${title} Butter Love ${sizeLabel(product, size)}`}
            fill
            sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 25vw"
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
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 25vw"
                className="object-contain object-bottom drop-shadow-xl"
              />
            </div>
          </>
        )}

      </div>

      {/* Pie de la tarjeta: el nombre arriba y, debajo, el precio frente al
          botón. Van en dos renglones para que el precio tenga cuerpo propio:
          pegado al nombre y más chico se perdía, y es lo primero que busca
          quien está viendo la vitrina —"¿a cómo la de maní?"—. El gramaje no
          se nombra porque es siempre el mismo.
          El fondo es el color del sabor aclarado con un velo blanco: el pie
          se lee como parte de la misma tarjeta y el nombre deja de flotar
          sobre el blanco de la página. */}
      <div className={`${product.bgClass} flex-1`}>
        <div className="h-full bg-white/60 px-4 pt-3 pb-4 flex flex-col gap-1.5">
          <Link
            href={`/productos/${product.key}`}
            className="font-display font-700 text-lg lg:text-xl leading-tight text-ink hover:underline"
          >
            {title}
          </Link>
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-700 text-2xl leading-none text-ink">
              ${size.price.toFixed(2)}
            </span>
            {/* Con el renglón para él solo, el botón crece a un tamaño cómodo
                para el pulgar. */}
            <button
              onClick={() => addItem(product.key, size.grams, size.price)}
              className="shrink-0 rounded-full bg-ink text-cream px-4 py-2 text-sm font-semibold hover:opacity-85 transition-opacity"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
