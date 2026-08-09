import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts, getProduct } from "@/lib/products-data";
import { productTitle } from "@/lib/products";
import { posts, CATEGORY_LABEL, formatPostDateShort } from "@/lib/posts";
import ProductPurchase from "@/components/ProductPurchase";
import JsonLd from "@/components/JsonLd";
import { productSchema, breadcrumbSchema, OG_DEFAULTS } from "@/lib/seo";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  const title = productTitle(product);
  const url = `/productos/${product.key}`;

  return {
    title,
    description: product.description,
    alternates: { canonical: url },
    openGraph: {
      ...OG_DEFAULTS,
      type: "website",
      url,
      title: `${title} | Butter Love`,
      description: product.description,
      images: [
        {
          url: product.image,
          width: 1080,
          height: 1080,
          alt: `${title} Butter Love`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Butter Love`,
      description: product.description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const productPosts = posts.filter((p) => p.productKey === product.key);

  return (
    <>
      {/* Producto + precios por tamaño: es lo que habilita que Google muestre
          precio y disponibilidad directamente en el resultado de búsqueda. */}
      <JsonLd data={productSchema(product)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          {
            name: productTitle(product),
            path: `/productos/${product.key}`,
          },
        ])}
      />
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
              {productTitle(product)}
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
              alt={`${productTitle(product)} Butter Love`}
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

      {/* El blog ya enlaza al producto; esto cierra el camino de vuelta, para
          que Google recorra ambas secciones en lugar de tratarlas por separado. */}
      {productPosts.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 sm:px-8 pb-12 sm:pb-16">
          <h2 className="font-display font-700 text-2xl text-ink mb-5">
            Del blog: mantequilla de {product.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {productPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="torn-card bg-white/70 hover:bg-white transition-colors p-5 flex flex-col gap-2 group"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                  {CATEGORY_LABEL[post.category]} · {post.readTime} de lectura
                </span>
                <h3 className="font-display font-700 text-lg text-ink group-hover:underline">
                  {post.title}
                </h3>
                <p className="text-sm text-ink-soft flex-1">{post.excerpt}</p>
                <time
                  dateTime={post.date}
                  className="text-[11px] font-bold uppercase tracking-wide text-ink-soft"
                >
                  {formatPostDateShort(post.date)}
                </time>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
