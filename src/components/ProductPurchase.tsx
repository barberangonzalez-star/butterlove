"use client";

import { useEffect, useState } from "react";
import { Product, productTitle, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { trackViewContent } from "@/lib/pixel";
import { DELIVERY_METHODS, PAYMENT_METHODS } from "@/lib/config";

/**
 * La zona de compra: precio, tamaño, cantidad y el botón.
 *
 * No vive dentro de una caja a propósito. Encerrarla sumaba un marco alrededor
 * de cosas que ya son marcos —cada tamaño es un botón, la cantidad otro— y el
 * resultado era una caja con cajas adentro. Lo que la separa del texto de al
 * lado es la columna y el aire, no un borde.
 */
export default function ProductPurchase({ product }: { product: Product }) {
  const [sizeIdx, setSizeIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const size = product.sizes[sizeIdx];
  const multiSize = product.sizes.length > 1;
  const subtotal = size.price * qty;

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

      {multiSize ? (
        <div className="mt-6">
          <p className="text-sm text-ink-soft mb-2">Tamaño</p>
          {/* Cada opción muestra su propio precio: así se comparan sin tener
              que tocarlas una por una. */}
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s, i) => (
              <button
                key={s.grams}
                onClick={() => setSizeIdx(i)}
                aria-pressed={i === sizeIdx}
                className={`rounded-full px-4 py-2 text-sm transition-colors ${
                  i === sizeIdx
                    ? "bg-ink text-cream"
                    : "text-ink-soft ring-1 ring-ink/15 hover:ring-ink/40"
                }`}
              >
                <span className="font-semibold">{sizeLabel(product, s)}</span>
                <span
                  className={i === sizeIdx ? "text-cream/70" : "text-ink-soft"}
                >
                  {" "}
                  ${s.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">
          Presentación de {sizeLabel(product, size)}
        </p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <span className="text-sm text-ink-soft">Cantidad</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty === 1}
            aria-label="Quitar uno"
            className="w-9 h-9 rounded-full text-xl leading-none text-ink hover:bg-ink/5 disabled:opacity-25 disabled:hover:bg-transparent"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="w-6 text-center text-base font-semibold tabular-nums"
          >
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Agregar uno"
            className="w-9 h-9 rounded-full text-xl leading-none text-ink hover:bg-ink/5"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => addItem(product.key, size.grams, size.price, qty)}
        className="mt-6 w-full rounded-full bg-ink text-cream px-6 py-3.5 text-base font-semibold hover:opacity-85 transition-opacity"
      >
        Agregar al pedido
        {qty > 1 && ` · $${subtotal.toFixed(2)}`}
      </button>

      {/* Cómo llega y cómo se paga. Sale de la misma configuración que usa el
          checkout, para que no se prometa acá un método que allá no existe. */}
      <dl className="mt-6 pt-5 border-t border-ink/10 space-y-2 text-sm">
        <div className="flex gap-3">
          <dt className="text-ink-soft shrink-0 w-20">Entrega</dt>
          <dd className="text-ink">{DELIVERY_METHODS.join(" · ")}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-ink-soft shrink-0 w-20">Pago</dt>
          <dd className="text-ink">{PAYMENT_METHODS.join(" · ")}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-ink-soft shrink-0 w-20">Hecho</dt>
          <dd className="text-ink">A mano, en tandas pequeñas</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        El pedido se confirma por WhatsApp: allí se acuerda la entrega y se
        envían los datos de pago.
      </p>
    </div>
  );
}
