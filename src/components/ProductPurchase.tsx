"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  HandHeart,
  Minus,
  Plus,
  ShoppingBag,
  Truck,
  Wallet,
} from "lucide-react";
import { Product, isCombo, productTitle, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { useProducts } from "@/lib/products-context";
import { comboSavings } from "@/lib/combo-components";
import { trackViewContent } from "@/lib/pixel";
import {
  DELIVERY_METHODS,
  DELIVERY_ZONES,
  NATIONAL_COURIERS,
  PAYMENT_METHODS,
  hasFreeShipping,
} from "@/lib/config";

/**
 * El delivery más barato de la lista de zonas. Se calcula y no se escribe a
 * mano para que, si cambian las tarifas en la configuración, el "desde" de la
 * ficha cambie con ellas.
 */
const MIN_DELIVERY = Math.min(...DELIVERY_ZONES.map((z) => z.price));

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
  const freeShipping = hasFreeShipping([product.key]);

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

  // "Agregar" deja seguir mirando y confirma en el mismo botón; "Comprar
  // ahora" agrega y abre el pedido. Antes había uno solo y abría siempre, y
  // quien quería llevar dos sabores tenía que cerrar la gaveta para seguir.
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(timer);
  }, [added]);

  const add = () => {
    addItem(product.key, size.grams, size.price, qty, { open: false });
    setAdded(true);
  };
  const buyNow = () => addItem(product.key, size.grams, size.price, qty);

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

      {/* Lo que cuesta que llegue, pegado al precio. Sin esto el delivery
          aparecía recién en el segundo paso del pedido, y un costo que no se
          esperaba ahí es una razón para cerrar la pestaña. */}
      {freeShipping ? (
        <FreeShippingBadge />
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
          <Truck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            Delivery en Caracas desde ${MIN_DELIVERY.toFixed(2)} · Pickup gratis
          </span>
        </p>
      )}

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
        // Una sola presentación, pero dicha como opción elegida y no como
        // nota al pie: así se lee qué se está comprando de un vistazo.
        <div className="mt-6">
          <p className="text-sm text-ink-soft mb-2">Tamaño</p>
          <span className="inline-flex rounded-full bg-ink text-cream px-5 py-2.5 text-base font-semibold">
            {sizeLabel(product, size)}
          </span>
        </div>
      )}

      {product.soldOut ? (
        // Sold out: no quantity and no buy buttons, a red notice in their
        // place. The rest of the page stays, so it still reads as a product
        // that will be back.
        <div className="mt-6 rounded-2xl border-2 border-red-600 bg-red-50 px-5 py-4 text-center">
          <p className="font-display font-700 text-2xl uppercase tracking-wider text-red-600">
            Agotado
          </p>
          <p className="mt-1 text-sm text-ink">
            Se nos acabó por ahora. Pronto vuelve a estar disponible.
          </p>
        </div>
      ) : (
      <>
      <div className="mt-6 flex items-center gap-3">
        {/* Botones de 44px: es lo que mide un dedo, y el de "quitar" queda al
            lado del de "agregar" sin que se toque el equivocado. */}
        <div
          role="group"
          aria-label="Cantidad"
          className="flex shrink-0 items-center gap-1 rounded-full ring-1 ring-ink/15 p-1"
        >
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

        <button
          onClick={add}
          className="flex-1 min-w-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full ring-1 ring-ink text-ink px-3 py-3.5 text-sm font-semibold hover:bg-ink/5 transition-colors"
        >
          {added ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              Agregado
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4 lg:hidden" aria-hidden="true" />
              Agregar al pedido
            </>
          )}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {added ? "Agregado al pedido" : ""}
      </span>

      <button
        ref={ctaRef}
        onClick={buyNow}
        className="mt-3 w-full rounded-full bg-ink text-cream px-6 py-4 text-base font-semibold hover:opacity-85 transition-opacity"
      >
        Comprar ahora
        {qty > 1 && ` · $${subtotal.toFixed(2)}`}
      </button>

      <BuyBar visible={scrolledPast} onAdd={buyNow} subtotal={subtotal} qty={qty} />
      </>
      )}

      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Se confirma por WhatsApp: allí se acuerda la entrega y se envían los
        datos de pago. No se paga nada en el sitio.
      </p>

      {/* Cómo llega y cómo se paga. Sale de la misma configuración que usa el
          checkout, para que no se prometa acá un método que allá no existe.
          En el teléfono esto mismo va más abajo, en las secciones que se
          despliegan (`ProductMoreInfo`): acá empujaba la descripción fuera de
          la pantalla. */}
      <dl className="hidden lg:block mt-6 pt-5 border-t border-ink/10 space-y-3 text-sm">
        <Detail icon={<Truck className="w-4 h-4" aria-hidden="true" />} label="Entrega">
          {DELIVERY_METHODS.join(" · ")}
          <span className="block text-ink-soft">
            Encomiendas: {NATIONAL_COURIERS.join(", ")}
          </span>
          {freeShipping && (
            <span className="block font-semibold">
              Envío incluido si el pedido es sólo de este producto: delivery y
              encomienda van por nuestra cuenta.
            </span>
          )}
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

/**
 * The free-shipping badge that replaces the delivery line for products that
 * ship free. It pops in once and then keeps a gentle loop — the van rocking and
 * a sheen crossing the pill — so it catches the eye next to the price without
 * pulling attention away from the buy button. Users who ask for reduced motion
 * get it static, through the global rule in globals.css.
 */
function FreeShippingBadge() {
  return (
    <div className="mt-3 animate-badge-pop">
      <p className="relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-ink py-2 pl-3 pr-4 text-cream shadow-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cream/25 to-transparent animate-badge-sheen"
        />
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/15">
          <Truck className="w-4 h-4 animate-truck-drive" aria-hidden="true" />
        </span>
        <span className="text-sm leading-tight">
          <span className="block font-display font-700 text-base">
            ¡Envío gratis!
          </span>
          <span className="block text-cream/80">
            A toda Venezuela y delivery en Caracas
          </span>
        </span>
      </p>
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
          Comprar ahora
        </button>
      </div>
    </div>
  );
}
