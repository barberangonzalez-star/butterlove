import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getProducts, getProduct } from "@/lib/products-data";
import { isCombo, productTitle, sizeLabel } from "@/lib/products";
import { comboContents, productShots } from "@/lib/product-media";
import { posts, CATEGORY_LABEL, formatPostDateShort } from "@/lib/posts";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchase from "@/components/ProductPurchase";
import RelatedProducts from "@/components/RelatedProducts";
import JsonLd from "@/components/JsonLd";
import {
  productSchema,
  breadcrumbSchema,
  SITE_NAME,
  OG_DEFAULTS,
} from "@/lib/seo";

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

  const title = productTitle(product);
  const productPosts = posts.filter((p) => p.productKey === product.key);

  // La vitrina completa: de ahí salen los frascos que arma un combo, tanto
  // para la galería como para el renglón que dice qué trae adentro.
  const catalog = await getProducts();
  const shots = productShots(product, catalog);
  const contents = comboContents(product, catalog);

  const details: [string, string][] = [
    ["Marca", SITE_NAME],
    ["Categoría", "Mantequilla de frutos secos"],
    [
      "Presentaciones",
      product.sizes.map((s) => sizeLabel(product, s)).join(" · "),
    ],
    ["Tipo", isCombo(product) ? "Combo de frascos" : "Sabor suelto"],
    ...(contents.length > 0
      ? ([["Incluye", contents.map((c) => c.label).join(" + ")]] as [
          string,
          string,
        ][])
      : []),
  ];

  return (
    <>
      {/* Producto + precios por tamaño: es lo que habilita que Google muestre
          precio y disponibilidad directamente en el resultado de búsqueda. */}
      <JsonLd data={productSchema(product)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Inicio", path: "/" },
          { name: "Productos", path: "/#productos" },
          { name: title, path: `/productos/${product.key}` },
        ])}
      />

      {/* Las mismas migas que declara el JSON-LD, pero visibles: dicen dónde
          está parada la persona y devuelven al catálogo sin el botón atrás. */}
      <nav
        aria-label="Migas de pan"
        className="mx-auto max-w-7xl px-5 sm:px-8 pt-6"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <li>
            <Link href="/" className="hover:text-ink hover:underline">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href="/#productos" className="hover:text-ink hover:underline">
              Productos
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="font-semibold text-ink" aria-current="page">
            {title}
          </li>
        </ol>
      </nav>

      {/* Tres columnas como en una tienda grande: fotos, detalle y la caja de
          compra. Las piezas se colocan por fila y columna en vez de dejarlas
          fluir, porque el orden bueno en el teléfono no es el mismo que en
          pantalla ancha: abajo se apila nombre → foto → precio → detalle, para
          saber qué se está viendo antes de ver la foto, y decidir antes de leer
          el texto largo. */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pt-6 pb-12 sm:pb-16">
        <div className="grid gap-x-8 gap-y-6 lg:gap-y-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)_300px] lg:grid-rows-[auto_1fr] lg:items-start">
          <header className="order-1 lg:col-start-2 lg:row-start-1">
            <h1 className="font-display font-700 text-3xl sm:text-4xl text-ink">
              {title}
            </h1>
            <p className="mt-2 text-base text-ink-soft">{product.tagline}</p>

            {contents.length > 0 && (
              <p className="mt-2 text-base text-ink">
                Incluye {contents.map((c) => c.label).join(" + ")}
              </p>
            )}

            {/* Lo que antes era un renglón gris con puntos en el medio. Son
                las tres razones por las que alguien compra esto y ahora se
                cuentan como tres, no como una frase larga.

                En el teléfono van en un solo renglón que se corre con el dedo:
                envueltas en dos filas empujaban la foto media pantalla hacia
                abajo, y lo primero que tiene que verse de un producto es el
                producto. */}
            {product.badges.length > 0 && (
              <ul className="mt-4 flex gap-2 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 lg:flex-wrap no-scrollbar">
                {product.badges.map((badge) => (
                  <li
                    key={badge}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-ink"
                  >
                    <Check
                      className="w-3.5 h-3.5 text-ink-soft"
                      aria-hidden="true"
                    />
                    {badge}
                  </li>
                ))}
              </ul>
            )}
          </header>

          {/* Entre el teléfono y el escritorio la página sigue siendo de una
              sola columna, y sin tope la foto cuadrada se comía una pantalla
              de tablet entera. Desde `lg` manda la columna de la cuadrícula. */}
          <div className="order-2 sm:max-w-[520px] lg:max-w-none lg:col-start-1 lg:row-start-1 lg:row-span-2">
            <ProductGallery shots={shots} title={title} />
          </div>

          <aside className="order-3 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-6">
            <ProductPurchase product={product} />
          </aside>

          <div className="order-4 lg:col-start-2 lg:row-start-2">
            <div className="pt-6 border-t border-ink/10">
              <h2 className="font-display font-700 text-2xl text-ink mb-3">
                Acerca de este producto
              </h2>
              <p className="text-base text-ink-soft leading-relaxed">
                {product.description}
              </p>
              <p className="mt-4 text-base text-ink-soft leading-relaxed">
                Todos nuestros productos son sin azúcar y están hechos de forma
                artesanal, en tandas pequeñas, sin atajos.
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-ink/10">
              <h2 className="font-display font-700 text-2xl text-ink mb-3">
                Detalles
              </h2>
              <dl className="text-base">
                {details.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex gap-4 py-1.5"
                  >
                    <dt className="w-32 shrink-0 text-ink-soft">{label}</dt>
                    <dd className="text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      <RelatedProducts currentKey={product.key} />

      {/* El blog ya enlaza al producto; esto cierra el camino de vuelta, para
          que Google recorra ambas secciones en lugar de tratarlas por separado. */}
      {productPosts.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-12 sm:pb-16">
          <h2 className="font-display font-700 text-2xl text-ink mb-5">
            Del blog: mantequilla de {product.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {productPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="border-t border-ink/10 pt-4 flex flex-col gap-2 group"
              >
                <span className="text-sm text-ink-soft">
                  {CATEGORY_LABEL[post.category]} · {post.readTime} de lectura
                </span>
                <h3 className="font-display font-700 text-lg text-ink group-hover:underline">
                  {post.title}
                </h3>
                <p className="text-sm text-ink-soft flex-1">{post.excerpt}</p>
                <time dateTime={post.date} className="text-sm text-ink-soft">
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
