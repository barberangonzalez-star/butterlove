import { getAdminProducts } from "@/lib/products-data";
import ProductsAdminClient from "./ProductsAdminClient";

export default async function ProductosAdminPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Productos</h1>
          <p className="text-sm text-[#787774] mt-0.5">
            {products.length} producto{products.length !== 1 ? "s" : ""} en el
            catálogo.
          </p>
        </div>
      </div>
      <ProductsAdminClient products={products} />
    </div>
  );
}
