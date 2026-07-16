"use client";

import { useEffect, useState } from "react";
import { useCart, CartItem } from "@/lib/cart-context";
import { getProduct } from "@/lib/products";
import { WHATSAPP_NUMBER, PAYMENT_METHODS, PAGO_MOVIL } from "@/lib/config";

type Step = "cart" | "info" | "payment" | "summary";

function useBcvRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bcv-rate")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setRate(json.rate ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { rate, loading };
}

function buildWhatsAppMessage({
  items,
  total,
  name,
  phone,
  address,
  paymentMethod,
  bsTotal,
  bcvRate,
}: {
  items: CartItem[];
  total: number;
  name: string;
  phone: string;
  address: string;
  paymentMethod: string;
  bsTotal: number | null;
  bcvRate: number | null;
}) {
  const lines = items.map((i) => {
    const product = getProduct(i.key);
    return `• Mantequilla de ${product.name} ${i.grams}g x${i.qty} — $${(
      i.price * i.qty
    ).toFixed(2)}`;
  });

  const paymentLines = [`Método de pago: ${paymentMethod}`];
  if (paymentMethod === "Pago Móvil" && bsTotal && bcvRate) {
    paymentLines.push(
      `Total en bolívares: Bs. ${bsTotal.toLocaleString("es-VE", {
        maximumFractionDigits: 2,
      })} (tasa BCV ${bcvRate.toLocaleString("es-VE", {
        maximumFractionDigits: 2,
      })})`,
      `Pago Móvil a: ${PAGO_MOVIL.bank} - ${PAGO_MOVIL.phone} - CI/RIF ${PAGO_MOVIL.id}`
    );
  }

  return [
    "¡Hola Butter Love! 👋 Quiero hacer este pedido:",
    "",
    ...lines,
    "",
    `Total: $${total.toFixed(2)}`,
    "",
    ...paymentLines,
    "",
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    `Dirección o punto de entrega: ${address}`,
  ].join("\n");
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

  const [step, setStep] = useState<Step>("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const { rate: bcvRate, loading: bcvLoading } = useBcvRate();

  const handleClose = () => {
    closeCart();
    setStep("cart");
  };

  const bsTotal = bcvRate ? totalPrice * bcvRate : null;
  const infoComplete = Boolean(name.trim() && phone.trim() && address.trim());

  const message = buildWhatsAppMessage({
    items,
    total: totalPrice,
    name,
    phone,
    address,
    paymentMethod: paymentMethod ?? "",
    bsTotal,
    bcvRate,
  });
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <>
      <div
        onClick={handleClose}
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
            {step === "cart" &&
              `Tu pedido${totalItems > 0 ? ` (${totalItems})` : ""}`}
            {step === "info" && "Tus datos"}
            {step === "payment" && "Método de pago"}
            {step === "summary" && "Confirmar pedido"}
          </h2>
          <button
            onClick={handleClose}
            aria-label="Cerrar carrito"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink/5"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "cart" &&
            (items.length === 0 ? (
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
                        <p className="font-semibold">
                          Mantequilla de {product.name}
                        </p>
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
                          <span className="text-sm w-4 text-center">
                            {item.qty}
                          </span>
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
                          className="text-xs text-ink-soft hover:text-ink mt-2"
                        >
                          Quitar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}

          {step === "info" && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Nombre
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  placeholder="Tu nombre completo"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Teléfono
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="04XX-XXXXXXX"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  Dirección o punto de entrega
                </span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="Urbanización, calle, referencia..."
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-ink/40 resize-none"
                />
              </label>
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-ink-soft">
                {bcvLoading ? (
                  "Cargando tasa BCV del día..."
                ) : bcvRate ? (
                  <>
                    Tasa BCV hoy:{" "}
                    <span className="font-bold text-ink">
                      Bs.{" "}
                      {bcvRate.toLocaleString("es-VE", {
                        maximumFractionDigits: 2,
                      })}
                    </span>{" "}
                    por $1
                  </>
                ) : (
                  "No pudimos obtener la tasa BCV en este momento."
                )}
              </div>

              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      paymentMethod === method
                        ? "bg-ink text-cream border-ink"
                        : "bg-white border-ink/15 text-ink hover:border-ink/40"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod === "Pago Móvil" && (
                <div className="space-y-3">
                  {bcvRate && (
                    <p className="text-sm text-ink-soft">
                      Total aproximado en bolívares:{" "}
                      <span className="font-display font-700 text-ink">
                        Bs.{" "}
                        {(totalPrice * bcvRate).toLocaleString("es-VE", {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                  )}
                  <div className="rounded-xl bg-white border border-ink/10 px-4 py-3 text-sm space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-1">
                      Datos para Pago Móvil
                    </p>
                    <p>
                      <span className="text-ink-soft">Banco:</span>{" "}
                      {PAGO_MOVIL.bank}
                    </p>
                    <p>
                      <span className="text-ink-soft">Teléfono:</span>{" "}
                      {PAGO_MOVIL.phone}
                    </p>
                    <p>
                      <span className="text-ink-soft">CI/RIF:</span>{" "}
                      {PAGO_MOVIL.id}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "summary" && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-2">
                  Pedido
                </p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const product = getProduct(item.key);
                    return (
                      <li
                        key={`${item.key}-${item.grams}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          Mantequilla de {product.name} {item.grams}g x
                          {item.qty}
                        </span>
                        <span>${(item.price * item.qty).toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-1">
                  Datos
                </p>
                <p>{name}</p>
                <p>{phone}</p>
                <p>{address}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-1">
                  Pago
                </p>
                <p>{paymentMethod}</p>
                {paymentMethod === "Pago Móvil" && (
                  <>
                    {bsTotal && (
                      <p className="text-ink-soft">
                        Bs.{" "}
                        {bsTotal.toLocaleString("es-VE", {
                          maximumFractionDigits: 2,
                        })}{" "}
                        (tasa BCV{" "}
                        {bcvRate?.toLocaleString("es-VE", {
                          maximumFractionDigits: 2,
                        })}
                        )
                      </p>
                    )}
                    <p className="text-ink-soft">
                      {PAGO_MOVIL.bank} · {PAGO_MOVIL.phone} · CI/RIF{" "}
                      {PAGO_MOVIL.id}
                    </p>
                  </>
                )}
              </div>
            </div>
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

            {step === "cart" && (
              <button
                onClick={() => setStep("info")}
                className="w-full rounded-full bg-ink text-cream font-semibold py-3 hover:opacity-90 transition-opacity"
              >
                Continuar
              </button>
            )}

            {step === "info" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("cart")}
                  className="rounded-full border border-ink/20 text-ink px-5 py-3 text-sm font-semibold hover:bg-ink/5 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep("payment")}
                  disabled={!infoComplete}
                  className="flex-1 rounded-full bg-ink text-cream font-semibold py-3 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            )}

            {step === "payment" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("info")}
                  className="rounded-full border border-ink/20 text-ink px-5 py-3 text-sm font-semibold hover:bg-ink/5 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep("summary")}
                  disabled={!paymentMethod}
                  className="flex-1 rounded-full bg-ink text-cream font-semibold py-3 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            )}

            {step === "summary" && (
              <div className="space-y-2">
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-full bg-[#25D366] text-white font-semibold py-3 hover:opacity-90 transition-opacity"
                >
                  Confirmar pedido por WhatsApp
                </a>
                <button
                  onClick={() => setStep("payment")}
                  className="w-full text-center text-xs text-ink-soft hover:text-ink"
                >
                  Volver a método de pago
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
