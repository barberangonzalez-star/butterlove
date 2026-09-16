/**
 * El texto de una cotización, tal como se pega en el chat del cliente.
 *
 * Vive aparte porque lo arman dos sitios: el cotizador, donde se hace a
 * clics, y el asistente del panel, donde se pide hablando. Si cada uno tuviera
 * su versión, tarde o temprano una diría los bolívares y la otra no, o pondrían
 * distinta la cuenta de Pago Móvil, y el cliente recibiría dos formatos según
 * por dónde se le cotizó.
 *
 * No toca la base ni el catálogo: recibe las líneas ya resueltas y sólo
 * escribe. Por eso corre igual en el navegador y en el servidor.
 */
import { PAGO_MOVIL_ACCOUNTS, type PagoMovilAccount } from "./config";

export interface QuoteLine {
  /** "Mantequilla de Maní". */
  label: string;
  /** "230g", como lo nombra `sizeLabel`. */
  size: string;
  quantity: number;
  /** Lo que se cobra por frasco, ya con cualquier precio a mano aplicado. */
  unitPrice: number;
}

export interface QuoteDelivery {
  /** "Altamira", "Retiro en tienda", "Envío nacional". */
  label: string;
  /** Null es "a coordinar", que no es lo mismo que gratis. */
  price: number | null;
  /** Si se nombra solo o se rotula como delivery de una zona. */
  standalone: boolean;
}

export interface QuoteInput {
  lines: QuoteLine[];
  delivery: QuoteDelivery | null;
  /** Sin tasa la cotización va sólo en dólares, sin inventar la conversión. */
  bcvRate: number | null;
  /** La cuenta que se muestra para pagar, o null para no mostrar ninguna. */
  account: PagoMovilAccount | null;
}

export interface Quote {
  subtotal: number;
  deliveryPrice: number | null;
  total: number;
  /** Vacío si no hay ninguna línea: no hay nada que cotizar. */
  text: string;
}

export const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

export const fmtBs = (n: number) =>
  n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** La cuenta por su banco, o la que cobra la tienda si no se nombra ninguna. */
export function quoteAccount(bank?: string | null): PagoMovilAccount | null {
  if (!bank) return null;
  return PAGO_MOVIL_ACCOUNTS.find((account) => account.bank === bank) ?? null;
}

export function buildQuote({
  lines,
  delivery,
  bcvRate,
  account,
}: QuoteInput): Quote {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const deliveryPrice = delivery?.price ?? null;
  const total = subtotal + (deliveryPrice ?? 0);

  if (lines.length === 0) {
    return { subtotal, deliveryPrice, total, text: "" };
  }

  const bs = (amount: number) =>
    bcvRate ? ` (Bs. ${fmtBs(amount * bcvRate)})` : "";

  const out = [
    "🧈 Cotización Butter Love",
    "",
    ...lines.map((line) => {
      const lineTotal = line.unitPrice * line.quantity;
      return `• ${line.label} ${line.size} x${line.quantity}: ${fmtUsd(lineTotal)}${bs(lineTotal)}`;
    }),
  ];

  if (delivery) {
    // El retiro y el envío nacional se nombran solos; una zona va rotulada como
    // delivery, para que se lea a qué corresponde el monto.
    const label = delivery.standalone
      ? delivery.label
      : `Delivery (${delivery.label})`;
    out.push(
      "",
      delivery.price === null
        ? `${label}: a coordinar`
        : `${label}: ${fmtUsd(delivery.price)}${bs(delivery.price)}`,
    );
  } else {
    out.push("");
  }

  out.push(`Total: ${fmtUsd(total)}${bs(total)}`);

  if (bcvRate) {
    out.push("", `Tasa BCV: Bs. ${fmtBs(bcvRate)}`);
  }

  if (account) {
    out.push("", "💳 Pago Móvil", account.bank, `CI ${account.id}`, account.phone);
  }

  return { subtotal, deliveryPrice, total, text: out.join("\n") };
}
