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
  const withoutRecipe = costList.filter((c) => !c.hasRecipe).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Productos</h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {products.length} producto{products.length !== 1 ? "s" : ""} en el
            catálogo
            {withoutRecipe > 0 &&
              ` · ${withoutRecipe} tamaño${withoutRecipe === 1 ? "" : "s"} sin receta`}
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
