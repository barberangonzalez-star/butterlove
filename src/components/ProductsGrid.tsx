import { products } from "@/lib/products";
import ProductCard from "./ProductCard";

export default function ProductsGrid() {
  return (
    <section id="productos" className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-20">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <h2 className="font-display font-700 text-4xl sm:text-5xl text-ink">
          Productos
        </h2>
        <p className="text-ink-soft max-w-xs text-sm">
          Toca el ícono <span className="font-bold">i</span> en cada frasco
          para ver ingredientes. Elige tamaño y agrega al pedido.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((p) => (
          <ProductCard key={p.key} product={p} />
        ))}
      </div>
    </section>
  );
}
