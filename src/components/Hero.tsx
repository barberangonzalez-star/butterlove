"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useProducts } from "@/lib/products-context";
import { isCombo, type Product } from "@/lib/products";
import { WHATSAPP_LINK } from "@/lib/config";

/** El combo que anuncia el banner de maní, y el envase con el que se arma. */
const PROMO_KEY = "duo-mani";
const PROMO_JARS = 2;
const PROMO_GRAMS = 460;

/** Una lámina del carrusel: la foto de fondo y el texto que va encima. */
interface Slide {
  key: string;
  /** Inicial del botón redondo, y su nombre para lectores de pantalla. */
  name: string;
  image: string;
  /**
   * Por dónde recortar la foto, que nunca cabe entera y por lados distintos
   * según la pantalla: la ancha es más apaisada que la foto y le come arriba y
   * abajo; el teléfono es más alto y le come los costados. Centrado —lo de
   * siempre— parte por la mitad lo que sobre, y eso no siempre deja dentro el
   * frasco.
   */
  imagePosition: string;
  alt: string;
  eyebrow: string;
  title: ReactNode;
  cta: { href: string; label: string };
}

const VER_PRODUCTOS = { href: "#productos", label: "Ver productos" };

/**
 * Por dónde recortar la foto de cada sabor, que es lo que decide qué se ve
 * cuando no cabe entera.
 *
 * En el teléfono la tarjeta es vertical y la foto apaisada: se le van los
 * costados, más de la mitad del ancho. Y en estas fotos el frasco no está en
 * el medio sino a la derecha —la izquierda es el aire donde vuela el fruto—,
 * así que el recorte centrado se lo parte. El número es el de
 * `object-position`: 50% es el centro y 100% arrima la foto a su borde
 * derecho, que es donde está el producto.
 *
 * En pantalla ancha pasa al revés y sobra alto, así que casi todas se quedan
 * centradas: sólo Chocomaní, que es un primer plano de los frascos parados
 * sobre la mesa, necesita correrse hacia abajo para no perder la base.
 *
 * Las clases van escritas enteras y no armadas con plantillas: Tailwind sólo
 * genera las que encuentra literales en el código, igual que pasa con los
 * colores de `product-swatches.ts`.
 */
const FRAMING: Record<string, string> = {
  mani: "object-[65%_50%] sm:object-center",
  pistacho: "object-[80%_50%] sm:object-center",
  almendras: "object-[80%_50%] sm:object-center",
  merey: "object-[65%_50%] sm:object-center",
  chocomani: "object-[78%_50%] sm:object-[50%_70%]",
};

/** Una foto sin encuadre anotado se centra, que es lo que hacía el banner. */
const FRAMING_DEFAULT = "object-center";

export default function Hero({ announcement }: { announcement?: Product }) {
  const catalog = useProducts();
  // El banner rota entre sabores: los combos no tienen foto hero propia y su
  // nombre no encaja en el titular, así que se quedan fuera del selector.
  const products = catalog.filter((p) => !isCombo(p));

  // Los precios salen del catálogo y no escritos a mano en el titular.
  // El del combo estuvo en $10 mucho después de subir a $12.99, porque
  // cambiarlo en el panel no tocaba esta línea: el banner prometía un precio
  // que el carrito ya no hacía. Así el titular no puede desfasarse.
  const promoPrice = catalog
    .find((p) => p.key === PROMO_KEY)
    ?.sizes.find((s) => s.grams === PROMO_GRAMS)?.price;
  const announcementPrice = announcement?.sizes.length
    ? Math.min(...announcement.sizes.map((s) => s.price))
    : undefined;

  const slides: Slide[] = [];

  // El anuncio del sabor nuevo va de primero. Sin precio o sin foto no hay
  // nada que anunciar —el "desde" quedaría vacío y el banner sin fondo—, así
  // que en ese caso el carrusel arranca en los sabores de siempre.
  if (announcement && announcementPrice !== undefined && announcement.heroImage) {
    slides.push({
      key: announcement.key,
      name: announcement.name,
      image: announcement.heroImage,
      imagePosition: FRAMING[announcement.key] ?? FRAMING_DEFAULT,
      alt: `Butter Love ${announcement.name} — mantequilla artesanal`,
      eyebrow: "Nuevo sabor",
      // En el teléfono el titular se queda en "Nueva Chocomaní": con el
      // "mantequilla de" son tres renglones que se comen el banner y le pasan
      // por encima al frasco.
      title: (
        <>
          Nueva <span className="hidden sm:inline">mantequilla de </span>
          {announcement.name}
          <br />
          desde {announcementPrice.toFixed(2)}$
        </>
      ),
      // Un producto de sólo encargo no está en la vitrina: mandarlo a
      // #productos sería un callejón sin salida, y se pide escribiendo.
      cta: catalog.some((p) => p.key === announcement.key)
        ? VER_PRODUCTOS
        : { href: WHATSAPP_LINK, label: "Pedir por WhatsApp" },
    });
  }

  for (const product of products) {
    // Si algún día el sabor anunciado entra a la vitrina, sigue teniendo una
    // sola lámina: la del anuncio, que ya va de primera.
    if (slides.some((s) => s.key === product.key)) continue;
    slides.push({
      key: product.key,
      name: product.name,
      image: product.heroImage,
      imagePosition: FRAMING[product.key] ?? FRAMING_DEFAULT,
      alt: `Butter Love ${product.name} — mantequilla artesanal`,
      eyebrow:
        product.key === "mani" && promoPrice
          ? "Tiempo limitado"
          : "Untado real, 100% natural",
      // Sin precio no hay promo que anunciar: si el combo sale de la vitrina,
      // el maní se titula como los demás sabores en vez de prometer un
      // descuento que ya no existe.
      title:
        product.key === "mani" && promoPrice ? (
          <>
            Promo {PROMO_JARS} × {promoPrice.toFixed(2)}$
            <br />
            Mantequilla de maní
          </>
        ) : product.key === "pistacho" || product.key === "merey" ? (
          <>Mantequilla de {product.name}</>
        ) : (
          <>
            Mantequilla de {product.name}
            {/* La frase de abajo es de pantalla ancha. En el teléfono el
                titular se iba a cuatro renglones —"Bienestar en cada
                cucharada" ocupa dos— y terminaba tapando el frasco. */}
            <span className="hidden sm:inline">
              <br />
              {product.tagline}
            </span>
          </>
        ),
      cta: VER_PRODUCTOS,
    });
  }

  const [active, setActive] = useState<string>(slides[0]?.key ?? "");
  const slide = slides.find((s) => s.key === active);

  if (!slide) return null;

  return (
    <section id="top" className="px-3 sm:px-5 pt-4">
      <div className="relative overflow-hidden torn-card min-h-[520px] sm:min-h-[600px] flex flex-col">
        {/* Foto real del banner, generada por producto */}
        <Image
          key={slide.key}
          src={slide.image}
          alt={slide.alt}
          fill
          priority
          sizes="100vw"
          className={`object-cover ${slide.imagePosition} transition-opacity duration-500`}
        />

        {/* En el teléfono el texto va arriba y los botones abajo, así que el
            velo oscurece las dos puntas y deja el medio limpio: es donde se ve
            el frasco. Oscurecerlo entero para que el titular leyera dejaba el
            producto turbio, que es justo lo que el banner viene a enseñar. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent via-45% to-black/55 sm:hidden" />

        {/* En pantalla ancha el texto cae a un lado del frasco, sobre pared
            vacía: alcanza un velo suave que asiente los botones de abajo. */}
        <div className="absolute inset-0 hidden sm:block bg-gradient-to-t from-black/45 via-black/10 via-40% to-black/10" />

        <div className="relative flex-1 flex flex-col px-6 sm:px-10 pb-8 pt-10">
          {/* En el teléfono el titular va arriba, sobre la pared vacía de la
              foto; en pantalla ancha baja a su sitio de siempre, junto a los
              botones. */}
          <div className="sm:mt-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2">
              {slide.eyebrow}
            </p>

            <h1 className="font-display font-700 text-3xl sm:text-5xl text-white mb-6 max-w-lg drop-shadow">
              {slide.title}
            </h1>
          </div>

          <div className="mt-auto sm:mt-0 flex items-end justify-between flex-wrap gap-4">
            <div className="flex flex-wrap gap-2">
              {slides.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
                    active === s.key
                      ? "bg-white text-ink border-white"
                      : "bg-black/20 text-white border-white/40 hover:border-white"
                  }`}
                  aria-label={s.name}
                  title={s.name}
                >
                  {s.name[0]}
                </button>
              ))}
            </div>

            <a
              href={slide.cta.href}
              className="rounded-full bg-white text-ink px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-cream transition-colors"
            >
              {slide.cta.label}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
