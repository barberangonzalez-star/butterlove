"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShoppingBag, Truck, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { productTitle } from "@/lib/products";
import { trackViewContent } from "@/lib/pixel";
import { LANDING_FREE_DELIVERY } from "@/lib/config";
import { UNIT_KEY, type Pack, type Upsell } from "../packs";
import { usePromoClock } from "./usePromoClock";

/** Cuántos frascos se dibujan como mucho; el resto se cuenta con un número. */
const MAX_JARS_DRAWN = 3;

/**
 * Los combos y el botón flotante, en un mismo componente.
 *
 * Están juntos porque comparten una sola cosa: cuál pack está elegido. El
 * botón de abajo no es otro botón —es el mismo pedido, siguiéndote por la
 * página—, y con el estado acá no hace falta un contexto para dos vecinos.
 */
export default function PromoBuy({
  packs,
  upsells,
}: {
  packs: Pack[];
  upsells: Upsell[];
}) {
  const { addItem, openCart, totalItems, isOpen, items, setPromo } = useCart();
  const remaining = usePromoClock();
  const expired = remaining !== null && remaining <= 0;
  const [upsellOpen, setUpsellOpen] = useState(false);
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

  // Le avisa a Meta que alguien está viendo la promo. Se reporta el pack
  // destacado, que es la oferta con la que abre la página; los demás se
  // reportan solos cuando se agregan al pedido.
  useEffect(() => {
    const shown = packs.find((p) => p.featured) ?? packs[0];
    if (!shown) return;
    trackViewContent({
      key: shown.product.key,
      grams: shown.grams,
      name: productTitle(shown.product),
      price: shown.price,
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

  // Se acabó la hora: los combos dejan de ofrecerse. Lo que ya estaba en el
  // pedido se respeta —se armó a tiempo— y se puede terminar.
  if (expired) {
    return (
      <section id="combos" className="px-4 py-14 sm:py-20 scroll-mt-4">
        <div className="rounded-[34px] bg-surface px-6 py-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
            Promo terminada
          </p>
          <h2 className="mt-2 font-display font-700 text-3xl text-ink">
            Tu hora de promo se acabó
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Los precios de combo eran por una hora desde que llegaste. La
            mantequilla de maní sigue en la tienda, a su precio de siempre.
          </p>
          {totalItems > 0 && (
            <button
              type="button"
              onClick={openCart}
              className="mt-6 w-full rounded-full bg-ink text-cream px-6 py-4 font-bold hover:opacity-85 transition-opacity"
            >
              Terminar mi pedido
            </button>
          )}
          <Link
            href={`/productos/${UNIT_KEY}`}
            className={`mt-3 block w-full rounded-full px-6 py-4 font-bold transition-opacity ${
              totalItems > 0
                ? "ring-1 ring-ink/20 text-ink hover:bg-ink/5"
                : "bg-ink text-cream hover:opacity-85"
            }`}
          >
            Ver en la tienda
          </Link>
        </div>
      </section>
    );
  }

  /**
   * Mete el combo al pedido, con lo que se haya sumado de la oferta. La marca
   * de promo es la que le dice al checkout que este pedido tiene el delivery
   * gratis en las zonas de la landing.
   */
  const addPack = (extras: Upsell[] = []) => {
    setPromo(LANDING_FREE_DELIVERY.id);
    addItem(pack.product.key, pack.grams, pack.price, 1);
    for (const extra of extras) {
      addItem(extra.product.key, extra.grams, extra.price, 1);
    }
  };

  // La oferta sale una vez por pedido: si ya se llevó uno de los agregados, o
  // no hay ninguno disponible, el botón agrega directo.
  const alreadyUpsold = items.some((i) => upsells.some((u) => u.key === i.key));
  const add = () => {
    if (upsells.length === 0 || alreadyUpsold) addPack();
    else setUpsellOpen(true);
  };

  return (
    <>
      <section id="combos" className="px-4 py-14 sm:py-20 scroll-mt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Elige tu combo
        </p>
        <h2 className="font-display font-700 text-3xl sm:text-4xl text-ink mt-2">
          Mientras más frascos, más ahorras
        </h2>

        {/* El delivery gratis va justo antes de elegir, porque es lo que
            inclina la balanza en ese momento. "Delivery gratis" manda, pero
            las zonas van nombradas en el mismo bloque y no en letra chica:
            quien vive en otra zona tiene que saberlo antes del checkout, no
            descubrirlo ahí. */}
        <div className="mt-6 flex items-center gap-3 rounded-3xl bg-merey-bg px-4 py-3.5">
          <span className="shrink-0 w-11 h-11 rounded-full bg-white/80 flex items-center justify-center">
            <Truck className="w-5 h-5 text-ink" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm text-ink leading-snug">
            <span className="block font-display font-700 text-lg leading-tight">
              Delivery gratis con tu pedido
            </span>
            Sólo en{" "}
            <span className="font-semibold">
              {new Intl.ListFormat("es", { type: "conjunction" }).format(
                LANDING_FREE_DELIVERY.zones,
              )}
            </span>
            .
          </p>
        </div>

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
                  {Array.from({ length: Math.min(p.jars, MAX_JARS_DRAWN) }).map(
                    (_, i) => (
                      <Image
                        key={i}
                        src="/products/mani.webp"
                        alt=""
                        aria-hidden="true"
                        width={72}
                        height={72}
                        className="w-11 h-11 sm:w-14 sm:h-14 object-contain drop-shadow"
                      />
                    ),
                  )}
                  {/* Seis frascos dibujados no caben en el teléfono: se
                      dibujan tres y el resto lo dice el número. */}
                  {p.jars > MAX_JARS_DRAWN && (
                    <span className="relative z-10 ml-1 self-center rounded-full bg-ink px-1.5 py-0.5 text-[11px] font-bold text-cream">
                      ×{p.jars / MAX_JARS_DRAWN}
                    </span>
                  )}
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

      {upsellOpen && (
        <UpsellSheet
          pack={pack}
          upsells={upsells}
          onClose={() => setUpsellOpen(false)}
          onConfirm={(extras) => {
            setUpsellOpen(false);
            addPack(extras);
          }}
        />
      )}
    </>
  );
}

/**
 * La oferta de sumar otro sabor, entre el botón y el carrito.
 *
 * Es una hoja que sube desde abajo y no un modal centrado: en el teléfono los
 * botones quedan al alcance del pulgar. Sin marcar nada, el botón agrega sólo
 * el combo —la oferta no puede ser un obstáculo entre el cliente y lo que ya
 * eligió—; cerrar la hoja no agrega nada, para quien se arrepintió.
 */
function UpsellSheet({
  pack,
  upsells,
  onClose,
  onConfirm,
}: {
  pack: Pack;
  upsells: Upsell[];
  onClose: () => void;
  onConfirm: (extras: Upsell[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const extras = upsells.filter((u) => picked.includes(u.key));
  const total = pack.price + extras.reduce((sum, u) => sum + u.price, 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (key: string) =>
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-titulo"
        className="relative w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-page px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-ink-soft hover:bg-ink/5"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <p className="text-xs font-bold uppercase tracking-widest text-ink-soft">
          Sólo con tu combo
        </p>
        <h2
          id="upsell-titulo"
          className="mt-1 pr-10 font-display font-700 text-2xl text-ink"
        >
          ¿Le sumamos otro sabor?
        </h2>

        <div className="mt-5 space-y-3">
          {upsells.map((u) => {
            const on = picked.includes(u.key);
            return (
              <button
                key={u.key}
                type="button"
                onClick={() => toggle(u.key)}
                aria-pressed={on}
                className={`w-full rounded-3xl p-3 flex items-center gap-3 text-left transition-colors ${
                  on
                    ? "bg-surface ring-2 ring-ink"
                    : "ring-1 ring-ink/15 hover:ring-ink/35"
                }`}
              >
                <Image
                  src={u.product.image}
                  alt=""
                  aria-hidden="true"
                  width={64}
                  height={64}
                  className="w-14 h-14 shrink-0 rounded-2xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-700 text-ink">
                    {u.name}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    <span className="font-semibold text-ink">
                      ${u.price.toFixed(2)}
                    </span>{" "}
                    <span className="line-through">
                      ${u.regularPrice.toFixed(2)}
                    </span>
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
                    on ? "bg-ink text-cream" : "ring-1 ring-ink/25"
                  }`}
                >
                  {on && <Check className="w-4 h-4" />}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onConfirm(extras)}
          className="mt-6 w-full rounded-full bg-ink text-cream px-6 py-4 text-base font-bold hover:opacity-85 transition-opacity"
        >
          {extras.length > 0
            ? `Agregar todo · $${total.toFixed(2)}`
            : `Sólo el combo · $${pack.price.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
