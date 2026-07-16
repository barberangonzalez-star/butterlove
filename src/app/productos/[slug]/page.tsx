import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/lib/products";
import ProductPurchase from "@/components/ProductPurchase";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.key === slug);
  if (!product) return {};

  return {
    title: `Mantequilla de ${product.name} | Butter Love`,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.key === slug);
  if (!product) notFound();

  return (
    <>
      <section className="px-3 sm:px-5 pt-4">
        <div className="relative overflow-hidden torn-card min-h-[320px] sm:min-h-[420px] flex flex-col">
          <Image
            src={product.heroImage}
            alt={`Butter Love ${product.name} — mantequilla artesanal`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/10" />
          <div className="relative flex-1 flex flex-col justify-end px-6 sm:px-10 pb-8 pt-10">
            <Link
              href="/#productos"
              className="text-xs font-bold uppercase tracking-widest text-white/80 mb-2 w-fit hover:text-white transition-colors"
            >
              ← Volver a productos
            </Link>
            <h1 className="font-display font-700 text-3xl sm:text-5xl text-white max-w-lg drop-shadow">
              Mantequilla de {product.name}
            </h1>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8 py-12 sm:py-16 grid md:grid-cols-2 gap-10">
        <div
          className={`torn-card ${product.bgClass} p-8 flex items-center justify-center`}
        >
          <div className="relative w-full aspect-square max-w-xs">
            <Image
              src={product.image}
              alt={`Mantequilla de ${product.name} Butter Love`}
              fill
              sizes="(max-width: 768px) 90vw, 400px"
              className="object-contain drop-shadow-xl"
            />
          </div>
        </div>

        <div>
          <p className="text-ink-soft mb-6">{product.tagline}</p>

          <ProductPurchase product={product} />

          <div className="mt-10 pt-8 border-t border-ink/10">
            <h2 className="font-display font-700 text-2xl text-ink mb-4">
              Más información
            </h2>
            <p className="text-ink-soft leading-relaxed mb-4">
              {product.description}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {product.badges.map((b) => (
                <span
                  key={b}
                  className="bg-white text-ink text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border border-ink/10"
                >
                  {b}
                </span>
              ))}
            </div>
            <p className="text-sm text-ink-soft">
              Todos nuestros productos son sin azúcar y están hechos de forma
              artesanal, en tandas pequeñas, sin atajos.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
