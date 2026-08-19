import { getProducts } from "@/lib/products-data";
import ProductCard from "./ProductCard";

export default async function ProductsGrid() {
  const products = await getProducts();

  return (
    <section id="productos" className="px-3 sm:px-5 py-16 sm:py-20">
      <h2 className="font-display font-700 text-4xl sm:text-5xl text-ink mb-10">
        Productos
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p) => (
          <ProductCard key={p.key} product={p} />
        ))}
      </div>
    </section>
  );
}
