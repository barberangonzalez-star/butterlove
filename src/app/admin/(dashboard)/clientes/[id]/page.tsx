import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MapPin,
  MessageCircle,
  AtSign,
  StickyNote,
} from "lucide-react";
import { getCustomerWithStats } from "@/lib/customers-data";
import { getSales, type Sale } from "@/lib/sales-data";
import { formatPhone, whatsappLink } from "@/lib/customers";
import CustomerActions from "../CustomerActions";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

function deliveryLabel(sale: Sale) {
  if (sale.deliveryMethod === "Envío nacional") {
    return `Nacional · ${sale.deliveryProvider ?? "—"}`;
  }
  if (sale.deliveryMethod === "Delivery") {
    return `Delivery · ${sale.deliveryProvider ?? "—"}`;
  }
  return "Pickup";
}

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [customer, sales] = await Promise.all([
    getCustomerWithStats(id),
    getSales({ customerId: id }),
  ]);
  if (!customer) notFound();

  const { stats } = customer;
  const avgTicket = stats.orders > 0 ? stats.totalUsd / stats.orders : 0;
  const wa = whatsappLink(customer.phone);
  // Lo que valen los productos que se llevó, que no tiene por qué ser lo que
  // pagó: las ventas se ajustan a mano por descuentos y se les suma el
  // delivery. Cuando no cuadran, la ficha lo dice en vez de dejar dos números
  // que se contradicen.
  const productsValue = stats.byProduct.reduce((sum, p) => sum + p.totalUsd, 0);
  const valueDiffers = Math.abs(productsValue - stats.totalUsd) >= 0.01;
  const address = [customer.address, customer.deliveryZone, customer.city, customer.state]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-[#787774] hover:text-[#37352f] mb-4"
      >
        <ArrowLeft size={14} /> Clientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold break-words">{customer.name}</h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {stats.firstPurchase
              ? `Cliente desde ${stats.firstPurchase}`
              : "Todavía sin compras registradas"}
          </p>
        </div>
        <CustomerActions customer={customer} orders={stats.orders} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] items-start">
        <div className="space-y-4">
          <Card title="Contacto">
            {customer.phone ? (
              <Row icon={<MessageCircle size={14} />}>
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-2"
                  >
                    {formatPhone(customer.phone)}
                  </a>
                ) : (
                  formatPhone(customer.phone)
                )}
              </Row>
            ) : null}
            {customer.email && (
              <Row icon={<Mail size={14} />}>
                <a
                  href={`mailto:${customer.email}`}
                  className="hover:underline underline-offset-2 break-all"
                >
                  {customer.email}
                </a>
              </Row>
            )}
            {customer.instagram && (
              <Row icon={<AtSign size={14} />}>
                <a
                  href={`https://instagram.com/${customer.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline underline-offset-2"
                >
                  @{customer.instagram}
                </a>
              </Row>
            )}
            {!customer.phone && !customer.email && !customer.instagram && (
              <p className="text-sm text-[#787774]">Sin datos de contacto.</p>
            )}
          </Card>

          <Card title="Ubicación">
            {address ? (
              <Row icon={<MapPin size={14} />}>{address}</Row>
            ) : (
              <p className="text-sm text-[#787774]">Sin ubicación guardada.</p>
            )}
            {customer.deliveryZone && (
              <p className="text-xs text-[#787774] mt-1">
                Zona de delivery: {customer.deliveryZone}
              </p>
            )}
          </Card>

          {customer.notes && (
            <Card title="Notas">
              <Row icon={<StickyNote size={14} />}>
                <span className="whitespace-pre-wrap">{customer.notes}</span>
              </Row>
            </Card>
          )}
        </div>

        <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Stat label="Total gastado" value={fmtUsd(stats.totalUsd)} />
            <Stat label="Compras" value={String(stats.orders)} />
            <Stat label="Frascos" value={String(stats.jars)} />
            <Stat label="Ticket promedio" value={fmtUsd(avgTicket)} />
          </div>

          <Card title="Qué compra">
            {stats.byProduct.length > 0 ? (
              <ul className="space-y-2.5">
                {stats.byProduct.map((entry) => {
                  // La barra se mide contra el producto que más compra, no
                  // contra el total: así se ve la diferencia entre el favorito
                  // y el resto aunque compre diez sabores.
                  const share =
                    (entry.quantity / stats.byProduct[0].quantity) * 100;
                  return (
                    <li key={entry.productName}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="truncate">{entry.productName}</span>
                        <span className="shrink-0 text-[#5f5e5b] tabular-nums">
                          {entry.quantity} frasco{entry.quantity === 1 ? "" : "s"} ·{" "}
                          {fmtUsd(entry.totalUsd)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#37352f]"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {stats.byProduct.length > 0 && valueDiffers ? (
              <p className="text-xs text-[#787774] mt-3 pt-3 border-t border-black/5">
                Suma {fmtUsd(productsValue)} en productos contra{" "}
                {fmtUsd(stats.totalUsd)} cobrados: la diferencia son los
                descuentos y el delivery de sus ventas.
              </p>
            ) : null}

            {stats.byProduct.length === 0 ? (
              <p className="text-sm text-[#787774]">
                Cuando le registres una venta, aquí aparece qué se lleva y cuánto.
              </p>
            ) : null}
          </Card>

          <Card title={`Historial · ${sales.length} compra${sales.length === 1 ? "" : "s"}`}>
            {sales.length > 0 ? (
              <ul className="divide-y divide-black/5 -my-1">
                {sales.map((sale) => (
                  <li key={sale.id} className="py-3 first:pt-1 last:pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-[#787774]">{sale.saleDate}</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {sale.items.map((item) => (
                            <li key={item.id} className="text-sm">
                              {item.productName}{" "}
                              <span className="text-[#787774]">
                                {item.grams}g × {item.quantity}
                              </span>
                              {item.promotionLabel && (
                                <span className="ml-1.5 text-[11px] bg-green-50 text-green-800 px-1.5 py-0.5 rounded-full">
                                  {item.promotionLabel}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-[#787774] mt-1">
                          {sale.paymentMethod ?? "Pago —"} · {deliveryLabel(sale)}
                          {sale.deliveryState ? ` · ${sale.deliveryState}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold text-sm tabular-nums">
                        {fmtUsd(Number(sale.amountUsd))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#787774]">
                Sin compras registradas todavía.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-start gap-2 text-sm text-[#37352f] py-0.5">
      <span className="shrink-0 mt-0.5 text-[#787774]">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/10 rounded-lg bg-white p-4">
      <p className="text-xs font-medium text-[#787774] uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold truncate">{value}</p>
    </div>
  );
}
