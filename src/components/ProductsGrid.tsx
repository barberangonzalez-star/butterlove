import { products } from "@/lib/products";
import ProductCard from "./ProductCard";

export default function ProductsGrid() {
  return (
    <section id="productos" className="mx-auto max-w-6xl px-5 sm:px-8 py-16 sm:py-24">
      <div className="text-center max-w-xl mx-auto mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-mani-accent">
          Nuestras mantequillas
        </span>
        <h2 className="font-display font-700 text-3xl sm:text-4xl mt-3">
          Cuatro sabores, cero relleno
        </h2>
        <p className="text-ink-soft mt-3">
          Elige tamaño y agrega al pedido. Confirmamos por WhatsApp.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {products.map((p) => (
          <ProductCard key={p.key} product={p} />
        ))}
      </div>
    </section>
  );
}
