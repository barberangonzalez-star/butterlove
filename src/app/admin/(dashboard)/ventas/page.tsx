import { getSaleMonths, getSales } from "@/lib/sales-data";
import { getAdminProducts } from "@/lib/products-data";
import { getPromotions } from "@/lib/promotions-data";
import { getCustomers, toCustomerChoice } from "@/lib/customers-data";
import { getWholesaleUnitPrices } from "@/lib/wholesale-data";
import { isSaleChannel } from "@/lib/config";
import BcvConverterWidget from "../_components/BcvConverterWidget";
import SalesFilters, { type MonthOption } from "./SalesFilters";
import VentasAdminClient from "./VentasAdminClient";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** Primer y último día de un mes "YYYY-MM", en fechas ISO. */
function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(lastDay)}` };
}

// El label se arma en el servidor: si se formateara en el cliente, el locale
// del navegador podría no coincidir y rompería la hidratación.
function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });
}

export default async function VentasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    month?: string;
    productId?: string;
    channel?: string;
  }>;
}) {
  const { from, to, month, productId, channel } = await searchParams;
  const validChannel = isSaleChannel(channel) ? channel : undefined;

  const validMonth = month && MONTH_RE.test(month) ? month : undefined;
  // El mes manda sobre el rango: el formulario nunca deja mandar los dos juntos.
  const range = validMonth
    ? monthBounds(validMonth)
    : { from: from || undefined, to: to || undefined };

  const [sales, products, promotions, saleMonths, customers, wholesalePrices] =
    await Promise.all([
      getSales({
        from: range.from,
        to: range.to,
        productId: productId ? Number(productId) : undefined,
        channel: validChannel,
      }),
      getAdminProducts(),
      getPromotions(),
      getSaleMonths(),
      getCustomers(),
      getWholesaleUnitPrices(),
    ]);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthValues = [
    ...new Set([currentMonth, ...saleMonths, ...(validMonth ? [validMonth] : [])]),
  ].sort((a, b) => b.localeCompare(a));

  const months: MonthOption[] = monthValues.map((value) => ({
    value,
    label: monthLabel(value),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Ventas</h1>

      {/* El conversor sólo se pone al lado a partir de 2xl: por debajo le quitaría
          a la tabla el ancho que necesita y la obligaría a scroll horizontal. */}
      <div className="grid 2xl:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="min-w-0">
          <SalesFilters
            from={validMonth ? undefined : from}
            to={validMonth ? undefined : to}
            month={validMonth}
            productId={productId}
            channel={validChannel}
            products={products}
            months={months}
          />

          <VentasAdminClient
            sales={sales}
            products={products}
            promotions={promotions}
            customers={customers.map(toCustomerChoice)}
            wholesalePrices={wholesalePrices}
          />
        </div>

        <BcvConverterWidget />
      </div>
    </div>
  );
}
