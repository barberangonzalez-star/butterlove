"use client";

import { useCart, CartItem } from "@/lib/cart-context";
import { getProduct } from "@/lib/products";
import { WHATSAPP_NUMBER, PAYMENT_METHODS } from "@/lib/config";

function buildWhatsAppMessage(items: CartItem[], total: number) {
  const lines = items.map((i) => {
    const name = getProduct(i.key).name;
    return `• ${name} ${i.grams}g x${i.qty} — $${(i.price * i.qty).toFixed(2)}`;
  });
  const text = [
    "¡Hola Butter Love! 👋 Quiero hacer este pedido:",
    "",
    ...lines,
    "",
    `Total: $${total.toFixed(2)}`,
    "",
    `Método de pago: (Pago Móvil / USD / Binance)`,
    "Nombre:",
    "Dirección o punto de entrega:",
  ].join("\n");
  return text;
}

export default function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQty,
    removeItem,
    totalPrice,
    totalItems,
  } = useCart();

  const message = buildWhatsAppMessage(items, totalPrice);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 bg-ink/30 backdrop-blur-sm z-50 transition-opacity ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-cream z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-ink/10">
          <h2 className="font-display font-700 text-xl">
            Tu pedido {totalItems > 0 && `(${totalItems})`}
          </h2>
          <button
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink/5"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-ink-soft">Tu carrito está vacío.</p>
              <p className="text-ink-soft text-sm mt-1">
                Elige una mantequilla y agrégala aquí.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const product = getProduct(item.key);
                return (
                  <li
                    key={`${item.key}-${item.grams}`}
                    className={`rounded-2xl ${product.bgClass} p-4 flex gap-3 items-center`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-xs text-ink-soft">{item.grams}g</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() =>
                            updateQty(item.key, item.grams, item.qty - 1)
                          }
                          className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-sm"
                        >
                          −
                        </button>
                        <span className="text-sm w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() =>
                            updateQty(item.key, item.grams, item.qty + 1)
                          }
                          className="w-7 h-7 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-700">
                        ${(item.price * item.qty).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeItem(item.key, item.grams)}
                        className="text-xs text-ink-soft hover:text-mani-accent mt-2"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-5 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-ink-soft text-sm">Total</span>
              <span className="font-display font-700 text-2xl">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-ink-soft">
              Pago disponible por {PAYMENT_METHODS.join(", ")}. Confirmamos
              método y entrega por WhatsApp.
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-full bg-[#25D366] text-white font-semibold py-3 hover:opacity-90 transition-opacity"
            >
              Confirmar pedido por WhatsApp
            </a>
          </div>
        )}
      </aside>
    </>
  );
}
