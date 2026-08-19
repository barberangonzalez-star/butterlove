"use client";

import { useEffect, useState } from "react";
import { Product, productTitle, sizeLabel } from "@/lib/products";
import { useCart } from "@/lib/cart-context";
import { trackViewContent } from "@/lib/pixel";
import { DELIVERY_METHODS, PAYMENT_METHODS } from "@/lib/config";

/**
 * La caja de compra de la ficha: precio, tamaño, cantidad y el botón. Vive en
 * su propia columna y se queda pegada al hacer scroll, así el precio nunca
 * queda fuera de pantalla mientras se lee el detalle del producto.
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
    <div className="rounded-3xl border border-ink/10 bg-surface p-5 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="font-display font-700 text-4xl text-ink">
          ${size.price.toFixed(2)}
        </span>
        <span className="text-sm text-ink-soft">
          / {sizeLabel(product, size)}
        </span>
      </div>

      {multiSize ? (
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
            Elige tamaño
          </p>
          {/* Cada opción muestra su propio precio, como las variantes de una
              tienda grande: así se compara sin tener que tocarlas una por una. */}
          <div className="grid grid-cols-2 gap-2">
            {product.sizes.map((s, i) => (
              <button
                key={s.grams}
                onClick={() => setSizeIdx(i)}
                aria-pressed={i === sizeIdx}
                className={`rounded-2xl border px-3 py-2 text-left transition-colors ${
                  i === sizeIdx
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/15 text-ink hover:border-ink/40"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {sizeLabel(product, s)}
                </span>
                <span
                  className={`block text-xs ${
                    i === sizeIdx ? "text-cream/80" : "text-ink-soft"
                  }`}
                >
                  ${s.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm font-semibold text-ink">
          Presentación: {sizeLabel(product, size)}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Cantidad
        </span>
        <div className="flex items-center gap-1 rounded-full border border-ink/15 p-1">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty === 1}
            aria-label="Quitar uno"
            className="w-8 h-8 rounded-full text-lg leading-none text-ink hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="w-8 text-center text-sm font-semibold tabular-nums"
          >
            {qty}
          </span>
          <button
            onClick={() => setQty((q) => q + 1)}
            aria-label="Agregar uno"
            className="w-8 h-8 rounded-full text-lg leading-none text-ink hover:bg-ink/5"
          >
            +
          </button>
        </div>
      </div>

      <button
        onClick={() => addItem(product.key, size.grams, size.price, qty)}
        className="mt-4 w-full rounded-full bg-ink text-cream px-6 py-3.5 text-sm font-semibold hover:opacity-85 transition-opacity"
      >
        Agregar al pedido
        {qty > 1 && ` · $${subtotal.toFixed(2)}`}
      </button>

      {/* Lo que en una tienda grande va debajo del botón: cómo llega y cómo se
          paga. Sale de la misma configuración que usa el checkout, para que no
          se prometa acá un método que allá no existe. */}
      <dl className="mt-5 pt-4 border-t border-ink/10 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="text-ink-soft shrink-0 w-20">Entrega</dt>
          <dd className="text-ink">{DELIVERY_METHODS.join(" · ")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-soft shrink-0 w-20">Pago</dt>
          <dd className="text-ink">{PAYMENT_METHODS.join(" · ")}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-soft shrink-0 w-20">Hecho</dt>
          <dd className="text-ink">A mano, en tandas pequeñas</dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        El pedido se confirma por WhatsApp: allí se acuerda la entrega y se
        envían los datos de pago.
      </p>
    </div>
  );
}
