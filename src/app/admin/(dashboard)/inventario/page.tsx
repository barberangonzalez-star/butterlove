import { getAdminProducts } from "@/lib/products-data";
import { getSupplyItems } from "@/lib/inventory-data";
import ProductStockClient from "./ProductStockClient";
import SupplyItemsClient from "./SupplyItemsClient";

export default async function InventarioAdminPage() {
  const [products, supplyItems] = await Promise.all([
    getAdminProducts(),
    getSupplyItems(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold mb-1">Inventario</h1>
        <p className="text-sm text-[#787774]">
          El stock de productos se descuenta automáticamente al registrar una venta.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[#787774] uppercase tracking-wide mb-3">
          Stock de productos
        </h2>
        <ProductStockClient products={products} />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-[#787774] uppercase tracking-wide mb-3">
          Insumos (etiquetas, frascos, tapas...)
        </h2>
        <SupplyItemsClient items={supplyItems} />
      </section>
    </div>
  );
}
