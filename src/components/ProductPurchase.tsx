"use client";

import { useEffect, useRef, useState } from "react";
import { HandHeart, Minus, Plus, Truck, Wallet } from "lucide-react";
import { Product, isCombo, productTitle, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useProducts } from "@/lib/products-context";
import { comboSavings } from "@/lib/combo-components";
import { trackViewContent } from "@/lib/pixel";
import { DELIVERY_METHODS, PAYMENT_METHODS } from "@/lib/config";

/**
 * La zona de compra: precio, tamaño, cantidad y el botón.
 *
 * No vive dentro de una caja a propósito. Encerrarla sumaba un marco alrededor
 * de cosas que ya son marcos —cada tamaño es un botón, la cantidad otro— y el
 * resultado era una caja con cajas adentro. Lo que la separa del texto de al
 * lado es la columna y el aire, no un borde.
 *
 * En el teléfono, además, sale una barra fija abajo cuando el botón se va de
 * pantalla: en pantalla ancha la columna de compra queda pegada al scroll y
 * siempre está a la vista, y abajo no había nada equivalente —había que subir
 * a buscar el botón, que es justo el momento en que la gente abandona.
 */
export default function ProductPurchase({ product }: { product: Product }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const scrolledPast = useScrolledPast(ctaRef);
  const { addItem } = useCart();
  const catalog = useProducts();
  const size = product.sizes[sizeIdx];
  const multiSize = product.sizes.length > 1;
  const subtotal = size.price * qty;
  const saved = isCombo(product) ? comboSavings(product, catalog) : 0;

  // El tamaño que más rinde. Entre 230g y 350g la diferencia por gramo es de
  // un cuarto del precio, y en la ficha eso no se ve: son dos números sueltos
  // que hay que dividir de cabeza. Se marca sólo si la diferencia es real.
  const perGram = product.sizes.map((s) => s.price / s.grams);
  const bestIdx = perGram.indexOf(Math.min(...perGram));
  const showBest =
    multiSize && Math.max(...perGram) / perGram[bestIdx] > 1.03;

  // Le avisa a Meta que alguien está viendo este producto. Se reporta el
  // tamaño que trae elegido la página, no el que la persona vaya tocando:
  // el evento es "vio el producto", y probar tamaños no es verlo de nuevo.
  useEffect(() => {
    const first = product.sizes[0];
    trackViewContent({
      key: product.key,
      grams: first.grams,
      name: productTitle(product),
      price: first.price,
    });
  }, [product]);

  const add = () => addItem(product.key, size.grams, size.price, qty);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display font-700 text-4xl text-ink">
          ${size.price.toFixed(2)}
        </span>
        <span className="text-sm text-ink-soft">
          / {sizeLabel(product, size)}
        </span>
      </div>

      {saved > 0 && (
        <p className="mt-2 inline-flex items-center rounded-full bg-mani-bg/40 px-3 py-1 text-sm font-semibold text-ink">
          Ahorras ${saved.toFixed(2)} contra comprarlos por separado
        </p>
      )}

      {multiSize ? (
        <fieldset className="mt-6">
          <legend className="text-sm text-ink-soft mb-2">Tamaño</legend>
          {/* Uno al lado del otro y del mismo alto: los dos precios se comparan
              sin tocar nada, y el renglón de abajo dice cuál rinde más. */}
          <div className="grid grid-cols-2 gap-2">
            {product.sizes.map((s, i) => (
              <button
                key={s.grams}
                onClick={() => setSizeIdx(i)}
                aria-pressed={i === sizeIdx}
                className={`rounded-2xl px-3 py-3 text-left transition-colors ${
                  i === sizeIdx
                    ? "bg-ink text-cream"
                    : "ring-1 ring-ink/15 text-ink hover:ring-ink/40"
                }`}
              >
                <span className="block font-display font-700 text-base">
                  {sizeLabel(product, s)}
                </span>
                <span className="block text-sm">${s.price.toFixed(2)}</span>
                {showBest && i === bestIdx && (
                  <span
                    className={`block text-xs mt-0.5 ${
                      i === sizeIdx ? "text-cream/75" : "text-ink-soft"
                    }`}
                  >
                    Rinde más por tu dinero
                  </span>
                )}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Presentación de {sizeLabel(product, size)}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-sm text-ink-soft">Cantidad</span>
        {/* Botones de 44px: es lo que mide un dedo, y el de "quitar" queda al
            lado del de "agregar" sin que se toque el equivocado. */}
        <div className="flex items-center gap-1 rounded-full ring-1 ring-ink/15 p-1">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty === 1}
            aria-label="Quitar uno"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-ink/5 disabled:opacity-25 disabled:hover:bg-transparent"
          >
            <Minus className="w-4 h-4" aria-hidden="true" />
          </button>
          <span
            aria-live="polite"
            className="w-8 text-center text-base font-semibold tabular-nums"
          >
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Agregar uno"
            className="w-11 h-11 rounded-full flex items-center justify-center text-ink hover:bg-ink/5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        ref={ctaRef}
        onClick={add}
        className="mt-6 w-full rounded-full bg-ink text-cream px-6 py-4 text-base font-semibold hover:opacity-85 transition-opacity"
      >
        Agregar al pedido
        {qty > 1 && ` · $${subtotal.toFixed(2)}`}
      </button>

      <BuyBar visible={scrolledPast} onAdd={add} subtotal={subtotal} qty={qty} />

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Se confirma por WhatsApp: allí se acuerda la entrega y se envían los
        datos de pago. No se paga nada en el sitio.
      </p>

      {/* Cómo llega y cómo se paga. Sale de la misma configuración que usa el
          checkout, para que no se prometa acá un método que allá no existe. */}
      <dl className="mt-6 pt-5 border-t border-ink/10 space-y-3 text-sm">
        <Detail icon={<Truck className="w-4 h-4" aria-hidden="true" />} label="Entrega">
          {DELIVERY_METHODS.join(" · ")}
        </Detail>
        <Detail icon={<Wallet className="w-4 h-4" aria-hidden="true" />} label="Pago">
          {PAYMENT_METHODS.join(" · ")}
        </Detail>
        <Detail
          icon={<HandHeart className="w-4 h-4" aria-hidden="true" />}
          label="Hecho"
        >
          A mano, en tandas pequeñas
        </Detail>
      </dl>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <dt className="flex items-center gap-2 text-ink-soft shrink-0 w-24">
        {icon}
        {label}
      </dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

/**
 * Si el elemento quedó por encima de la pantalla, es decir, si ya se pasó de
 * largo. No alcanza con "no está a la vista": al abrir la ficha el botón de
 * comprar todavía está más abajo del pliegue, y sacar la barra ahí es apurar a
 * alguien que no vio ni la foto.
 *
 * Mide en cada scroll y no con un `IntersectionObserver`, que sería lo natural
 * para "¿se ve?": el observador sólo avisa cuando cambia la respuesta, y acá
 * el botón pasa de "no se ve porque está abajo" a "no se ve porque está
 * arriba" —la misma respuesta— así que llegando de golpe a media página
 * (volver atrás, un enlace con ancla) no avisaba nunca. Una medición por
 * cuadro mientras se arrastra es barata y no se pierde ninguna.
 */
function useScrolledPast(ref: React.RefObject<HTMLElement | null>) {
  const [past, setPast] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      setPast(el.getBoundingClientRect().bottom < 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref]);

  return past;
}

/**
 * El botón de comprar, repetido abajo en el teléfono.
 *
 * En pantalla ancha la columna de compra queda pegada al scroll y siempre está
 * a la vista; abajo no había nada equivalente y había que subir a buscar el
 * botón, que es justo el momento en que la gente abandona.
 */
function BuyBar({
  visible,
  onAdd,
  subtotal,
  qty,
}: {
  visible: boolean;
  onAdd: () => void;
  subtotal: number;
  qty: number;
}) {
  return (
    <div
      // `translate` y no `hidden`: así entra deslizándose desde abajo en vez
      // de aparecer de golpe tapando lo que se estaba leyendo.
      className={`lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-page/95 backdrop-blur transition-transform duration-200 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0">
          <p className="font-display font-700 text-xl text-ink leading-none">
            ${subtotal.toFixed(2)}
          </p>
          {qty > 1 && (
            <p className="text-xs text-ink-soft mt-1">{qty} frascos</p>
          )}
        </div>
        <button
          onClick={onAdd}
          tabIndex={visible ? 0 : -1}
          className="flex-1 rounded-full bg-ink text-cream px-6 py-3.5 text-base font-semibold hover:opacity-85 transition-opacity"
        >
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}
