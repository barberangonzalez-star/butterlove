import { Clock, MessageCircle } from "lucide-react";
import { formatPhone, whatsappLink } from "@/lib/customers";
import type { PendingOrder } from "@/lib/pending-orders-data";
import PendingOrderActions from "./PendingOrderActions";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

/**
 * Cuándo entró, en hora de Caracas y no en la del servidor, que corre en UTC.
 * Se formatea acá, en el servidor, para que el locale del navegador no cambie
 * el texto y rompa la hidratación.
 */
function whenLabel(date: Date) {
  return date.toLocaleString("es-VE", {
    timeZone: "America/Caracas",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function entrega(order: PendingOrder) {
  if (order.deliveryMethod === "Envío nacional") {
    return `Envío nacional · ${order.courier ?? "—"}${
      order.agency ? ` · ${order.agency}` : ""
    }`;
  }
  if (order.deliveryMethod === "Delivery") {
    return `Delivery · ${order.deliveryZone ?? "zona sin definir"}`;
  }
  return "Pickup";
}

/**
 * Los pedidos que entraron por la tienda y todavía no son ventas.
 *
 * Va arriba de todo y con su propio color: es lo único de la página que pide
 * una decisión ahora —verificar que el cliente pagó y confirmar, o borrar—.
 * Mientras esté acá no cuenta en ningún total: ni en el del mes, ni en
 * Finanzas, ni en el historial del cliente.
 */
export default function PendingOrdersPanel({
  orders,
}: {
  orders: PendingOrder[];
}) {
  if (orders.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={15} className="text-[#b4700a]" />
        <h2 className="text-sm font-semibold text-[#37352f]">
          Pedidos por confirmar
          <span className="ml-1.5 text-xs font-normal text-[#787774]">
            ({orders.length})
          </span>
        </h2>
      </div>
      <p className="text-xs text-[#787774] mb-3">
        Entraron por la tienda. Verifica el pago y confirma: ahí se registran
        como venta y se descuenta el stock. Mientras tanto no cuentan en ningún
        total.
      </p>

      <div className="space-y-2">
        {orders.map((order) => {
          const wa = whatsappLink(order.customerPhone);
          const amount = fmtUsd(Number(order.amountUsd));
          const fee = order.deliveryFeeUsd ? Number(order.deliveryFeeUsd) : 0;

          return (
            <div
              key={order.id}
              className="border border-[#b4700a]/25 bg-[#fdf8f0] rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <ul className="space-y-0.5">
                    {order.items.map((item, i) => (
                      <li key={`${item.key}-${item.grams}-${i}`} className="text-sm">
                        <span className="font-medium">{item.name}</span>{" "}
                        <span className="text-[#787774]">
                          × {item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-sm">{amount}</p>
                  {fee > 0 && (
                    <p className="text-xs text-[#787774]">
                      incluye {fmtUsd(fee)} de envío
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-2.5 text-sm space-y-0.5">
                <p className="font-medium break-words">
                  {order.customerName ?? "Sin nombre"}
                  {order.customerPhone && (
                    <>
                      {" · "}
                      {wa ? (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-normal underline underline-offset-2"
                        >
                          <MessageCircle size={12} />
                          {formatPhone(order.customerPhone)}
                        </a>
                      ) : (
                        <span className="font-normal">
                          {formatPhone(order.customerPhone)}
                        </span>
                      )}
                    </>
                  )}
                </p>
                <p className="text-xs text-[#5f5e5b]">{entrega(order)}</p>
                {order.address && (
                  <p className="text-xs text-[#5f5e5b] break-words">
                    {order.address}
                  </p>
                )}
                {order.idCard && (
                  <p className="text-xs text-[#5f5e5b]">C.I. {order.idCard}</p>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {order.paymentMethod && (
                  <span className="text-[11px] bg-black/5 text-[#5f5e5b] px-2 py-0.5 rounded-full">
                    {order.paymentMethod}
                  </span>
                )}
                {/* Lo dice el cliente, no el banco: por eso hay que confirmar. */}
                {order.paymentClaimed && (
                  <span className="text-[11px] bg-[#b4700a]/10 text-[#b4700a] px-2 py-0.5 rounded-full">
                    Dice que ya pagó
                  </span>
                )}
                <span className="text-[11px] text-[#787774]">
                  {whenLabel(order.createdAt)}
                </span>
              </div>

              <div className="mt-3">
                <PendingOrderActions id={order.id} amount={amount} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
