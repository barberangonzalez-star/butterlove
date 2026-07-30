import { getSales } from "@/lib/sales-data";
import { getAdminProducts } from "@/lib/products-data";
import { getPromotions } from "@/lib/promotions-data";
import BcvConverterWidget from "../_components/BcvConverterWidget";
import VentasAdminClient from "./VentasAdminClient";

export default async function VentasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; productId?: string }>;
}) {
  const { from, to, productId } = await searchParams;

  const [sales, products, promotions] = await Promise.all([
    getSales({
      from: from || undefined,
      to: to || undefined,
      productId: productId ? Number(productId) : undefined,
    }),
    getAdminProducts(),
    getPromotions(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Ventas</h1>

      <div className="grid md:grid-cols-[1fr_260px] gap-6 items-start">
        <div>
          <form method="get" className="flex flex-wrap items-end gap-3 mb-4">
            <label className="block">
              <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
                Desde
              </span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="mt-1 block rounded-md border border-black/15 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
                Hasta
              </span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="mt-1 block rounded-md border border-black/15 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
                Producto
              </span>
              <select
                name="productId"
                defaultValue={productId ?? ""}
                className="mt-1 block rounded-md border border-black/15 px-3 py-1.5 text-sm min-w-[160px]"
              >
                <option value="">Todos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-md border border-black/15 px-3.5 py-1.5 text-sm font-medium hover:bg-black/5"
            >
              Filtrar
            </button>
            {(from || to || productId) && (
              <a
                href="/admin/ventas"
                className="text-sm text-[#787774] hover:text-[#37352f] px-2 py-1.5"
              >
                Limpiar
              </a>
            )}
          </form>

          <VentasAdminClient sales={sales} products={products} promotions={promotions} />
        </div>

        <BcvConverterWidget />
      </div>
    </div>
  );
}
