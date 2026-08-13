import { getAdminProducts } from "@/lib/products-data";
import { getSizeCosts } from "@/lib/costs-data";
import { getSupplyItems } from "@/lib/inventory-data";
import ProductsAdminClient from "./ProductsAdminClient";

export default async function ProductosAdminPage() {
  const [products, costs, supplies] = await Promise.all([
    getAdminProducts(),
    getSizeCosts(),
    getSupplyItems(),
  ]);

  const costList = [...costs.values()];
  const withoutCost = costList.filter((c) => !c.known).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Productos</h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {products.length} producto{products.length !== 1 ? "s" : ""} en el
            catálogo
            {withoutCost > 0 &&
              ` · ${withoutCost} tamaño${withoutCost === 1 ? "" : "s"} sin costo`}
            .
          </p>
        </div>
      </div>
      <ProductsAdminClient
        products={products}
        costs={costList}
        supplies={supplies}
      />
    </div>
  );
}
