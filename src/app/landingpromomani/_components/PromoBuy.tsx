"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { productTitle } from "@/lib/products";
import { trackViewContent } from "@/lib/pixel";
import type { Pack } from "../packs";

/**
 * Los combos y el botón flotante, en un mismo componente.
 *
 * Están juntos porque comparten una sola cosa: cuál pack está elegido. El
 * botón de abajo no es otro botón —es el mismo pedido, siguiéndote por la
 * página—, y con el estado acá no hace falta un contexto para dos vecinos.
 */
export default function PromoBuy({ packs }: { packs: Pack[] }) {
  const { addItem, openCart, totalItems, isOpen } = useCart();
  // Arranca en el pack destacado: es la oferta que la página viene contando
  // desde el titular, y llegar acá con otra cosa marcada la contradice.
  const [selectedKey, setSelectedKey] = useState(
    () => (packs.find((p) => p.featured) ?? packs[packs.length - 1])?.key,
  );
  const [barVisible, setBarVisible] = useState(false);

  const pack = packs.find((p) => p.key === selectedKey) ?? packs[0];

  // La etiqueta la gana el pack que más ahorra, calculado con los precios de
  // verdad. Escrita a mano diría "mejor precio" aunque un día los precios
  // cambien y deje de serlo, que es la clase de mentira que el cliente
  // comprueba con una resta.
  const topSaver = packs.reduce<Pack | undefined>(
    (best, p) => (p.saved > (best?.saved ?? 0) ? p : best),
    undefined,
  );

  // Le avisa a Meta que alguien está viendo la promo. Se reporta el frasco
  // suelto, que es el producto del que habla la página; los packs se reportan
  // solos cuando se agregan al pedido.
  useEffect(() => {
    const unit = packs.find((p) => p.jars === 1) ?? packs[0];
    if (!unit) return;
    trackViewContent({
      key: unit.product.key,
      grams: unit.grams,
      name: productTitle(unit.product),
      price: unit.price,
    });
  }, [packs]);

  // El botón flotante aparece cuando el titular ya pasó. Encima del hero sólo
  // taparía el botón que ya está ahí.
  useEffect(() => {
    const onScroll = () => setBarVisible(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!pack) return null;

  const add = () => addItem(pack.product.key, pack.grams, pack.price, 1);

  return (
    <>
      <section id="combos" className="px-4 py-14 sm:py-20 scroll-mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Elige tu combo
        </p>
        <h2 className="font-display font-700 text-3xl sm:text-4xl text-ink mt-2">
          Mientras más frascos, más barato sale cada uno
        </h2>
        <p className="mt-3 text-ink-soft leading-relaxed">
          Todos son frascos de 230g de mantequilla de maní. El precio de combo
          solo aplica desde este enlace.
        </p>

        {/* El hueco entre tarjetas es el que aloja la cinta de ahorro: colgarla
            del borde superior la saca del renglón del título, que en un
            teléfono angosto es donde estorbaba. */}
        <div className="mt-7 space-y-4">
          {packs.map((p) => {
            const selected = p.key === pack.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => setSelectedKey(p.key)}
                aria-pressed={selected}
                className={`relative w-full text-left rounded-3xl p-4 flex items-center gap-3 sm:gap-4 transition-colors ${
                  selected
                    ? "bg-surface ring-2 ring-ink"
                    : "bg-page ring-1 ring-ink/15 hover:ring-ink/35"
                }`}
              >
                {p.key === topSaver?.key && (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-mani-bg px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-sm">
                    Ahorras ${p.saved.toFixed(2)}
                  </span>
                )}

                {/* Los frascos que trae, dibujados. Es la parte que se
                    entiende sin leer. */}
                <span className="shrink-0 flex items-end -space-x-5 sm:-space-x-4">
                  {Array.from({ length: p.jars }).map((_, i) => (
                    <Image
                      key={i}
                      src="/products/mani.png"
                      alt=""
                      aria-hidden="true"
                      width={72}
                      height={72}
                      className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow"
                    />
                  ))}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-display font-700 text-lg text-ink">
                    {p.title}
                  </span>
                  <span className="block text-sm text-ink-soft mt-0.5">
                    {p.pitch}
                  </span>
                  {/* En el frasco suelto sobra: el precio del pack y el del
                      frasco son el mismo número dos veces. */}
                  {p.jars > 1 && (
                    <span className="block text-sm font-semibold text-ink-soft">
                      ${p.perJar.toFixed(2)} c/u
                    </span>
                  )}
                </span>

                <span className="text-right shrink-0">
                  <span className="block font-display font-700 text-xl text-ink">
                    ${p.price.toFixed(2)}
                  </span>
                  {p.saved > 0 && (
                    <>
                      <span className="block text-xs text-ink-soft line-through">
                        ${p.listPrice.toFixed(2)}
                      </span>
                      <span className="mt-1 inline-block rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-cream">
                        −{p.savedPct}%
                      </span>
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={add}
          className="mt-6 w-full rounded-full bg-ink text-cream px-6 py-4 text-base font-bold hover:opacity-85 transition-opacity"
        >
          Agregar al pedido · ${pack.price.toFixed(2)}
        </button>

        <p className="mt-3 text-center text-sm text-ink-soft">
          {pack.saved > 0
            ? `Te ahorras $${pack.saved.toFixed(2)} frente a comprarlos sueltos.`
            : "Sin compromiso: el pedido se confirma por WhatsApp."}
        </p>
      </section>

      {/* El botón que sigue a la página. Va sobre el fondo con su propio
          contenedor para respetar la franja de gestos del teléfono, y se
          esconde con el carrito abierto: ahí el pedido ya está armándose y el
          botón no ofrece nada que el carrito no haga mejor. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 ${
          barVisible && !isOpen ? "translate-y-0" : "translate-y-[130%]"
        }`}
      >
        <div className="mx-auto max-w-md rounded-full bg-ink text-cream shadow-2xl shadow-ink/30 flex items-center gap-3 p-1.5 pl-5">
          {totalItems > 0 && (
            <button
              type="button"
              onClick={openCart}
              aria-label={`Ver mi pedido (${totalItems})`}
              className="relative -ml-3 w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-cream/10"
            >
              <ShoppingBag className="w-5 h-5" aria-hidden="true" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-mani-bg text-ink text-[11px] font-bold flex items-center justify-center px-1">
                {totalItems}
              </span>
            </button>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[11px] leading-tight text-cream/70 truncate">
              {pack.title} · ${pack.perJar.toFixed(2)} c/u
            </p>
            <p className="font-display font-700 text-lg leading-tight">
              ${pack.price.toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            onClick={add}
            className="shrink-0 rounded-full bg-mani-bg text-ink px-6 py-3 text-sm font-bold hover:brightness-105 transition-[filter]"
          >
            Lo quiero
          </button>
        </div>
      </div>
    </>
  );
}
