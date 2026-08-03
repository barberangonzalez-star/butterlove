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

      {/* El conversor sólo se pone al lado a partir de 2xl: por debajo le quitaría
          a la tabla el ancho que necesita y la obligaría a scroll horizontal. */}
      <div className="grid 2xl:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="min-w-0">
          <form
            method="get"
            className="grid grid-cols-2 gap-3 mb-4 sm:flex sm:flex-wrap sm:items-end"
          >
            <label className="block">
              <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
                Desde
              </span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5"
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
                className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5"
              />
            </label>
            <label className="block col-span-2 sm:col-auto">
              <span className="text-xs font-medium text-[#787774] uppercase tracking-wide">
                Producto
              </span>
              <select
                name="productId"
                defaultValue={productId ?? ""}
                className="mt-1 block w-full rounded-md border border-black/15 px-3 py-2 text-sm sm:py-1.5 sm:min-w-[160px]"
              >
                <option value="">Todos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="col-span-2 flex items-center gap-2 sm:contents">
              <button
                type="submit"
                className="flex-1 rounded-md border border-black/15 px-3.5 py-2 text-sm font-medium hover:bg-black/5 sm:flex-none sm:py-1.5"
              >
                Filtrar
              </button>
              {(from || to || productId) && (
                <a
                  href="/admin/ventas"
                  className="shrink-0 text-sm text-[#787774] hover:text-[#37352f] px-3 py-2 sm:py-1.5"
                >
                  Limpiar
                </a>
              )}
            </div>
          </form>

          <VentasAdminClient sales={sales} products={products} promotions={promotions} />
        </div>

        <BcvConverterWidget />
      </div>
    </div>
  );
}
