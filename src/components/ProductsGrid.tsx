import { getProducts } from "@/lib/products-data";
import ProductCard from "./ProductCard";

export default async function ProductsGrid() {
  const products = await getProducts();

  return (
    <section id="productos" className="mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-20">
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <h2 className="font-display font-700 text-4xl sm:text-5xl text-ink">
          Productos
        </h2>
        <p className="text-ink-soft max-w-xs text-sm">
          Toca un frasco para abrir su ficha completa, o el ícono{" "}
          <span className="font-bold">i</span> para ver los ingredientes sin
          salir de aquí.
        </p>
      </div>
      {/* Tres por fila y no cuatro: con cuatro, el renglón del pie —nombre,
          precio y botón— no alcanza para "Mantequilla de Almendras $12.99" y
          el nombre se parte en dos. De paso el frasco se ve más grande. */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <ProductCard key={p.key} product={p} />
        ))}
      </div>
    </section>
  );
}
