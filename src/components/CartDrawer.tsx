"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useCart, CartItem } from "@/lib/cart-context";
import { useProducts } from "@/lib/products-context";
import { Product, productTitle, sizeLabel } from "@/lib/products";
import {
  trackCheckoutStep,
  trackInitiateCheckout,
  type CheckoutStep,
} from "@/lib/pixel";
import {
  WHATSAPP_NUMBER,
  PAYMENT_METHODS,
  PAGO_MOVIL,
  BINANCE,
  DELIVERY_ZONES,
  NATIONAL_COURIERS,
} from "@/lib/config";

type Step = "cart" | "info" | "payment" | "summary";

type DeliveryMethod = "pickup" | "delivery" | "nacional";

/**
 * Las tres maneras de recibir, con la línea que las distingue.
 *
 * Van en una lista de arriba abajo y no en botones de una fila: "Envío
 * nacional" no cabe en un tercio del ancho de la gaveta sin partirse, y la
 * diferencia entre las tres no está en el nombre sino en lo que cuestan y en
 * quién las lleva. Esa es la duda que el cliente trae, así que se contesta
 * antes de que elija y no después.
 */
const DELIVERY_OPTIONS: {
  value: DeliveryMethod;
  label: string;
  hint: string;
}[] = [
  {
    value: "delivery",
    label: "Delivery en Caracas",
    hint: "Te lo llevamos. El costo depende de tu zona.",
  },
  {
    value: "pickup",
    label: "Pickup",
    hint: "Nos encontramos en un punto acordado. Sin costo.",
  },
  {
    value: "nacional",
    label: "Envío nacional",
    hint: `Por encomienda: ${NATIONAL_COURIERS.join(", ")}. El flete lo pagas al retirar.`,
  },
];

const METHODS_REQUIRING_PROOF = ["Pago Móvil", "Binance"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs font-semibold text-ink-soft hover:text-ink underline underline-offset-2"
    >
      {copied ? "¡Copiado!" : "Copiar"}
    </button>
  );
}

function useBcvRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bcv-rate")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setRate(json.usd?.rate ?? null);
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
  products,
  subtotal,
  deliveryCost,
  total,
  deliveryMethod,
  zone,
  name,
  phone,
  address,
  courier,
  idCard,
  agency,
  paymentMethod,
  paymentConfirmed,
  bsTotal,
}: {
  items: CartItem[];
  products: Product[];
  subtotal: number;
  deliveryCost: number;
  total: number;
  deliveryMethod: DeliveryMethod;
  zone: string;
  name: string;
  phone: string;
  address: string;
  courier: string;
  idCard: string;
  agency: string;
  paymentMethod: string;
  paymentConfirmed: boolean;
  bsTotal: number | null;
}) {
  const lines = items.map((i) => {
    const product = products.find((p) => p.key === i.key);
    const label = product ? productTitle(product) : i.key;
    const size = product ? sizeLabel(product, i) : `${i.grams}g`;
    return `• ${label} ${size} x${i.qty}: $${(i.price * i.qty).toFixed(2)}`;
  });

  let paymentLine = `Método de pago: ${paymentMethod}`;
  if (paymentMethod === "Pago Móvil" && bsTotal) {
    paymentLine += ` - Total en Bs: Bs. ${bsTotal.toLocaleString("es-VE", {
      maximumFractionDigits: 2,
    })}`;
  }
  if (paymentMethod === "Binance") {
    paymentLine += ` - Total en USDT: ${total.toFixed(2)} USDT`;
  }
  const paymentLines = [paymentLine];

  const greeting =
    METHODS_REQUIRING_PROOF.includes(paymentMethod) && paymentConfirmed
      ? `¡Hola Butter Love! 👋 Ya realicé el pago por ${paymentMethod}. 📎 Aquí adjunto mi comprobante. Este es mi pedido:`
      : "¡Hola Butter Love! 👋 Quiero hacer este pedido:";

  const isDelivery = deliveryMethod === "delivery";
  const isNacional = deliveryMethod === "nacional";

  // Con pickup y con encomienda no hay costo extra, así que el desglose solo
  // estorba: el flete nacional lo cobra la empresa al retirar, no nosotros.
  const totalLines = isDelivery
    ? [
        `Subtotal: $${subtotal.toFixed(2)}`,
        `Delivery (${zone}): $${deliveryCost.toFixed(2)}`,
        `Total: $${total.toFixed(2)}`,
      ]
    : [`Total: $${total.toFixed(2)}`];

  // Los datos de la encomienda van juntos y rotulados uno por línea: es lo que
  // hay que copiar tal cual en el formulario de la empresa, y buscarlo suelto
  // entre el resto del pedido es donde se cometen los errores de despacho.
  if (isNacional) {
    return [
      greeting,
      "",
      ...lines,
      "",
      ...totalLines,
      "",
      ...paymentLines,
      "",
      `Entrega: Envío nacional — ${courier}`,
      "Flete: por cobrar en destino",
      "",
      "DATOS DE QUIEN RECIBE",
      `Nombre completo: ${name}`,
      `Cédula: ${idCard}`,
      `Celular: ${phone}`,
      `Agencia: ${agency}`,
    ].join("\n");
  }

  const deliveryLines = isDelivery
    ? [
        `Entrega: Delivery — ${zone}`,
        `Dirección: ${address}`,
        "📍 Te envío mi ubicación GPS por aquí mismo.",
      ]
    : ["Entrega: Pickup / punto de encuentro", `Punto de entrega: ${address}`];

  return [
    greeting,
    "",
    ...lines,
    "",
    ...totalLines,
    "",
    ...paymentLines,
    "",
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    ...deliveryLines,
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
  const products = useProducts();

  const [step, setStep] = useState<Step>("cart");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryMethod, setDeliveryMethod] =
    useState<DeliveryMethod>("delivery");
  const [zoneName, setZoneName] = useState("");
  // Los de la encomienda viven aparte y no reusan `address`: si compartieran
  // campo, cambiar de opción para comparar precios dejaría la dirección de la
  // casa metida donde va la agencia.
  const [courier, setCourier] = useState(NATIONAL_COURIERS[0] ?? "");
  const [idCard, setIdCard] = useState("");
  const [agency, setAgency] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const { rate: bcvRate, loading: bcvLoading } = useBcvRate();

  const handleClose = () => {
    closeCart();
    setStep("cart");
  };

  const selectPaymentMethod = (method: string) => {
    setPaymentMethod(method);
    setPaymentConfirmed(false);
  };

  const isDelivery = deliveryMethod === "delivery";
  const isNacional = deliveryMethod === "nacional";
  const zone = DELIVERY_ZONES.find((z) => z.name === zoneName) ?? null;
  const deliveryCost = isDelivery && zone ? zone.price : 0;
  const grandTotal = totalPrice + deliveryCost;

  /**
   * Avanzar al siguiente paso, avisándole a GA4 y a Meta. Los botones de
   * "Atrás" siguen llamando a `setStep` pelado: volver sobre un paso ya hecho
   * no es progreso, y contarlo inflaría el embudo con gente que sólo estaba
   * corrigiendo un dato.
   */
  const goToStep = (next: CheckoutStep) => {
    trackCheckoutStep(next, items, grandTotal);
    setStep(next);
  };

  const bsTotal = bcvRate ? grandTotal * bcvRate : null;
  // Cada manera de recibir pide lo suyo: la encomienda no necesita dirección
  // de casa pero sí cédula y agencia, y sin esos dos datos la empresa no
  // despacha. Pedirlos acá evita el ida y vuelta por WhatsApp.
  const infoComplete = isNacional
    ? Boolean(
        name.trim() && phone.trim() && idCard.trim() && agency.trim() && courier
      )
    : Boolean(
        name.trim() && phone.trim() && address.trim() && (!isDelivery || zone)
      );
  const requiresProof =
    paymentMethod !== null && METHODS_REQUIRING_PROOF.includes(paymentMethod);
  const canConfirmPayment = Boolean(
    paymentMethod && (!requiresProof || paymentConfirmed)
  );

  const message = buildWhatsAppMessage({
    items,
    products,
    subtotal: totalPrice,
    deliveryCost,
    total: grandTotal,
    deliveryMethod,
    zone: zone?.name ?? "",
    name,
    phone,
    address,
    courier,
    idCard,
    agency,
    paymentMethod: paymentMethod ?? "",
    paymentConfirmed,
    bsTotal,
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
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-page z-50 shadow-2xl transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-6 h-16 border-b border-ink/10">
          <h2 className="font-display font-700 text-xl">
            {step === "cart" &&
              `Tu pedido${totalItems > 0 ? ` (${totalItems})` : ""}`}
            {step === "info" && "Entrega y datos"}
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
                  const product = products.find((p) => p.key === item.key);
                  return (
                    <li
                      key={`${item.key}-${item.grams}`}
                      className={`rounded-2xl ${product?.bgClass ?? "bg-surface"} p-4 flex gap-3 items-center`}
                    >
                      <div className="flex-1">
                        <p className="font-semibold">
                          {product ? productTitle(product) : item.key}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {product ? sizeLabel(product, item) : `${item.grams}g`}
                        </p>
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
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  ¿Cómo lo recibes?
                </span>
                <div className="mt-1.5 space-y-2">
                  {DELIVERY_OPTIONS.map((option) => {
                    const selected = deliveryMethod === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setDeliveryMethod(option.value)}
                        aria-pressed={selected}
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          selected
                            ? "bg-ink text-cream border-ink"
                            : "bg-surface border-ink/15 text-ink hover:border-ink/40"
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {option.label}
                        </span>
                        <span
                          className={`block text-xs mt-0.5 ${
                            selected ? "text-cream/70" : "text-ink-soft"
                          }`}
                        >
                          {option.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isDelivery && (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Zona de entrega
                  </span>
                  <select
                    value={zoneName}
                    onChange={(e) => setZoneName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                  >
                    <option value="">Selecciona tu zona...</option>
                    {DELIVERY_ZONES.map((z) => (
                      <option key={z.name} value={z.name}>
                        {z.name} — ${z.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-xs text-ink-soft">
                    {zone
                      ? `Se suman $${zone.price.toFixed(2)} de delivery a tu total.`
                      : "El costo del delivery se suma al total de tu pedido."}
                  </span>
                </label>
              )}

              {isNacional && (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Empresa de encomienda
                  </span>
                  <select
                    value={courier}
                    onChange={(e) => setCourier(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                  >
                    {NATIONAL_COURIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1.5 block text-xs text-ink-soft">
                    El flete no va en este total: lo pagas en la agencia al
                    retirar el paquete.
                  </span>
                </label>
              )}

              {/* Con encomienda, el que compra y el que recibe muchas veces no
                  son la misma persona, y la empresa despacha contra los datos
                  del que retira. El rótulo lo dice para que nadie ponga los
                  suyos por costumbre. */}
              {isNacional && (
                <p className="pt-1 text-xs font-bold uppercase tracking-wide text-ink">
                  Datos de quien recibe
                </p>
              )}

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {isNacional ? "Nombre completo" : "Nombre"}
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  type="text"
                  autoComplete="name"
                  placeholder={
                    isNacional
                      ? "Como aparece en la cédula"
                      : "Tu nombre completo"
                  }
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                />
              </label>

              {isNacional && (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Cédula
                  </span>
                  <input
                    value={idCard}
                    onChange={(e) => setIdCard(e.target.value)}
                    type="text"
                    inputMode="numeric"
                    placeholder="V-12345678"
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                  />
                  <span className="mt-1.5 block text-xs text-ink-soft">
                    La empresa la pide para entregar el paquete.
                  </span>
                </label>
              )}

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {isNacional ? "Celular" : "Teléfono"}
                </span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="04XX-XXXXXXX"
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40"
                />
              </label>

              {isNacional ? (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Agencia de destino
                  </span>
                  <textarea
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    rows={3}
                    placeholder={`Ciudad, estado y agencia de ${courier} donde vas a retirar. Ej: Maracaibo, Zulia — agencia Bella Vista.`}
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40 resize-none"
                  />
                  <span className="mt-1.5 block text-xs text-ink-soft">
                    Si no sabes cuál te queda cerca, escribe tu ciudad y la
                    buscamos contigo por WhatsApp.
                  </span>
                </label>
              ) : (
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    {isDelivery ? "Dirección de entrega" : "Punto de encuentro"}
                  </span>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder={
                      isDelivery
                        ? "Calle, edificio o quinta, piso/apto y punto de referencia..."
                        : "¿Dónde te queda cómodo encontrarnos?"
                    }
                    className="mt-1 w-full rounded-xl border border-ink/15 bg-surface px-4 py-2.5 text-sm outline-none focus:border-ink/40 resize-none"
                  />
                </label>
              )}

              {isDelivery && (
                <div className="rounded-xl bg-surface border border-ink/10 px-4 py-3 text-sm">
                  <p className="font-semibold text-ink">
                    📍 Importante: envíanos tu ubicación GPS
                  </p>
                  <p className="text-ink-soft text-xs mt-1">
                    Al terminar el pedido en WhatsApp, adjunta tu ubicación
                    (Adjuntar → Ubicación) para que el delivery llegue sin
                    vueltas. Sin la ubicación no podemos despachar.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === "payment" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface px-4 py-3 text-sm text-ink-soft">
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
                    onClick={() => selectPaymentMethod(method)}
                    className={`w-full text-left rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                      paymentMethod === method
                        ? "bg-ink text-cream border-ink"
                        : "bg-surface border-ink/15 text-ink hover:border-ink/40"
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
                        {(grandTotal * bcvRate).toLocaleString("es-VE", {
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                  )}
                  <div className="rounded-xl bg-surface border border-ink/10 px-4 py-3 text-sm space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Datos para Pago Móvil
                      </p>
                      <CopyButton
                        text={`${PAGO_MOVIL.bank} - ${PAGO_MOVIL.phone} - CI/RIF ${PAGO_MOVIL.id}`}
                      />
                    </div>
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
                  <div className="flex flex-col items-center gap-2">
                    <Image
                      src="/pago-movil-qr.jpeg"
                      alt="Código QR para pagar por Pago Móvil"
                      width={320}
                      height={419}
                      className="w-full max-w-[320px] h-auto rounded-xl border border-ink/10"
                    />
                    <p className="text-xs text-ink-soft">
                      Escanea el QR desde tu app bancaria para pagar
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "Binance" && (
                <div className="space-y-3">
                  <p className="text-sm text-ink-soft">
                    Total a pagar:{" "}
                    <span className="font-display font-700 text-ink">
                      {grandTotal.toFixed(2)} USDT
                    </span>
                  </p>
                  <div className="rounded-xl bg-surface border border-ink/10 px-4 py-3 text-sm space-y-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                        Datos para Binance Pay
                      </p>
                      <CopyButton text={BINANCE.email} />
                    </div>
                    <p>
                      <span className="text-ink-soft">Correo:</span>{" "}
                      {BINANCE.email}
                    </p>
                  </div>
                </div>
              )}

              {requiresProof && (
                <label className="flex items-start gap-2 rounded-xl bg-surface border border-ink/15 px-4 py-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentConfirmed}
                    onChange={(e) => setPaymentConfirmed(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Ya realicé el pago y tengo mi comprobante listo para
                    adjuntar en WhatsApp.
                  </span>
                </label>
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
                    const product = products.find((p) => p.key === item.key);
                    return (
                      <li
                        key={`${item.key}-${item.grams}`}
                        className="flex justify-between gap-3"
                      >
                        <span>
                          {product ? productTitle(product) : item.key}{" "}
                          {product
                            ? sizeLabel(product, item)
                            : `${item.grams}g`}{" "}
                          x{item.qty}
                        </span>
                        <span>${(item.price * item.qty).toFixed(2)}</span>
                      </li>
                    );
                  })}
                  {deliveryCost > 0 && (
                    <li className="flex justify-between gap-3">
                      <span>Delivery — {zone?.name}</span>
                      <span>${deliveryCost.toFixed(2)}</span>
                    </li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-1">
                  Entrega
                </p>
                <p>
                  {isNacional
                    ? `Envío nacional — ${courier}`
                    : isDelivery
                      ? `Delivery — ${zone?.name}`
                      : "Pickup / punto de encuentro"}
                </p>
                <p className="text-ink-soft">
                  {isNacional ? agency : address}
                </p>
                {isDelivery && (
                  <p className="text-ink-soft mt-1">
                    📍 Recuerda enviarnos tu ubicación GPS por WhatsApp.
                  </p>
                )}
                {isNacional && (
                  <p className="text-ink-soft mt-1">
                    El flete lo pagas en la agencia al retirar.
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft mb-1">
                  {isNacional ? "Quien recibe" : "Datos"}
                </p>
                <p>{name}</p>
                {isNacional && <p className="text-ink-soft">CI {idCard}</p>}
                <p>{phone}</p>
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
                {paymentMethod === "Binance" && (
                  <p className="text-ink-soft">
                    {grandTotal.toFixed(2)} USDT · {BINANCE.email}
                  </p>
                )}
                {requiresProof && (
                  <p className="text-ink-soft mt-1">
                    {paymentConfirmed
                      ? "✅ Pago confirmado — recuerda adjuntar tu comprobante en WhatsApp."
                      : "⚠️ Aún no confirmaste el pago."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-ink/10 px-6 py-5 space-y-3">
            {deliveryCost > 0 && (
              <div className="space-y-0.5 text-sm text-ink-soft">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="truncate">Delivery · {zone?.name}</span>
                  <span className="shrink-0">${deliveryCost.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between items-baseline">
              <span className="text-ink-soft text-sm">Total</span>
              <span className="font-display font-700 text-2xl">
                ${grandTotal.toFixed(2)}
              </span>
            </div>

            {step === "cart" && (
              <button
                onClick={() => goToStep("info")}
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
                  onClick={() => goToStep("payment")}
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
                  onClick={() => goToStep("summary")}
                  disabled={!canConfirmPayment}
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
                  onClick={() => trackInitiateCheckout(items, grandTotal)}
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
